# Contributing

All contributors, human or agent, follow the same repository contract. A change is not ready for review unless the branch, commits, and pull request all match the rules below.

## Required contribution pattern

### 1. Branches

Use:

```text
type/short-kebab-summary
```

Examples:

- `feat/whatsapp-reply-fallback`
- `fix/webhook-signature-parser`
- `docs/contribution-guardrails`

Allowed `type` prefixes:

- `feat`
- `fix`
- `docs`
- `refactor`
- `test`
- `chore`
- `ci`
- `build`
- `perf`
- `revert`

### 2. Commit messages

Use Conventional Commits with an optional scope:

```text
type(scope): short imperative summary
```

Rules:

- Keep the first line under 72 characters when possible.
- Use lowercase `type` and `scope`.
- Use imperative summaries such as `add`, `fix`, `remove`, `guard`, `document`.
- Do not end the summary with a period.
- Add a body only when the why or tradeoff is not obvious, and separate it from the header with a blank line.

Valid examples:

- `feat(whatsapp-agent): add deterministic handoff fallback`
- `fix(webhook): guard empty inbound messages`
- `docs(contributing): define PR and commit rules`

Invalid examples:

- `Update stuff`
- `fix: Fixed webhook bug.`
- `feat(Agent): Added new feature`

### 3. Pull requests

PR titles must match the same pattern as commit messages:

```text
type(scope): short imperative summary
```

PR bodies must use the repository template and complete all sections:

- `## Summary`
- `## Problem`
- `## Solution`
- `## Validation`
- `## Risks`

Reviewers should reject PRs that:

- Skip the template or leave placeholder text behind
- Bundle unrelated changes into one PR
- Omit validation steps
- Hide risk, rollout impact, or follow-up work

## Enforcement

The repository enforces these rules in two places:

- Local Git hooks installed by `npm install` through the `prepare` script
- GitHub Actions on every pull request

Current checks:

- `commit-msg` rejects invalid commit messages
- `pre-push` rejects invalid branch names and runs `npm run build`
- CI rejects PRs with invalid branch names, invalid titles, incomplete bodies, invalid commit messages, or build failures

These checks are intended to make agent and human contributions mechanically consistent before review starts.
