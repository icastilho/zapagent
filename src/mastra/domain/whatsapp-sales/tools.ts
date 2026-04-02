import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import { salesKnowledge, getKnowledgeSummary } from './knowledge';
import type { RuntimeDependencies } from './types';

export function createWhatsAppSalesTools({ stateStore }: RuntimeDependencies) {
  const getSalesKnowledge = createTool({
    id: 'get-sales-knowledge',
    description:
      'Recupera o resumo oficial de negocio, claims permitidos e frases aprovadas da Facilitoy.',
    inputSchema: z.object({
      topic: z.string().describe('Tema solicitado, como casa, festa, preco ou disponibilidade'),
    }),
    outputSchema: z.object({
      summary: z.string(),
      approvedTemplate: z.string().optional(),
    }),
    execute: async ({ topic }) => ({
      summary: getKnowledgeSummary(),
      approvedTemplate:
        topic.toLowerCase().includes('preco')
          ? salesKnowledge.approvedTemplates.priceFallback
          : topic.toLowerCase().includes('dispon')
            ? salesKnowledge.approvedTemplates.availabilityFallback
            : undefined,
    }),
  });

  const checkPrice = createTool({
    id: 'check-price',
    description:
      'Usa a politica atual para responder que o valor precisa ser verificado. Nao retorna preco inventado.',
    inputSchema: z.object({
      productReference: z.string().optional(),
    }),
    outputSchema: z.object({
      status: z.literal('needs_verification'),
      message: z.string(),
    }),
    execute: async () => ({
      status: 'needs_verification' as const,
      message: salesKnowledge.approvedTemplates.priceFallback,
    }),
  });

  const checkAvailability = createTool({
    id: 'check-availability',
    description:
      'Usa a politica atual para responder que a disponibilidade precisa ser verificada.',
    inputSchema: z.object({
      eventDate: z.string().optional(),
    }),
    outputSchema: z.object({
      status: z.literal('needs_verification'),
      message: z.string(),
    }),
    execute: async () => ({
      status: 'needs_verification' as const,
      message: salesKnowledge.approvedTemplates.availabilityFallback,
    }),
  });

  const handoffToHuman = createTool({
    id: 'handoff-to-human',
    description:
      'Marca a conversa para atendimento humano e retorna a mensagem curta de transicao.',
    inputSchema: z.object({
      conversationId: z.string(),
      reason: z.string(),
      summary: z.string(),
    }),
    outputSchema: z.object({
      success: z.boolean(),
      handoffId: z.string(),
      userMessage: z.string(),
    }),
    execute: async ({ conversationId, reason, summary }) => {
      const handoff = await stateStore.createHandoff(conversationId, reason, summary);
      await stateStore.updateConversation(conversationId, conversation => ({
        ...conversation,
        status: 'handed_off',
        currentStage: 'HANDED_OFF',
        handoffReason: reason,
        state: {
          ...conversation.state,
          handoffRequired: true,
          handoffReason: reason,
          summary,
        },
      }));

      return {
        success: true,
        handoffId: handoff.id,
        userMessage: salesKnowledge.approvedTemplates.handoff,
      };
    },
  });

  return {
    getSalesKnowledge,
    checkPrice,
    checkAvailability,
    handoffToHuman,
  };
}
