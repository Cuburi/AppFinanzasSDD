import { spawn } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const packageManagerCommand = process.platform === "win32" ? (process.env.ComSpec ?? "cmd.exe") : "pnpm";

const packageManagerArgs = (args) => {
  if (process.platform !== "win32") return args;

  return ["/d", "/s", "/c", ["pnpm", ...args].join(" ")];
};

const processes = [
  { name: "server", cwd: resolve(rootDir, "server"), args: ["run", "dev"] },
  { name: "client", cwd: resolve(rootDir, "client"), args: ["run", "dev"] },
];

const children = processes.map(({ name, cwd, args }) => {
  const child = spawn(packageManagerCommand, packageManagerArgs(args), {
    cwd,
    stdio: "inherit",
  });

  child.on("error", (error) => {
    console.error(`[${name}] no pudo iniciar: ${error.message}`);
    shutdown(1);
  });

  child.on("exit", (code, signal) => {
    if (signal) {
      console.log(`[${name}] terminó con señal ${signal}`);
      return;
    }

    if (code !== 0) {
      console.error(`[${name}] terminó con código ${code}`);
      shutdown(code ?? 1);
    }
  });

  return child;
});

function shutdown(exitCode = 0) {
  for (const child of children) {
    if (!child.killed) {
      child.kill();
    }
  }

  process.exit(exitCode);
}

process.on("SIGINT", () => shutdown(0));
process.on("SIGTERM", () => shutdown(0));
