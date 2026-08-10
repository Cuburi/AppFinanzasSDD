import { ResetFailure, validateDevInvocation } from "./reset-local-database.mjs";

try {
  validateDevInvocation(process.argv.slice(2));
  throw new ResetFailure(
    "PREFLIGHT_REJECTED",
    "Reset engine is not wired in this contracts-only slice. No database mutation was performed.",
  );
} catch (error) {
  const message = error instanceof ResetFailure ? `${error.code}: ${error.message}` : String(error);
  console.error(`Dev database reset blocked. ${message}`);
  process.exitCode = 1;
}
