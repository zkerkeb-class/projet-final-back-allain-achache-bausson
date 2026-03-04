import { spawn } from "child_process";

const isWindows = process.platform === "win32";

const commands = [
  {
    name: "ai",
    command: "npm",
    args: ["run", "ai"],
  },
  {
    name: "api",
    command: "npm",
    args: ["run", "dev"],
  },
];

const children = [];
let shuttingDown = false;

const stopAll = (exitCode = 0) => {
  if (shuttingDown) return;
  shuttingDown = true;

  for (const child of children) {
    if (!child.killed) {
      child.kill("SIGINT");
    }
  }

  setTimeout(() => {
    process.exit(exitCode);
  }, 200);
};

for (const entry of commands) {
  const child = spawn(entry.command, entry.args, {
    cwd: process.cwd(),
    stdio: "inherit",
    env: process.env,
    shell: isWindows,
  });

  child.on("exit", (code, signal) => {
    if (shuttingDown) {
      return;
    }

    const reason = signal ? `signal ${signal}` : `code ${code ?? 0}`;
    console.error(`[${entry.name}] stopped with ${reason}`);
    stopAll(code ?? 0);
  });

  child.on("error", (error) => {
    if (shuttingDown) {
      return;
    }

    console.error(`[${entry.name}] failed to start: ${error.message}`);
    stopAll(1);
  });

  children.push(child);
}

process.on("SIGINT", () => stopAll(0));
process.on("SIGTERM", () => stopAll(0));
