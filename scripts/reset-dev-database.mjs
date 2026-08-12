import { ResetFailure, executeLocalReset, validateDevInvocation } from "./reset-local-database.mjs";

try {
  validateDevInvocation(process.argv.slice(2));
  await executeLocalReset("dev");
  console.log("Dev database reset completed.");
} catch (error) {
  const message = error instanceof ResetFailure ? `${error.code}: ${error.message}` : String(error);
  console.error(`Dev database reset blocked. ${message}`);
  process.exitCode = 1;
}
