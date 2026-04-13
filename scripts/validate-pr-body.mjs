const requiredSections = [
  "## Summary",
  "## Problem",
  "## Solution",
  "## Validation",
  "## Risks",
];

const placeholderSnippets = [
  "<fill",
  "n/a",
  "todo",
  "tbd",
  "same as above",
];

function fail(message) {
  console.error(`PR validation failed: ${message}`);
  process.exit(1);
}

function getInput(name) {
  const value = process.env[name];
  return value ? value.replace(/\r\n/g, "\n").trim() : "";
}

function extractSectionContent(body, heading) {
  const escapedHeading = heading.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const pattern = new RegExp(
    `${escapedHeading}\\n([\\s\\S]*?)(?=\\n## |$)`,
    "i",
  );
  const match = body.match(pattern);
  return match ? match[1].trim() : "";
}

const title = getInput("PR_TITLE");
const body = getInput("PR_BODY");

if (!title) {
  fail("PR_TITLE is required.");
}

if (!body) {
  fail("PR_BODY is required.");
}

if (!/^(feat|fix|docs|refactor|test|chore|ci|build|perf|revert)(\([a-z0-9][a-z0-9/-]*\))?(!)?: [a-z0-9][^\n]{0,70}[a-z0-9)]$/.test(title)) {
  fail(
    "PR title must use the same convention as commits, for example: fix(runtime): guard empty webhook payload",
  );
}

for (const section of requiredSections) {
  if (!body.includes(section)) {
    fail(`Missing required section: ${section}`);
  }

  const content = extractSectionContent(body, section);
  if (!content) {
    fail(`Section ${section} cannot be empty.`);
  }

  const normalized = content.toLowerCase();
  if (placeholderSnippets.some((snippet) => normalized.includes(snippet))) {
    fail(`Section ${section} still contains placeholder text.`);
  }
}
