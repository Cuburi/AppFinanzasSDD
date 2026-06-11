import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

// @ts-expect-error The build tooling scripts are native ESM JavaScript files exercised through Node.
import { copyPrismaGenerated, isDirectRun as isCopyScriptDirectRun } from "../scripts/copy-prisma-generated.mjs";
// @ts-expect-error The build tooling scripts are native ESM JavaScript files exercised through Node.
import { verifyPrismaBuild, isDirectRun as isVerifyScriptDirectRun } from "../scripts/verify-prisma-build.mjs";

const serverRoot = path.resolve(fileURLToPath(import.meta.url), "..", "..");

const createTempWorkspace = async () => mkdtemp(path.join(tmpdir(), "appfinanzas-prisma-build-"));

test("copyPrismaGenerated copies the full generated Prisma client directory", async () => {
  const workspace = await createTempWorkspace();
  const source = path.join(workspace, "src", "generated", "prisma");
  const target = path.join(workspace, "dist", "generated", "prisma");

  await mkdir(path.join(source, "runtime"), { recursive: true });
  await writeFile(path.join(source, "index.js"), "export const client = 'ok';\n");
  await writeFile(path.join(source, "runtime", "query-engine.wasm"), "runtime asset\n");

  try {
    await copyPrismaGenerated({ sourceDir: source, targetDir: target });

    assert.equal(await readFile(path.join(target, "index.js"), "utf8"), "export const client = 'ok';\n");
    assert.equal(await readFile(path.join(target, "runtime", "query-engine.wasm"), "utf8"), "runtime asset\n");
  } finally {
    await rm(workspace, { recursive: true, force: true });
  }
});

test("copyPrismaGenerated fails clearly when the generated Prisma client is missing", async () => {
  const workspace = await createTempWorkspace();

  try {
    await assert.rejects(
      copyPrismaGenerated({
        sourceDir: path.join(workspace, "src", "generated", "prisma"),
        targetDir: path.join(workspace, "dist", "generated", "prisma"),
      }),
      /Generated Prisma client is missing.*Run Prisma generation first/s,
    );
  } finally {
    await rm(workspace, { recursive: true, force: true });
  }
});

test("verifyPrismaBuild imports the built Prisma wrapper when packaged assets resolve", async () => {
  const workspace = await createTempWorkspace();
  const distLib = path.join(workspace, "dist", "lib");
  const distGenerated = path.join(workspace, "dist", "generated", "prisma");

  await mkdir(distLib, { recursive: true });
  await mkdir(distGenerated, { recursive: true });
  await writeFile(path.join(distGenerated, "index.js"), "export const PrismaClient = class {};\n");
  await writeFile(
    path.join(distLib, "prisma-client.js"),
    "export { PrismaClient } from '../generated/prisma/index.js';\n",
  );

  try {
    await assert.doesNotReject(
      verifyPrismaBuild({ prismaClientPath: path.join(distLib, "prisma-client.js") }),
    );
  } finally {
    await rm(workspace, { recursive: true, force: true });
  }
});

test("verifyPrismaBuild fails before production start when packaged assets are incomplete", async () => {
  const workspace = await createTempWorkspace();
  const distLib = path.join(workspace, "dist", "lib");

  await mkdir(distLib, { recursive: true });
  await writeFile(
    path.join(distLib, "prisma-client.js"),
    "export { PrismaClient } from '../generated/prisma/index.js';\n",
  );

  try {
    await assert.rejects(
      verifyPrismaBuild({ prismaClientPath: path.join(distLib, "prisma-client.js") }),
      /Built Prisma client import failed.*generated Prisma client is packaged/s,
    );
  } finally {
    await rm(workspace, { recursive: true, force: true });
  }
});

test("server build script compiles, copies generated Prisma assets, then verifies runtime import", async () => {
  const packageJson = JSON.parse(await readFile(path.join(serverRoot, "package.json"), "utf8")) as {
    scripts: { build: string; start: string };
  };

  assert.equal(
    packageJson.scripts.build,
    "tsc -p tsconfig.json && node scripts/copy-prisma-generated.mjs && node scripts/verify-prisma-build.mjs",
  );
  assert.equal(packageJson.scripts.start, "node dist/index.js");
});

test("CI exercises the server production build after Prisma generation", async () => {
  const workflow = await readFile(path.join(serverRoot, "..", ".github", "workflows", "ci.yml"), "utf8");

  assert.match(workflow, /Generate Prisma client[\s\S]*pnpm prisma:dev:generate/);
  assert.match(workflow, /Build server[\s\S]*pnpm --dir server build/);
});

test("build tooling scripts detect direct CLI execution from Windows and POSIX argv paths", () => {
  const copyScriptUrl = "file:///C:/repo/server/scripts/copy-prisma-generated.mjs";
  const verifyScriptUrl = "file:///home/app/server/scripts/verify-prisma-build.mjs";

  assert.equal(isCopyScriptDirectRun(copyScriptUrl, "C:\\repo\\server\\scripts\\copy-prisma-generated.mjs"), true);
  assert.equal(isVerifyScriptDirectRun(verifyScriptUrl, "/home/app/server/scripts/verify-prisma-build.mjs"), true);
  assert.equal(isCopyScriptDirectRun(copyScriptUrl, "C:\\repo\\server\\scripts\\other.mjs"), false);
});
