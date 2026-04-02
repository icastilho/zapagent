# WhatsApp Seller Agent Implementation Plan

## Goal

Build a Mastra-based WhatsApp sales agent for Facilitoy that:
- receives inbound WhatsApp messages
- qualifies the lead step by step
- replies in a short sales style
- avoids inventing price, availability, or products
- hands off to a human when needed

## Implementation Scope

### 1. Core Mastra runtime `(COMPLETED)`

- Keep a primary runtime agent named `whatsapp-seller-agent`
- Register it in `src/mastra/index.ts`
- Use Mastra `Memory` for thread continuity by lead and conversation
- Keep the agent focused on response generation, not business-state authority

### 2. Deterministic policy layer `(COMPLETED)`

- Use app code to classify intent and required next action
- Supported intents:
  - `COMO_FUNCIONA`
  - `FESTA`
  - `CASA`
  - `PRECO`
  - `DISPONIBILIDADE`
  - `RESERVA`
  - `DUVIDA`
  - `CATALOGO`
  - `INDECISAO`
- Policy decides:
  - missing slots
  - next action
  - stage transition
  - handoff requirement

### 3. Knowledge and sales constraints `(COMPLETED)`

- Base behavior comes from:
  - `01_INSTRUCOES_GPT_V3.md`
  - `02_ROUTER_DECISAO_V3.md`
  - `03_TEMPLATES_WHATSAPP_V3.md`
  - `04_BASE_CONHECIMENTO.md`
  - `playbook_v3_facilitoy.md`
- Normalize those docs into local structured knowledge used by the runtime
- Enforce:
  - one message = one objective
  - max 2 to 3 short sentences
  - at most one question
  - no invented price
  - no invented availability
  - no invented kit or product names

### 4. WhatsApp integration `(COMPLETED)`

- Expose custom Mastra API routes:
  - `GET /webhooks/whatsapp`
  - `POST /webhooks/whatsapp`
  - `POST /internal/conversations/:conversationId/reply`
- Normalize WhatsApp payloads into internal message format
- Persist messages and conversation state
- Send outbound text through WhatsApp Cloud API when credentials exist
- Fall back to dry-run logging if WhatsApp credentials are missing

### 5. Persistence `(IN PROGRESS)`

- Current MVP persistence:
  - file-backed business state in `.mastra/sales-state.json`
  - LibSQL-backed Mastra runtime storage
  - filesystem-backed editor storage in `.mastra-storage/`
- Future target:
  - proper DB-backed lead/conversation/business-state tables

### 6. Human handoff `(COMPLETED)`

- Handoff mode is `flag + stop`
- Once handed off:
  - conversation is marked handed off
  - sales automation stops
  - user receives only a short transition message
- Future improvement:
  - external inbox integration such as Chatwoot

### 7. Live WhatsApp end-to-end validation `(IN PROGRESS)`

- restart `npm run dev`
- validate end-to-end inbound webhook flow with a real WhatsApp message
- confirm logs show the full path:
  - route entry
  - payload normalization
  - policy decision
  - agent generation
  - outbound send

### 8. Real price verification integration `(PENDING)`

- Replace placeholder `checkPrice` behavior with real business integration
- Return exact verified price only when source data exists
- Keep fallback verification message for unsupported cases

### 9. Real availability verification integration `(PENDING)`

- Replace placeholder `checkAvailability` behavior with real business integration
- Check actual availability by date and relevant option
- Keep fallback verification message when the source is unavailable

### 10. Automated tests `(PENDING)`

- Add focused tests for policy classification
- Add focused tests for slot progression
- Add focused tests for safe reply fallback behavior
- Add focused tests for webhook/runtime integration flow

## Acceptance Criteria

- inbound WhatsApp message reaches the webhook route
- normalized inbound payload is logged
- policy chooses the next action deterministically
- agent response is short and policy-compliant
- outbound message is either sent successfully or logged with a clear failure reason
- Studio no longer errors on missing stored agent metadata
