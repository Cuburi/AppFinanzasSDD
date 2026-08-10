import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import test from "node:test";
import { fileURLToPath } from "node:url";

import {
  RESET_POLICIES,
  ResetFailure,
  buildComposeCommand,
  createInvocationContext,
  validateDevInvocation,
  validatePersonalConfirmation,
} from "./reset-local-database.mjs";

const composePath = fileURLToPath(new URL("../docker-compose.yml", import.meta.url));
const devResetPath = fileURLToPath(new URL("./reset-dev-database.mjs", import.meta.url));
const personalResetPath = fileURLToPath(new URL("./guard-personal-reset.mjs", import.meta.url));

const readComposeService = (service) => {
  const lines = readFileSync(composePath, "utf8").split(/\r?\n/);
  const start = lines.indexOf(`  ${service}:`);
  assert.notEqual(start, -1, `Expected ${service} in docker-compose.yml`);
  const end = lines.findIndex((line, index) => index > start && (/^  \S/.test(line) || line === "volumes:"));
  const block = lines.slice(start + 1, end === -1 ? undefined : end).join("\n");
  return {
    containerName: block.match(/container_name: (.+)/)?.[1],
    database: block.match(/POSTGRES_DB: (.+)/)?.[1],
    port: block.match(/([0-9]+):5432/)?.[1],
    volume: block.match(/- ([^:]+):\/var\/lib\/postgresql\/data/)?.[1],
    hasComposeProfiles: /^    profiles:/m.test(block),
  };
};

test("frozen reset policies match the repository Compose topology", () => {
  const dev = readComposeService("postgres-dev");
  const personal = readComposeService("postgres-personal");
  assert.equal(Object.isFrozen(RESET_POLICIES), true);
  assert.equal(RESET_POLICIES.dev.files[0], "docker-compose.yml");
  assert.equal(RESET_POLICIES.dev.applicationProfile, "dev");
  assert.equal(RESET_POLICIES.personal.applicationProfile, "personal");
  assert.deepEqual(RESET_POLICIES.dev.composeProfiles, []);
  assert.deepEqual(RESET_POLICIES.personal.composeProfiles, []);
  assert.equal(dev.hasComposeProfiles, false);
  assert.equal(personal.hasComposeProfiles, false);
  assert.equal(RESET_POLICIES.dev.service, "postgres-dev");
  assert.equal(RESET_POLICIES.personal.service, "postgres-personal");
  assert.equal(RESET_POLICIES.dev.database, dev.database);
  assert.equal(RESET_POLICIES.personal.database, personal.database);
  assert.equal(RESET_POLICIES.dev.port, dev.port);
  assert.equal(RESET_POLICIES.personal.port, personal.port);
  assert.equal(RESET_POLICIES.dev.logicalVolume, dev.volume);
  assert.equal(RESET_POLICIES.personal.logicalVolume, personal.volume);
  assert.throws(() => { RESET_POLICIES.dev.service = "postgres-personal"; }, TypeError);
});

test("invocation context builds explicit Compose argv and removes ambient Compose defaults", () => {
  const context = createInvocationContext({
    policyName: "dev",
    cwd: "C:/repo",
    sourceHashes: { "docker-compose.yml": "compose-hash", ".env": "env-hash" },
    environment: {
      HOME: "must-not-leak",
      DATABASE_URL: "must-not-leak",
    },
  });

  assert.deepEqual(context, {
    cwd: "C:/repo",
    projectName: "repo",
    composeFiles: [{ path: "C:/repo/docker-compose.yml", sha256: "compose-hash" }],
    applicationProfile: "dev",
    composeProfiles: [],
    envFile: { path: "C:/repo/.env", sha256: "env-hash" },
    composeEnv: {},
    service: "postgres-dev",
    database: "appfinanzas_dev",
    port: "5433",
    logicalVolume: "appfinanzas_postgres_dev_data",
    renderedConfig: null,
  });
  assert.deepEqual(buildComposeCommand(context, ["config", "--format", "json"]), [
    "docker",
    [
      "compose",
      "--project-name", "repo",
      "--project-directory", "C:/repo",
      "--file", "C:/repo/docker-compose.yml",
      "--env-file", "C:/repo/.env",
      "config", "--format", "json",
    ],
    context.composeEnv,
  ]);
});

test("invocation context rejects conflicting or unallowlisted Compose environment", () => {
  assert.throws(
    () => createInvocationContext({
      policyName: "dev",
      cwd: "/repo",
      sourceHashes: { "docker-compose.yml": "compose-hash", ".env": "env-hash" },
      environment: { COMPOSE_PROJECT_NAME: "other-project" },
    }),
    (error) => error instanceof ResetFailure && error.code === "PREFLIGHT_REJECTED",
  );
  assert.throws(
    () => createInvocationContext({
      policyName: "dev",
      cwd: "/repo",
      sourceHashes: { "docker-compose.yml": "compose-hash", ".env": "env-hash" },
      environment: { COMPOSE_PARALLEL_LIMIT: "4" },
    }),
    (error) => error instanceof ResetFailure && error.code === "PREFLIGHT_REJECTED",
  );
});

test("invocation context deeply freezes nested policy snapshots", () => {
  const context = createInvocationContext({
    policyName: "dev",
    cwd: "/repo",
    sourceHashes: { "docker-compose.yml": "compose-hash", ".env": "env-hash" },
  });

  assert.equal(Object.isFrozen(context.composeFiles[0]), true);
  assert.equal(Object.isFrozen(context.envFile), true);
  assert.throws(() => { context.composeFiles[0].path = "/attacker/docker-compose.yml"; }, TypeError);
  assert.throws(() => { context.composeFiles[0].sha256 = "attacker-hash"; }, TypeError);
  assert.throws(() => { context.envFile.sha256 = "attacker-hash"; }, TypeError);
});

test("public reset wrappers fail closed until the reset engine is wired", () => {
  const dev = spawnSync(process.execPath, [devResetPath], { encoding: "utf8" });
  const personal = spawnSync(process.execPath, [
    personalResetPath,
    "--confirm", "RESET_APPFINANZAS_PERSONAL",
    "--profile", "appfinanzas_personal",
  ], { encoding: "utf8" });

  for (const result of [dev, personal]) {
    assert.equal(result.status, 1);
    assert.match(result.stderr, /reset engine is not wired.*No database mutation was performed\./i);
  }
});

test("personal reset requires the exact ordered dual confirmation without extra arguments", () => {
  assert.deepEqual(
    validatePersonalConfirmation(["--confirm", "RESET_APPFINANZAS_PERSONAL", "--profile", "appfinanzas_personal"]),
    { profile: "personal" },
  );
  assert.throws(
    () => validatePersonalConfirmation(["--profile", "appfinanzas_personal", "--confirm", "RESET_APPFINANZAS_PERSONAL"]),
    (error) => error instanceof ResetFailure && error.code === "CONFIRMATION_REJECTED",
  );
  assert.throws(
    () => validatePersonalConfirmation(["--confirm", "RESET_APPFINANZAS_PERSONAL", "--profile", "appfinanzas_personal", "--force"]),
    (error) => error instanceof ResetFailure && error.code === "CONFIRMATION_REJECTED",
  );
});

test("dev reset accepts no arguments and rejects accidental override arguments", () => {
  assert.deepEqual(validateDevInvocation([]), { profile: "dev" });
  assert.throws(
    () => validateDevInvocation(["--profile", "personal"]),
    (error) => error instanceof ResetFailure && error.code === "CONFIRMATION_REJECTED",
  );
});

test("reset failures expose stable pre- and post-mutation taxonomy", () => {
  const confirmationFailure = new ResetFailure("CONFIRMATION_REJECTED", "confirmation missing");
  assert.equal(confirmationFailure.name, "ResetFailure");
  assert.equal(confirmationFailure.code, "CONFIRMATION_REJECTED");
  assert.equal(confirmationFailure.phase, "pre-mutation");
  assert.equal(confirmationFailure.message, "confirmation missing");
  const mutationFailure = new ResetFailure("MUTATION_FAILED", "volume removal failed");
  assert.equal(mutationFailure.code, "MUTATION_FAILED");
  assert.equal(mutationFailure.phase, "post-mutation");
  assert.throws(() => new ResetFailure("UNKNOWN", "invalid"), /Unknown reset failure code/);
});
