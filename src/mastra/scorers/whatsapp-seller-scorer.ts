import { z } from 'zod';
import { createScorer } from '@mastra/core/evals';
import {
  getAssistantMessageFromRunOutput,
  getUserMessageFromRunInput,
} from '@mastra/evals/scorers/utils';

const judgeModel = process.env.WHATSAPP_AGENT_MODEL ?? 'openai/gpt-5-mini';

const basePreprocess = ({ run }: any) => {
  const userText = getUserMessageFromRunInput(run.input) || '';
  const assistantText = getAssistantMessageFromRunOutput(run.output) || '';
  return { userText, assistantText };
};

const baseAnalyzeSchema = z.object({
  passed: z.boolean(),
  explanation: z.string().default(''),
});

export const brevityScorer = createScorer({
  id: 'whatsapp-brevity-scorer',
  name: 'WhatsApp Brevity',
  description: 'Verifica se a resposta esta curta o suficiente para WhatsApp.',
  type: 'agent',
  judge: {
    model: judgeModel,
    instructions:
      'Voce avalia respostas comerciais curtas em WhatsApp. Retorne apenas JSON valido.',
  },
})
  .preprocess(basePreprocess)
  .analyze({
    description: 'Avalia se a resposta esta curta, objetiva e com no maximo uma pergunta.',
    outputSchema: baseAnalyzeSchema,
    createPrompt: ({ results }) => `
Usuario:
${results.preprocessStepResult.userText}

Assistente:
${results.preprocessStepResult.assistantText}

A resposta esta curta, objetiva e adequada para WhatsApp, com no maximo 3 frases e no maximo 1 pergunta?
Retorne JSON: {"passed": boolean, "explanation": string}
`,
  })
  .generateScore(({ results }) => (results as any).analyzeStepResult?.passed ? 1 : 0)
  .generateReason(({ results }) => (results as any).analyzeStepResult?.explanation || '');

export const policyComplianceScorer = createScorer({
  id: 'whatsapp-policy-scorer',
  name: 'WhatsApp Policy',
  description: 'Verifica se a resposta evita inventar preco, disponibilidade e catalogo.',
  type: 'agent',
  judge: {
    model: judgeModel,
    instructions:
      'Voce avalia se uma resposta de vendas seguiu politica restritiva. Retorne apenas JSON valido.',
  },
})
  .preprocess(basePreprocess)
  .analyze({
    description: 'Avalia se a resposta evita alucinacao comercial.',
    outputSchema: baseAnalyzeSchema,
    createPrompt: ({ results }) => `
Usuario:
${results.preprocessStepResult.userText}

Assistente:
${results.preprocessStepResult.assistantText}

A resposta evita inventar preco, disponibilidade, nome de kit ou catalogo completo?
Retorne JSON: {"passed": boolean, "explanation": string}
`,
  })
  .generateScore(({ results }) => (results as any).analyzeStepResult?.passed ? 1 : 0)
  .generateReason(({ results }) => (results as any).analyzeStepResult?.explanation || '');

export const nextStepScorer = createScorer({
  id: 'whatsapp-next-step-scorer',
  name: 'WhatsApp Next Step',
  description: 'Verifica se a resposta move a conversa para o proximo passo.',
  type: 'agent',
  judge: {
    model: judgeModel,
    instructions:
      'Voce avalia se a resposta comercial conduz a conversa para a proxima etapa com clareza. Retorne apenas JSON valido.',
  },
})
  .preprocess(basePreprocess)
  .analyze({
    description: 'Avalia conducao da conversa.',
    outputSchema: baseAnalyzeSchema,
    createPrompt: ({ results }) => `
Usuario:
${results.preprocessStepResult.userText}

Assistente:
${results.preprocessStepResult.assistantText}

A resposta conduz para uma proxima acao simples e clara?
Retorne JSON: {"passed": boolean, "explanation": string}
`,
  })
  .generateScore(({ results }) => (results as any).analyzeStepResult?.passed ? 1 : 0)
  .generateReason(({ results }) => (results as any).analyzeStepResult?.explanation || '');

export const sellerScorers = {
  brevityScorer,
  policyComplianceScorer,
  nextStepScorer,
};
