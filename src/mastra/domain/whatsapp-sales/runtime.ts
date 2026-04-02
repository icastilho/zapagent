import crypto from 'node:crypto';
import type { Agent } from '@mastra/core/agent';
import { salesKnowledge } from './knowledge';
import { logError, logInfo, logWarn } from './logging';
import { decidePolicy } from './policy';
import { buildConversationContext, buildSellerSystemPrompt, fallbackReply, validateSellerReply } from './response';
import type {
  NormalizedInboundMessage,
  OutboundWhatsAppMessage,
  RuntimeDependencies,
} from './types';

export class WhatsAppSalesRuntime {
  constructor(
    private readonly deps: RuntimeDependencies & {
      agent: Agent;
      channelAdapter: {
        sendText(message: OutboundWhatsAppMessage): Promise<{ delivered: boolean }>;
      };
    },
  ) {}

  async handleInboundMessage(inbound: NormalizedInboundMessage) {
    try {
      logInfo('whatsapp.runtime.inbound.received', {
        provider: inbound.provider,
        messageId: inbound.messageId,
        phone: inbound.phone,
        textPreview: preview(inbound.text),
      });

      const lead = await this.deps.stateStore.getOrCreateLead(
        inbound.phone,
        inbound.profileName,
      );
      const conversation = await this.deps.stateStore.getOrCreateConversation(lead);

      logInfo('whatsapp.runtime.conversation.loaded', {
        leadId: lead.id,
        conversationId: conversation.id,
        currentStage: conversation.currentStage,
      });

      await this.deps.stateStore.appendMessage(conversation.id, {
        role: 'user',
        content: inbound.text,
        timestamp: inbound.timestamp,
        metadata: {
          provider: inbound.provider,
          messageId: inbound.messageId,
        },
      });

      const latestConversation =
        (await this.deps.stateStore.getConversation(conversation.id)) ?? conversation;
      if (latestConversation.currentStage === 'HANDED_OFF') {
        logWarn('whatsapp.runtime.skipped_handed_off', {
          conversationId: conversation.id,
        });
        return {
          acknowledged: true,
          status: 'handed_off' as const,
          conversationId: conversation.id,
        };
      }

      const decision = decidePolicy(inbound.text, latestConversation);
      logInfo('whatsapp.runtime.policy.decided', {
        conversationId: conversation.id,
        intent: decision.intent,
        stage: decision.stage,
        nextAction: decision.nextAction,
        missingSlots: decision.missingSlots,
        handoffRequired: decision.handoffRequired,
        extractedFields: decision.extractedFields,
      });

      const updatedConversation = await this.deps.stateStore.updateConversation(
        conversation.id,
        current => ({
          ...current,
          currentStage: decision.stage,
          state: {
            ...current.state,
            ...decision.extractedFields,
            intent: decision.intent,
            nextAction: decision.nextAction,
            handoffRequired: decision.handoffRequired,
            handoffReason: decision.handoffReason,
            lastUserMessage: inbound.text,
            summary: buildSummary(
              current.state.customerName ?? inbound.profileName,
              inbound.text,
            ),
          },
        }),
      );

      let reply: string;

      if (decision.handoffRequired) {
        await this.deps.stateStore.createHandoff(
          conversation.id,
          decision.handoffReason ?? 'Solicitacao de atendimento humano.',
          updatedConversation.state.summary,
        );
        const handedOffConversation = await this.deps.stateStore.updateConversation(
          conversation.id,
          current => ({
            ...current,
            status: 'handed_off',
            currentStage: 'HANDED_OFF',
            handoffReason: decision.handoffReason,
            state: {
              ...current.state,
              handoffRequired: true,
              handoffReason: decision.handoffReason,
            },
          }),
        );
        reply = fallbackReply(handedOffConversation);
        logWarn('whatsapp.runtime.handoff', {
          conversationId: conversation.id,
          reason: decision.handoffReason,
          replyPreview: preview(reply),
        });
      } else {
        logInfo('whatsapp.runtime.agent.generate.start', {
          conversationId: conversation.id,
          memoryResource: lead.id,
          memoryThread: conversation.id,
        });

        const result = await this.deps.agent.generate(inbound.text, {
          memory: {
            resource: lead.id,
            thread: conversation.id,
          },
          maxSteps: 4,
          system: [
            {
              role: 'system',
              content: buildSellerSystemPrompt(),
            },
            {
              role: 'system',
              content: buildConversationContext(updatedConversation),
            },
            {
              role: 'system',
              content: `Frases aprovadas:\n- ${salesKnowledge.approvedTemplates.comoFunciona}\n- ${salesKnowledge.approvedTemplates.askContext}\n- ${salesKnowledge.approvedTemplates.askAge}\n- ${salesKnowledge.approvedTemplates.askPain}\n- ${salesKnowledge.approvedTemplates.priceFallback}\n- ${salesKnowledge.approvedTemplates.availabilityFallback}`,
            },
          ],
          onError: ({ error }) => {
            logError('whatsapp.runtime.agent.generate.error', error, {
              conversationId: conversation.id,
              phone: inbound.phone,
            });
          },
        });

        reply = result.text?.trim() || '';
        logInfo('whatsapp.runtime.agent.generate.finish', {
          conversationId: conversation.id,
          finishReason: (result as { finishReason?: string }).finishReason,
          replyPreview: preview(reply),
        });

        const validation = validateSellerReply(reply, updatedConversation);
        if (!validation.valid) {
          logWarn('whatsapp.runtime.reply.fallback', {
            conversationId: conversation.id,
            reason: validation.reason,
            rawReplyPreview: preview(reply),
          });
          reply = fallbackReply(updatedConversation);
        }
      }

      await this.deps.stateStore.appendMessage(conversation.id, {
        role: 'agent',
        content: reply,
        timestamp: new Date().toISOString(),
        metadata: {
          generatedBy: 'whatsappSellerAgent',
        },
      });

      await this.deps.channelAdapter.sendText({
        to: inbound.phone,
        text: reply,
        conversationId: conversation.id,
      });

      logInfo('whatsapp.runtime.completed', {
        conversationId: conversation.id,
        status: 'replied',
        replyPreview: preview(reply),
      });

      return {
        acknowledged: true,
        status: 'replied' as const,
        conversationId: conversation.id,
        reply,
      };
    } catch (error) {
      logError('whatsapp.runtime.failed', error, {
        provider: inbound.provider,
        messageId: inbound.messageId,
        phone: inbound.phone,
        textPreview: preview(inbound.text),
      });
      throw error;
    }
  }

  async replayInternalMessage(conversationId: string, text: string) {
    const conversation = await this.deps.stateStore.getConversation(conversationId);
    if (!conversation) {
      throw new Error(`Conversation ${conversationId} not found`);
    }
    const lead = await this.deps.stateStore.getLead(conversation.leadId);
    if (!lead) {
      throw new Error(`Lead ${conversation.leadId} not found`);
    }

    return this.handleInboundMessage({
      provider: 'internal',
      messageId: crypto.randomUUID(),
      phone: lead.phone,
      text,
      timestamp: new Date().toISOString(),
      rawPayload: { conversationId },
    });
  }
}

function buildSummary(name: string | undefined, lastUserMessage: string): string {
  return [name ? `Cliente: ${name}.` : undefined, `Ultima mensagem: ${lastUserMessage}`]
    .filter(Boolean)
    .join(' ');
}

function preview(text: string, max = 120) {
  return text.length <= max ? text : `${text.slice(0, max)}...`;
}
