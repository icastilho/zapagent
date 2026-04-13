import { readFileSync } from "node:fs";

const allowedTypes = [
  "feat",
  "fix",
  "docs",
  "refactor",
  "test",
  "chore",
  "ci",
  "build",
  "perf",
  "revert",
];

const headerPattern = new RegExp(
  `^(${allowedTypes.join("|")})(\\([a-z0-9][a-z0-9/-]*\\))?(!)?: [a-z0-9][^\\n]{0,70}[a-z0-9)]$`,
);

function fail(message) {
  console.error(`Commit message validation failed: ${message}`);
  console.error(
    "Expected format: type(scope): short imperative summary",
  );
  console.error(
    "Example: feat(whatsapp-agent): add handoff fallback for unsafe replies",
  );
  process.exit(1);
}

function loadMessage() {
  const filePath = process.argv[2];
  if (filePath) {
    return readFileSync(filePath, "utf8");
  }

  if (process.env.COMMIT_MESSAGE) {
    return process.env.COMMIT_MESSAGE;
  }

  fail("No commit message source provided.");
}

const rawMessage = loadMessage().replace(/\r\n/g, "\n").trimEnd();
const [header, ...rest] = rawMessage.split("\n");

if (!header) {
  fail("Commit message cannot be empty.");
}

if (header.startsWith("Merge ")) {
  process.exit(0);
}

if (!headerPattern.test(header)) {
  fail(
    `Invalid header "${header}". Allowed types: ${allowedTypes.join(", ")}.`,
  );
}

if (rest.length > 0 && rest[0] !== "") {
  fail("Commit body must start after a blank line.");
}

const placeholderLines = rest.filter((line) =>
  /^# Please enter|^# On branch|^# Changes to be committed/.test(line),
);

if (placeholderLines.length > 0) {
  fail("Commit message still contains template comments.");
}
