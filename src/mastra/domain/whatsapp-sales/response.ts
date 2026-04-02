import { salesKnowledge } from './knowledge';
import type { ConversationRecord } from './types';

export function buildSellerSystemPrompt(): string {
  return `
Voce e o vendedor de WhatsApp da Facilitoy.

Objetivo:
- entender o basico
- conduzir o cliente para a proxima etapa
- verificar disponibilidade ou valor apenas quando houver dados suficientes
- levar para reserva

Regras obrigatorias:
- Uma mensagem = um objetivo
- Maximo de 2 ou 3 frases
- Apenas 1 pergunta quando estiver avancando a conversa
- Fale de forma humana, leve, curta e direta
- Nunca invente preco, disponibilidade, kit, produto ou promessa operacional
- Nunca despeje catalogo
- Se faltar dado, faca apenas a pergunta mais importante
- Se precisar verificar preco ou disponibilidade, diga isso de forma curta
- Se houver handoff, pare de vender e apenas faca a transicao

Base de negocio:
${salesKnowledge.businessSummary}

Permitido:
${salesKnowledge.allowedClaims.join('\n')}

Proibido:
${salesKnowledge.forbiddenClaims.join('\n')}
`.trim();
}

export function buildConversationContext(conversation: ConversationRecord): string {
  return `
Estado atual:
- stage: ${conversation.currentStage}
- intent: ${conversation.state.intent}
- contextType: ${conversation.state.contextType ?? 'desconhecido'}
- childAge: ${conversation.state.childAge ?? 'nao informado'}
- eventDate: ${conversation.state.eventDate ?? 'nao informado'}
- childrenCount: ${conversation.state.childrenCount ?? 'nao informado'}
- eventLocation: ${conversation.state.eventLocation ?? 'nao informado'}
- painPoint: ${conversation.state.painPoint ?? 'nao informado'}
- nextAction: ${conversation.state.nextAction}
- handoffRequired: ${conversation.state.handoffRequired ? 'sim' : 'nao'}

Se o proximo passo for uma pergunta, faca somente uma pergunta.
Se o contexto for insuficiente, faca a pergunta prioritaria em vez de explicar.
`.trim();
}

export function validateSellerReply(text: string, conversation: ConversationRecord): {
  valid: boolean;
  reason?: string;
} {
  const trimmed = text.trim();
  if (!trimmed) return { valid: false, reason: 'Resposta vazia.' };

  const sentenceCount = trimmed
    .split(/[.!?]\s+/)
    .map(part => part.trim())
    .filter(Boolean).length;

  const questionCount = (trimmed.match(/\?/g) ?? []).length;
  if (sentenceCount > 3) {
    return { valid: false, reason: 'Resposta longa demais.' };
  }

  if (questionCount > 1) {
    return { valid: false, reason: 'Resposta tem mais de uma pergunta.' };
  }

  const lowered = trimmed.toLowerCase();
  const forbidden = ['r$', 'reais', 'disponivel', 'temos o kit', 'saturno', 'netuno'];
  if (forbidden.some(token => lowered.includes(token))) {
    return { valid: false, reason: 'Resposta pode estar inventando dado sensivel.' };
  }

  if (conversation.currentStage === 'HANDED_OFF' && lowered.includes('?')) {
    return { valid: false, reason: 'Nao deve continuar vendendo apos handoff.' };
  }

  return { valid: true };
}

export function fallbackReply(conversation: ConversationRecord): string {
  if (conversation.currentStage === 'HANDED_OFF') {
    return salesKnowledge.approvedTemplates.handoff;
  }

  const nextAction = conversation.state.nextAction;
  if (nextAction === 'ask_contextType') return `Oi! 😊 ${salesKnowledge.approvedTemplates.askContext}`;
  if (nextAction === 'ask_childAge') return `${salesKnowledge.approvedTemplates.askAge} 😊`;
  if (nextAction === 'ask_painPoint') return `${salesKnowledge.approvedTemplates.askPain} 😊`;
  if (nextAction === 'ask_eventDate') return salesKnowledge.approvedTemplates.askDate;
  if (nextAction === 'ask_childrenCount') return `${salesKnowledge.approvedTemplates.askChildrenCount} 😊`;
  if (nextAction === 'ask_eventLocation') return `${salesKnowledge.approvedTemplates.askLocation} 😊`;
  if (nextAction === 'verify_price') return salesKnowledge.approvedTemplates.priceFallback;
  if (nextAction === 'verify_availability') return salesKnowledge.approvedTemplates.availabilityFallback;

  if (conversation.state.contextType === 'casa') {
    return 'Para esse caso, o ideal e ter brinquedos certos pra fase e ir trocando 😊 Quer que eu te mostre um caminho?';
  }

  if (conversation.state.contextType === 'festa') {
    return 'Para festa, o ideal e montar um cantinho de brincadeiras que entretenha bem as criancas 😊 Quer que eu veja o melhor caminho?';
  }

  return `Oi! 😊 ${salesKnowledge.approvedTemplates.askContext}`;
}
