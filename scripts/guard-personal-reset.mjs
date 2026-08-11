import { ResetFailure, executeLocalReset, validatePersonalConfirmation } from "./reset-local-database.mjs";

try {
  validatePersonalConfirmation(process.argv.slice(2));
  executeLocalReset("personal");
  console.log("Personal database reset completed.");
} catch (error) {
  const message = error instanceof ResetFailure ? `${error.code}: ${error.message}` : String(error);
  console.error(`Personal database reset blocked. ${message}`);
  process.exitCode = 1;
}
