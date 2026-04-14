# WhatsApp Seller Agent

Mastra-based WhatsApp sales agent for Facilitoy. The app receives inbound WhatsApp Cloud API webhooks, applies a deterministic qualification policy, generates short commercial replies, and hands off to a human when needed.

## What It Does

- Exposes WhatsApp webhook routes through the Mastra server
- Normalizes inbound Meta payloads into an internal conversation format
- Persists leads, conversations, messages, and handoff state in a file-backed MVP store
- Uses a Mastra agent to generate concise WhatsApp replies
- Enforces sales constraints such as no invented price, availability, or product claims
- Falls back to deterministic safe replies when model output violates policy

## Stack

- Node.js `>=22.13.0`
- TypeScript
- Mastra
- OpenAI via Mastra model routing
- LibSQL + DuckDB + filesystem-backed Mastra storage

## Project Structure

- `src/mastra/index.ts`: Mastra entrypoint, storage, observability, and route registration
- `src/mastra/agents/whatsapp-seller-agent.ts`: primary sales agent
- `src/mastra/domain/whatsapp-sales/`: policy, runtime, tools, storage, response validation, and channel adapter
- `src/mastra/server/whatsapp-routes.ts`: public webhook and internal replay endpoints
- `src/mastra/scorers/whatsapp-seller-scorer.ts`: reply quality scorers
- `docs/`: sales playbooks, implementation notes, and supporting business context

## Environment

Copy `.env.example` to `.env` and set:

```bash
OPENAI_API_KEY=
WHATSAPP_AGENT_MODEL=openai/gpt-5-mini
WHATSAPP_WEBHOOK_VERIFY_TOKEN=
WHATSAPP_PHONE_NUMBER_ID=
WHATSAPP_ACCESS_TOKEN=
INTERNAL_API_TOKEN=
```

Notes:

- `OPENAI_API_KEY` is required for agent generation.
- If `WHATSAPP_PHONE_NUMBER_ID` or `WHATSAPP_ACCESS_TOKEN` is missing, outbound messages fall back to dry-run logging instead of being sent.
- `INTERNAL_API_TOKEN` protects the internal replay endpoint.

## Run Locally

Install dependencies, then start Mastra Studio and the local API server:

```bash
npm install
npm run dev
```

Mastra Studio runs at `http://localhost:4111`.

For a production build:

```bash
npm run build
npm run start
```

## API Endpoints

The app registers these routes:

- `GET /api/webhooks/whatsapp`: Meta webhook verification
- `POST /api/webhooks/whatsapp`: inbound WhatsApp message receiver
- `POST /api/internal/conversations/:conversationId/reply`: protected internal replay endpoint

Example internal replay request:

```bash
curl -X POST http://localhost:4111/api/internal/conversations/<conversationId>/reply \
  -H "Authorization: Bearer $INTERNAL_API_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"text":"Quero saber se tem para 20/05"}'
```

## Runtime Flow

1. Meta sends a webhook event to `POST /api/webhooks/whatsapp`.
2. The channel adapter validates and normalizes the inbound text message.
3. The runtime loads or creates the lead and conversation state.
4. The policy layer classifies intent and decides the next action.
5. The Mastra agent generates a short commercial response with memory.
6. The reply is validated against business constraints.
7. The response is persisted and either sent to WhatsApp Cloud API or logged in dry-run mode.

## Business Rules Enforced

- One message should pursue one objective
- Replies should stay short and natural for WhatsApp
- The agent should ask at most one question per response
- Price, availability, and product names must not be invented
- Sensitive or human-support requests trigger handoff and stop automated selling

## Current Limitations

- Price and availability verification tools are placeholders that return verification-only replies
- Business state persistence is file-backed MVP storage
- No external CRM or inbox integration yet
- No formal automated test suite yet

## Documentation

- `docs/CONTEXT.md`: current implementation snapshot
- `docs/ANALISE_AGENTES_CODEX.md`: recommendation on which additional agents and workflows are worth adding
- `docs/IMPLEMENTATION_PLAN.md`: delivery status and next steps
- `docs/PLAYBOOK_VENDAS_FACILITOY_V3.md`: sales playbook
- `docs/v3/` and `docs/v4/`: prompt, router, and knowledge source material
- `CONTRIBUTING.md`: required branch, commit, and pull request conventions
