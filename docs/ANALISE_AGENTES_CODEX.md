# Analise consolidada de agentes para este projeto

## Objetivo desta analise

Existem duas necessidades diferentes que apareceram nas execucoes anteriores:

1. definir quais agentes Codex de engenharia fazem sentido para trabalhar neste repositorio
2. definir quais novos agentes do produto Mastra fazem sentido dentro da aplicacao

As execucoes anteriores misturaram esses dois problemas. Esta versao separa os dois e organiza a recomendacao de forma mais clara.

## 1. Agentes Codex de engenharia

Esses agentes nao sao agentes do app. Eles sao papeis de engenharia para orientar implementacao, manutencao e evolucao do repositorio.

### Recomendacao principal

### 1. `mastra-architect`

Responsabilidade:

- cuidar da arquitetura em `src/mastra/**`
- validar uso correto das APIs atuais do Mastra
- decidir quando algo deve ser `Agent`, `Workflow`, `Tool`, `MCP` ou `Scorer`
- garantir registro correto em `src/mastra/index.ts`

Por que faz sentido:

- o projeto depende fortemente de Mastra
- a superficie de API do framework muda com frequencia
- esse tipo de papel evita que decisoes estruturais fiquem espalhadas

### 2. `remote-agent-orchestrator`

Responsabilidade:

- cuidar do fluxo remoto de execucao de jobs
- intake de tarefas, branching, retomadas, retries, status e integracao com o worker
- garantir que a automacao do Codex funcione com previsibilidade operacional

Por que faz sentido:

- o projeto ja opera com uma camada de execucao remota
- ha historico de falhas operacionais e necessidade de reprocessamento
- esse ownership e diferente da arquitetura do app em si

### 3. `channel-and-business-logic`

Responsabilidade:

- manter regras do dominio de WhatsApp e fluxo comercial
- cuidar de politicas, handoff, restricoes do negocio e comportamento do produto
- proteger a separacao entre linguagem gerada e regra deterministica

Por que faz sentido:

- o maior risco funcional do produto esta em regras de negocio e experiencia do atendimento
- isso nao deve ficar misturado com infraestrutura Mastra nem com o worker remoto

### 4. `evals-and-observability`

Responsabilidade:

- scorers, qualidade de resposta, criterios de regressao, tracing e diagnostico
- verificar se mudancas degradam comportamento ou seguranca
- apoiar operacao com visibilidade e criterios objetivos

Por que faz sentido:

- projetos com agentes degradam silenciosamente sem avaliacao continua
- o repositorio ja tem componentes que apontam para essa direcao

## 2. Agentes Codex alternativos de processo

Uma das execucoes anteriores propôs uma divisao mais orientada a pipeline de trabalho:

- `repo-scout`
- `mastra-guard`
- `feature-worker`
- `review-guard`

Essa proposta nao esta errada, mas eu a trataria como um modelo operacional de execucao, nao como arquitetura principal de ownership.

### Quando ela e util

- quando o objetivo e organizar como o Codex trabalha
- quando voce quer dividir descoberta, implementacao e revisao em etapas
- quando o foco e produtividade operacional da automacao

### Quando ela e fraca

- quando voce quer ownership duravel do repositorio
- quando os limites entre produto, plataforma e qualidade precisam ficar claros

### Conclusao

Se for para escolher apenas uma estrutura base, a divisao recomendada e:

- `mastra-architect`
- `remote-agent-orchestrator`
- `channel-and-business-logic`
- `evals-and-observability`

Se quiser, os agentes de processo podem existir como camada secundaria de execucao dentro desse modelo.

## 3. Agentes do produto Mastra

Aqui estamos falando de agentes que fazem parte da aplicacao em si.

### Estado atual

Hoje o projeto ja tem um agente principal de conversa e uma camada deterministica de politica. Isso e uma base correta para o MVP.

A recomendacao aqui e conservadora: nao aumentar o numero de agentes antes de consolidar integracoes e fluxos verificaveis.

### Recomendados

### 1. Manter o `whatsapp-seller-agent`

Papel:

- gerar a resposta final ao cliente
- adaptar linguagem e tom
- usar ferramentas aprovadas

Regra importante:

- nao deve decidir sozinho estado de negocio
- deve responder com base em dados verificados por ferramentas

### 2. Criar `lead-summary-agent`

Papel:

- resumir conversas para CRM, handoff ou operacao humana
- produzir saida objetiva e estruturada

Por que vale priorizar:

- resume melhor o contexto do lead
- reduz custo operacional
- e uma tarefa adequada para agente

### 3. Criar `handoff-note-agent`

Papel:

- transformar conversa em briefing curto para atendimento humano
- registrar contexto, pendencias e proximo passo

Por que faz sentido:

- o handoff para humano exige contexto operacional, nao apenas uma resposta ao cliente

### 4. Adiar `catalog-recommendation-agent`

Papel futuro:

- recomendar produto ou categoria com base em contexto e catalogo

Por que adiar:

- depende de catalogo real e confiavel
- sem base estruturada, o risco de alucinacao e alto

## 4. O que nao deve virar agente agora

### Nao criar agente para preco

Preco deve vir de fonte oficial:

- ferramenta
- integracao
- workflow auditavel

### Nao criar agente para disponibilidade

Disponibilidade tambem deve vir de consulta verificavel:

- ferramenta
- workflow
- integracao transacional

### Nao criar agente para roteamento de estagio

O roteamento atual em politica deterministica e mais seguro e mais testavel.

### Nao criar agente para decidir handoff

A decisao de parar automacao em situacoes sensiveis deve permanecer deterministica.

## 5. Melhor decisao para agora

### Se a pergunta for:
"quais agentes Codex devemos criar para trabalhar melhor neste projeto?"

Use esta lista:

- `mastra-architect`
- `remote-agent-orchestrator`
- `channel-and-business-logic`
- `evals-and-observability`

### Se a pergunta for:
"quais agentes novos devemos adicionar dentro do app?"

Use esta lista:

- manter `whatsapp-seller-agent`
- criar `lead-summary-agent`
- depois `handoff-note-agent`
- adiar `catalog-recommendation-agent`

## 6. Recomendacao final

A melhor leitura consolidada e:

- para engenharia: separar ownership por plataforma, execucao remota, dominio e qualidade
- para produto: manter poucos agentes e usar workflows e ferramentas para o que precisa ser previsivel
- nao confundir agentes Codex com agentes da aplicacao

A recomendacao mais forte para este repositorio e evitar dois erros:

- criar agentes demais no produto antes da hora
- organizar a engenharia apenas por etapas de execucao, sem ownership tecnico duravel
