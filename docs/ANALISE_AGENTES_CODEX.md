# Analise de agentes para este projeto

## Estado atual

Hoje o projeto tem uma separacao correta para o MVP:

- um agente principal de geracao (`whatsappSellerAgent`)
- uma camada deterministica de politica
- ferramentas placeholder para preco, disponibilidade e handoff
- um runtime que controla persistencia, memoria e envio para WhatsApp

Essa base indica que o proximo passo nao e criar varios agentes genericos. O principal gargalo atual nao e "falta de inteligencia", e sim falta de integracoes reais e de uma orquestracao mais clara entre decisao deterministica, verificacao e handoff.

## Principio de arquitetura

Para este produto:

- use `Agent` apenas quando a tarefa exigir resposta aberta, adaptacao de linguagem ou sintese
- use `Workflow` quando a tarefa for sequencial, auditavel e previsivel
- mantenha regras de negocio, compliance, roteamento de estagio e handoff em codigo deterministico

Em outras palavras: nao vale decompor o funil comercial em muitos agentes pequenos se eles so repetirem regras que ja estao melhor representadas em `policy.ts`.

## Agentes recomendados

### 1. `whatsapp-seller-agent` atual

Status: manter e evoluir

Papel:

- gerar a resposta curta final para o cliente
- adaptar o tom comercial ao contexto da conversa
- usar ferramentas de negocio aprovadas

Motivo:

- essa e a parte mais aberta do fluxo
- o agente ja esta bem posicionado como "surface layer" de linguagem

Mudancas recomendadas:

- continuar sem autoridade para mudar estado de negocio sozinho
- passar a responder com base em dados verificados por ferramentas reais

### 2. Novo `lead-summary-agent`

Status: recomendado

Papel:

- resumir uma conversa longa para uso humano ou CRM
- produzir um resumo curto, objetivo e padronizado
- destacar contexto, necessidade, objecao, proximo passo e risco

Motivo:

- o projeto ja persiste handoff e resumo simples
- quando houver integracao com inbox/CRM, um resumo ruim aumenta custo operacional
- resumo e classificacao textual sao tarefas adequadas para agente

Escopo ideal:

- entrada: historico da conversa + estado atual
- saida estruturada: `customerProfile`, `intent`, `needs`, `risks`, `nextBestAction`, `summary`

### 3. Novo `catalog-recommendation-agent`

Status: recomendado depois de integrar catalogo real

Papel:

- transformar contexto qualificado em recomendacao curta de produto ou categoria
- justificar a recomendacao sem inventar preco, estoque ou nome de item

Motivo:

- hoje o sistema consegue qualificar, mas a recomendacao ainda depende de conhecimento estatico
- quando existir catalogo estruturado, esse agente pode fazer a sintese final entre regras e contexto

Dependencias:

- catalogo confiavel
- atributos estruturados por produto
- ferramenta de busca/filtragem real

Restricao:

- nao deve consultar o usuario varias vezes nem substituir a politica de qualificacao

### 4. Novo `handoff-note-agent`

Status: opcional, mas util

Papel:

- gerar a nota interna de transicao para humano
- converter conversa em briefing operacional curto

Motivo:

- o usuario final recebe uma mensagem curta de handoff, mas o time humano precisa de contexto util
- esse problema e diferente do resumo geral; aqui o objetivo e "handoff operacional"

Saida esperada:

- motivo do handoff
- pedidos do cliente
- dados ja coletados
- itens pendentes
- recomendacao para o proximo atendente

## O que nao deveria virar agente agora

### Verificacao de preco

Nao criar agente.

Preco precisa vir de fonte oficial. Isso deve ser:

- ferramenta
- integracao com ERP/planilha/API
- ou workflow de verificacao com regras claras

Um agente pode formatar a resposta final, mas nao decidir ou inferir preco.

### Verificacao de disponibilidade

Nao criar agente.

Disponibilidade tambem e um problema transacional e auditavel. O formato correto e:

- ferramenta de consulta
- workflow de verificacao por data/item/regiao

### Roteador de estagio/intencao

Nao criar agente por enquanto.

O arquivo `policy.ts` ja faz esse papel com previsibilidade e baixo risco. Trocar isso por um agente agora pioraria auditabilidade e dificultaria testes.

### Atendimento humano completo

Nao criar um "human support agent" neste momento.

Se o objetivo e parar a automacao quando houver sensibilidade, reclamacao ou pedido explicito de humano, o comportamento atual e mais seguro do que tentar automatizar esse trecho.

## Melhor decomposicao para os proximos ciclos

### Fase 1

- manter apenas o `whatsappSellerAgent`
- implementar integracoes reais de `checkPrice` e `checkAvailability`
- criar workflow de verificacao comercial antes de pensar em novos agentes

### Fase 2

- adicionar `lead-summary-agent`
- adicionar `handoff-note-agent` se houver inbox ou CRM

### Fase 3

- adicionar `catalog-recommendation-agent` quando houver base de catalogo estruturada

## Proposta objetiva

Se a pergunta for "quais agentes devemos criar agora?", a resposta curta e:

1. Criar `lead-summary-agent`
2. Considerar `handoff-note-agent` logo depois
3. Adiar `catalog-recommendation-agent` ate existir catalogo real
4. Nao criar agentes para preco, disponibilidade, policy routing ou handoff decisorio

## Estrutura sugerida no repositorio

Quando esses agentes passarem a existir:

- `src/mastra/agents/whatsapp-seller-agent.ts`
- `src/mastra/agents/lead-summary-agent.ts`
- `src/mastra/agents/handoff-note-agent.ts`
- `src/mastra/agents/catalog-recommendation-agent.ts`
- `src/mastra/workflows/commercial-verification-workflow.ts`

## Decisao recomendada

Para este repositorio, a arquitetura mais forte nao e "mais agentes". E:

- um agente de conversa
- um ou dois agentes auxiliares de sintese
- workflows e ferramentas para verificacao confiavel
- politica de negocio continuando deterministica

Isso preserva seguranca comercial, reduz alucinacao e deixa o projeto pronto para evoluir sem perder controle operacional.
