import path from "node:path";
import { pathToFileURL, fileURLToPath } from "node:url";

const serverRoot = path.resolve(fileURLToPath(import.meta.url), "..", "..");

const defaultPrismaClientPath = path.join(serverRoot, "dist", "lib", "prisma-client.js");

export const verifyPrismaBuild = async ({ prismaClientPath = defaultPrismaClientPath } = {}) => {
  const importUrl = `${pathToFileURL(prismaClientPath).href}?verify=${Date.now()}`;

  try {
    await import(importUrl);
  } catch (error) {
    throw new Error(
      `Built Prisma client import failed. Ensure the generated Prisma client is packaged into server/dist/generated/prisma before production start.\n${error instanceof Error ? error.message : String(error)}`,
      { cause: error },
    );
  }
};

const toFileUrl = (filePath) => {
  if (filePath.startsWith("/")) return `file://${filePath}`;
  return pathToFileURL(filePath).href;
};

export const isDirectRun = (moduleUrl, argvPath = process.argv[1]) =>
  Boolean(argvPath) && moduleUrl === toFileUrl(argvPath);

if (isDirectRun(import.meta.url)) {
  verifyPrismaBuild().catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  });
}
