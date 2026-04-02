import { Agent } from '@mastra/core/agent';
import { Memory } from '@mastra/memory';
import type { RuntimeDependencies } from '../domain/whatsapp-sales/types';
import { buildSellerSystemPrompt } from '../domain/whatsapp-sales/response';
import { createWhatsAppSalesTools } from '../domain/whatsapp-sales/tools';
import { sellerScorers } from '../scorers/whatsapp-seller-scorer';

export function createWhatsAppSellerAgent(deps: RuntimeDependencies) {
  const tools = createWhatsAppSalesTools(deps);

  return new Agent({
    id: 'whatsapp-seller-agent',
    name: 'WhatsApp Seller Agent',
    description: 'Agente de vendas curto e objetivo para atendimento comercial no WhatsApp.',
    instructions: buildSellerSystemPrompt(),
    model: process.env.WHATSAPP_AGENT_MODEL ?? 'openai/gpt-5-mini',
    tools,
    memory: new Memory({
      options: {
        lastMessages: 20,
      },
    }),
    scorers: {
      brevity: {
        scorer: sellerScorers.brevityScorer,
        sampling: { type: 'ratio', rate: 1 },
      },
      policy: {
        scorer: sellerScorers.policyComplianceScorer,
        sampling: { type: 'ratio', rate: 1 },
      },
      nextStep: {
        scorer: sellerScorers.nextStepScorer,
        sampling: { type: 'ratio', rate: 1 },
      },
    },
  });
}
