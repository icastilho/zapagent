# Current Context

## Project

- Project: `whatsapp-agente-app`
- Stack: Mastra + TypeScript
- Purpose: WhatsApp sales agent for Facilitoy
- Runtime model default: `openai/gpt-5-mini`

## What Has Been Implemented

### Active Mastra app

- The active runtime is registered in `src/mastra/index.ts`
- The starter weather app is no longer the active app path
- The app includes:
  - `whatsappSellerAgent`
  - WhatsApp webhook routes
  - file-backed sales state
  - structured logging
  - filesystem editor storage for stored-agent Studio routes

### Main files

- Agent:
  - `src/mastra/agents/whatsapp-seller-agent.ts`
- Runtime:
  - `src/mastra/domain/whatsapp-sales/runtime.ts`
- Policy:
  - `src/mastra/domain/whatsapp-sales/policy.ts`
- Knowledge:
  - `src/mastra/domain/whatsapp-sales/knowledge.ts`
- Tools:
  - `src/mastra/domain/whatsapp-sales/tools.ts`
- Channel adapter:
  - `src/mastra/domain/whatsapp-sales/channel-adapter.ts`
- Logging:
  - `src/mastra/domain/whatsapp-sales/logging.ts`
- Routes:
  - `src/mastra/server/whatsapp-routes.ts`
- Scorers:
  - `src/mastra/scorers/whatsapp-seller-scorer.ts`
- Stored-agent editor snapshot:
  - `.mastra-storage/agents.json`

## Important Behavior

### Policy

- Intent and next-step selection happen in app code, not only in prompt text
- Current policy supports:
  - `casa`
  - `festa`
  - price requests
  - availability requests
  - reservation requests
  - indecision
  - handoff triggers

### Sales constraints

- reply should be short
- reply should not ask multiple questions
- reply should not invent price, availability, or product names
- if validation fails, runtime falls back to a deterministic safe reply

### Handoff

- handoff is persisted
- once handed off, runtime stops automated selling

## Logging Added

Useful log events now include:

- `whatsapp.route.verify.request`
- `whatsapp.route.inbound.request`
- `whatsapp.webhook.normalized`
- `whatsapp.webhook.ignored`
- `whatsapp.runtime.inbound.received`
- `whatsapp.runtime.conversation.loaded`
- `whatsapp.runtime.policy.decided`
- `whatsapp.runtime.agent.generate.start`
- `whatsapp.runtime.agent.generate.finish`
- `whatsapp.runtime.agent.generate.error`
- `whatsapp.runtime.reply.fallback`
- `whatsapp.runtime.handoff`
- `whatsapp.runtime.completed`
- `whatsapp.runtime.failed`
- `whatsapp.outbound.sent`
- `whatsapp.outbound.failed`
- `whatsapp.outbound.dry_run`

## Issues Already Solved

### 1. Disk full / ENOSPC

- Mastra failed to write provider registry temp files
- Fixed by clearing npm cache

### 2. Empty Mastra error logs

- The WhatsApp runtime originally had weak logging
- Added explicit structured logs and error boundaries

### 3. Stored-agent Studio errors

- Studio was calling `/stored/agents/...`
- App had runtime agent registration but no stored-agent backing
- Fixed by wiring filesystem editor storage and adding `.mastra-storage/agents.json`

## Current Known Limitations

- price tool is still placeholder-only
- availability tool is still placeholder-only
- business persistence is still file-backed MVP storage
- no Chatwoot or CRM integration yet
- no formal automated test suite added yet

## Environment Needed

Expected env vars:

- `OPENAI_API_KEY`
- `WHATSAPP_AGENT_MODEL`
- `WHATSAPP_WEBHOOK_VERIFY_TOKEN`
- `WHATSAPP_PHONE_NUMBER_ID`
- `WHATSAPP_ACCESS_TOKEN`

See `.env.example`.

## Best Next Step

Restart `npm run dev`, send a real WhatsApp message, and inspect the structured logs for the exact path through:
- inbound webhook
- normalization
- policy
- agent generation
- outbound send

If the next session resumes from here, the first debugging task should be:
- verify whether the webhook request is hitting the app
- if yes, identify whether failure is in normalization, policy, OpenAI generation, or WhatsApp outbound send
