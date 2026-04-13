import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";

const repoRoot = path.resolve(new URL("..", import.meta.url).pathname);
const hooksPath = path.join(repoRoot, ".githooks");

if (!existsSync(path.join(repoRoot, ".git"))) {
  console.log("Skipping git hook installation: .git directory not found.");
  process.exit(0);
}

if (!existsSync(hooksPath)) {
  console.log("Skipping git hook installation: .githooks directory not found.");
  process.exit(0);
}

execFileSync("git", ["config", "core.hooksPath", ".githooks"], {
  cwd: repoRoot,
  stdio: "inherit",
});

console.log("Configured git hooks at .githooks");
