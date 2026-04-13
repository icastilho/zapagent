import { execFileSync } from "node:child_process";

const branchName =
  process.env.BRANCH_NAME?.trim() ||
  execFileSync("git", ["rev-parse", "--abbrev-ref", "HEAD"], {
    encoding: "utf8",
  }).trim();

const branchPattern =
  /^(feat|fix|docs|refactor|test|chore|ci|build|perf|revert)\/[a-z0-9]+(?:-[a-z0-9]+)*$/;

if (branchName === "HEAD") {
  console.error("Branch validation failed: detached HEAD is not allowed.");
  process.exit(1);
}

if (!branchPattern.test(branchName)) {
  console.error(
    `Branch validation failed: "${branchName}" does not match type/short-kebab-summary.`,
  );
  console.error("Example: feat/whatsapp-reply-fallback");
  process.exit(1);
}
