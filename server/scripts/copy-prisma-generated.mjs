import { cp, rm, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const serverRoot = path.resolve(fileURLToPath(import.meta.url), "..", "..");

const defaultSourceDir = path.join(serverRoot, "src", "generated", "prisma");
const defaultTargetDir = path.join(serverRoot, "dist", "generated", "prisma");

const assertDirectoryExists = async (sourceDir) => {
  try {
    const sourceStats = await stat(sourceDir);
    if (sourceStats.isDirectory()) return;
  } catch (error) {
    if (error && error.code !== "ENOENT") throw error;
  }

  throw new Error(
    `Generated Prisma client is missing at ${sourceDir}. Run Prisma generation first before building the server.`,
  );
};

export const copyPrismaGenerated = async ({
  sourceDir = defaultSourceDir,
  targetDir = defaultTargetDir,
} = {}) => {
  await assertDirectoryExists(sourceDir);
  await rm(targetDir, { recursive: true, force: true });
  await cp(sourceDir, targetDir, { recursive: true });
};

const toFileUrl = (filePath) => {
  if (filePath.startsWith("/")) return `file://${filePath}`;
  return pathToFileURL(filePath).href;
};

export const isDirectRun = (moduleUrl, argvPath = process.argv[1]) =>
  Boolean(argvPath) && moduleUrl === toFileUrl(argvPath);

if (isDirectRun(import.meta.url)) {
  copyPrismaGenerated().catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  });
}
