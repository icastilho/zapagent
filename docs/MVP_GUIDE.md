
# MVP – Agente de Vendas para WhatsApp (Arquitetura Open Source)

## Objetivo

Construir um **MVP de agente de vendas automatizado para WhatsApp** capaz de:

- Atender leads vindos de campanhas de tráfego pago
- Qualificar leads automaticamente
- Conduzir conversas comerciais
- Transferir para um humano quando necessário
- Registrar dados no sistema
- Permitir evolução futura para **produto SaaS vendável**

A arquitetura prioriza:

- **mínima infraestrutura**
- **open source**
- **baixo custo inicial**
- **capacidade de escalar depois**

---

# Arquitetura Final Recomendada (sem n8n)

Stack principal:

- **WhatsApp Cloud API**
- **Backend próprio**
- **LangGraph (motor do agente)**
- **Postgres (estado da conversa)**
- **Chatwoot (inbox e handoff humano)**

Infra mínima inicial:

- 1 VPS
- Docker Compose
- Postgres
- Backend service
- Chatwoot

---

# Visão Geral da Arquitetura

```
WhatsApp Cloud API
        │
        ▼
Webhook Receiver (Backend)
        │
        ▼
Conversation Service
        │
        ▼
LangGraph Agent Engine
        │
        ├── Policy Engine
        ├── Tools (CRM, agenda etc)
        ├── Lead Qualification
        │
        ▼
Message Sender
        │
        ▼
WhatsApp
```

Humanos entram via:

```
LangGraph → Handoff → Chatwoot → Operador humano
```

---

# Componentes do Sistema

## 1. Channel Adapter (WhatsApp)

Responsabilidades:

- Receber webhooks do WhatsApp
- Normalizar mensagens
- Enviar respostas
- Gerenciar templates
- Status de entrega/leitura
- Controle da janela de 24h

Funções principais:

```
receive_message()
send_message()
send_template()
handle_delivery_status()
normalize_event()
```

---

# 2. Conversation State

**Postgres como source of truth.**

## Tabelas principais

### leads

```
id
phone
name
campaign_source
created_at
updated_at
```

### conversations

```
id
lead_id
status
current_stage
last_message_at
assigned_human
```

### messages

```
id
conversation_id
role (user | agent | human)
content
timestamp
metadata
```

### conversation_state

```
conversation_id
intent
qualification_status
lead_score
summary
next_action
confidence
updated_at
```

### handoffs

```
conversation_id
reason
human_agent_id
created_at
```

### followups

```
conversation_id
scheduled_at
type
status
```

### campaign_attribution

```
lead_id
campaign
ad_group
creative
utm_source
utm_campaign
utm_medium
```

---

# 3. Agent Runtime (LangGraph)

LangGraph será o **orquestrador da conversa**.

Ele controla:

- estado da conversa
- decisões
- uso de tools
- transições do funil

O agente não deve improvisar vendas livremente.  
Ele segue um **fluxo guiado por política**.

---

# Grafo inicial do agente

Fluxo mínimo:

```
ingest_message
      │
      ▼
load_conversation_state
      │
      ▼
classify_intent
      │
      ▼
qualify_lead
      │
      ▼
decide_next_step
      │
      ├── respond
      ├── ask_question
      ├── schedule_followup
      └── handoff_human
      ▼
persist_state
```

---

# 4. Policy Engine

Regras fora do prompt.

Exemplos:

- quando perguntar orçamento
- quando pedir nome
- quando parar insistência
- quando escalar para humano
- quando agendar follow-up
- quais promessas comerciais podem ser feitas

Isso evita que o LLM invente informações.

---

# 5. Lead Qualification

Exemplo de atributos coletados:

```
name
company
budget
timeline
pain_point
interest_level
lead_score
```

Pipeline exemplo:

```
NEW_LEAD
CONTACTED
QUALIFYING
QUALIFIED
SCHEDULED
HANDED_TO_SALES
```

---

# 6. Human Handoff (Chatwoot)

Chatwoot fornece:

- Inbox operacional
- Histórico da conversa
- Transferência entre agentes
- Tags
- Notas internas

Fluxo:

```
Agent detecta baixa confiança
        │
        ▼
gera resumo da conversa
        │
        ▼
envia para Chatwoot
        │
        ▼
operador assume conversa
```

---

# 7. Jobs e Timers

Inicialmente sem fila externa.

Implementação simples:

Tabela:

```
scheduled_jobs
```

Exemplos de jobs:

- follow-up automático
- reengajamento
- timeout de conversa
- sincronização CRM

Executados por:

```
background worker
cron job
```

Quando escalar:

- Redis
- fila de jobs

---

# Estrutura do Backend

Exemplo de organização:

```
backend/
 ├── api/
 │    ├── whatsapp_webhook
 │    └── admin
 │
 ├── agents/
 │    └── sales_agent_graph
 │
 ├── services/
 │    ├── conversation_service
 │    ├── lead_service
 │    └── handoff_service
 │
 ├── integrations/
 │    ├── whatsapp
 │    ├── chatwoot
 │    ├── crm
 │    └── calendar
 │
 ├── jobs/
 │    ├── followup_worker
 │    └── reengagement_worker
 │
 └── db/
      └── models
```

---

# Observabilidade

Registrar:

- log de mensagens
- versão do prompt
- transições do grafo
- motivo do handoff
- custo de LLM por conversa
- taxa de qualificação
- taxa de agendamento

Sem observabilidade é impossível melhorar o agente.

---

# Estratégia de Custos Iniciais

Infra mínima:

```
1 VPS
Docker Compose
Postgres
Chatwoot
Backend
```

Evitar inicialmente:

- Kubernetes
- microserviços
- filas complexas
- RAG pesado

---

# Evolução do Produto

Fase 1 — MVP

- WhatsApp
- agente qualificador
- handoff humano
- armazenamento de leads

Fase 2 — Automação avançada

- follow-up automático
- reativação de leads
- score inteligente

Fase 3 — Produto SaaS

- multi-tenant
- dashboards por cliente
- billing
- analytics de conversão

---

# Conclusão

Arquitetura final recomendada:

**WhatsApp Cloud API + Backend próprio + LangGraph + Postgres + Chatwoot**

Sem n8n.

Isso oferece:

- mínima infraestrutura
- controle total do core
- facilidade de evolução
- base adequada para escalar e vender como produto.
