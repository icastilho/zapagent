import type {
  ContextType,
  ConversationIntent,
  ConversationRecord,
  ConversationStage,
  MissingSlot,
  PolicyDecision,
} from './types';

const handoffKeywords = [
  'humano',
  'atendente',
  'pessoa',
  'vendedor',
  'ligar',
  'reclam',
  'problema',
  'cancel',
];

const priceKeywords = ['preco', 'valor', 'quanto custa', 'quanto fica'];
const availabilityKeywords = ['dispon', 'tem para', 'livre', 'vaga'];
const reserveKeywords = ['reserv', 'fechar', 'quero', 'contratar'];
const catalogKeywords = ['catalogo', 'opcoes', 'opcao', 'kit', 'brinquedo'];
const indecisionKeywords = ['nao sei', 'indecis', 'me ajuda', 'qual melhor'];
const howItWorksKeywords = ['como funciona', 'como funfa', 'como e'];
const partyKeywords = ['festa', 'anivers', 'salao', 'evento'];
const homeKeywords = ['casa', 'apartamento'];

export function classifyIntent(message: string, contextType?: ContextType): ConversationIntent {
  const normalized = normalize(message);

  if (containsAny(normalized, howItWorksKeywords)) return 'COMO_FUNCIONA';
  if (containsAny(normalized, priceKeywords)) return 'PRECO';
  if (containsAny(normalized, availabilityKeywords)) return 'DISPONIBILIDADE';
  if (containsAny(normalized, reserveKeywords)) return 'RESERVA';
  if (containsAny(normalized, catalogKeywords)) return 'CATALOGO';
  if (containsAny(normalized, indecisionKeywords)) return 'INDECISAO';
  if (containsAny(normalized, partyKeywords)) return 'FESTA';
  if (containsAny(normalized, homeKeywords)) return 'CASA';
  if (contextType === 'festa') return 'FESTA';
  if (contextType === 'casa') return 'CASA';
  return 'DUVIDA';
}

export function decidePolicy(
  message: string,
  conversation: ConversationRecord,
): PolicyDecision {
  const normalized = normalize(message);
  const extractedFields = extractFields(normalized);
  const mergedState = { ...conversation.state, ...extractedFields };
  const intent = classifyIntent(message, mergedState.contextType);
  const handoffRequired =
    containsAny(normalized, handoffKeywords) ||
    conversation.currentStage === 'HANDED_OFF';
  const handoffReason = handoffRequired
    ? 'Cliente pediu atendimento humano ou mencionou uma situacao sensivel.'
    : undefined;
  const missingSlots = getMissingSlots(intent, mergedState.contextType, mergedState);
  const nextAction = determineNextAction(intent, missingSlots);
  const stage = determineStage(intent, handoffRequired, missingSlots);

  return {
    intent,
    missingSlots,
    nextAction,
    handoffRequired,
    handoffReason,
    stage,
    extractedFields,
  };
}

function extractFields(message: string) {
  const contextType = inferContextType(message);
  const childAge = extractAge(message);
  const eventDate = extractDate(message);
  const childrenCount = extractChildrenCount(message);
  const eventLocation = extractEventLocation(message);
  const painPoint = extractPainPoint(message);
  const customerName = extractName(message);

  return {
    ...(contextType ? { contextType } : {}),
    ...(childAge ? { childAge } : {}),
    ...(eventDate ? { eventDate } : {}),
    ...(childrenCount ? { childrenCount } : {}),
    ...(eventLocation ? { eventLocation } : {}),
    ...(painPoint ? { painPoint } : {}),
    ...(customerName ? { customerName } : {}),
  };
}

function inferContextType(message: string): ContextType | undefined {
  if (containsAny(message, partyKeywords)) return 'festa';
  if (containsAny(message, homeKeywords)) return 'casa';
  return undefined;
}

function getMissingSlots(
  intent: ConversationIntent,
  contextType: ContextType | undefined,
  state: ConversationRecord['state'],
): MissingSlot[] {
  if (!contextType) return ['contextType'];

  if (intent === 'PRECO') {
    return state.interestProduct ? [] : ['interestProduct'];
  }

  if (intent === 'DISPONIBILIDADE') {
    return state.eventDate ? [] : ['eventDate'];
  }

  if (contextType === 'casa') {
    const slots: MissingSlot[] = [];
    if (!state.childAge) slots.push('childAge');
    if (!state.painPoint) slots.push('painPoint');
    return slots;
  }

  const slots: MissingSlot[] = [];
  if (!state.childrenCount) slots.push('childrenCount');
  if (!state.eventLocation) slots.push('eventLocation');
  if (!state.childAge) slots.push('childAge');
  if (!state.eventDate) slots.push('eventDate');
  return slots;
}

function determineNextAction(intent: ConversationIntent, missingSlots: MissingSlot[]): string {
  if (intent === 'PRECO') return missingSlots[0] ? 'clarify_price_target' : 'verify_price';
  if (intent === 'DISPONIBILIDADE') return missingSlots[0] ? 'ask_event_date' : 'verify_availability';
  if (intent === 'RESERVA') return missingSlots[0] ? `ask_${missingSlots[0]}` : 'move_to_reservation';
  if (missingSlots[0]) return `ask_${missingSlots[0]}`;
  if (intent === 'COMO_FUNCIONA') return 'explain_basic_and_advance';
  if (intent === 'INDECISAO') return 'reduce_decision';
  return 'recommend_next_step';
}

function determineStage(
  intent: ConversationIntent,
  handoffRequired: boolean,
  missingSlots: MissingSlot[],
): ConversationStage {
  if (handoffRequired) return 'HANDED_OFF';
  if (intent === 'RESERVA' && missingSlots.length === 0) return 'READY_TO_RESERVE';
  if (intent === 'PRECO' || intent === 'DISPONIBILIDADE') return 'VERIFYING';
  if (missingSlots.length > 0) return 'QUALIFYING';
  return 'RECOMMENDING';
}

function extractAge(message: string): string | undefined {
  const match = message.match(/(\d{1,2})\s*(anos?|ano|meses?|mes)/i);
  return match ? match[0] : undefined;
}

function extractDate(message: string): string | undefined {
  const match = message.match(/\b(\d{1,2}[/-]\d{1,2}(?:[/-]\d{2,4})?)\b/);
  return match ? match[1] : undefined;
}

function extractChildrenCount(message: string): string | undefined {
  const match = message.match(/(\d{1,3})\s*(crianc|kids|pessoas)/i);
  return match ? match[1] : undefined;
}

function extractEventLocation(message: string): string | undefined {
  if (message.includes('salao')) return 'salao';
  if (message.includes('em casa') || message.includes('na minha casa')) return 'casa';
  const match = message.match(/(?:em|no|na)\s+([a-z0-9\s]{3,40})/i);
  return match?.[1]?.trim();
}

function extractPainPoint(message: string): string | undefined {
  if (message.includes('enjo')) return 'crianca enjoa rapido';
  if (message.includes('tela')) return 'muito tempo em telas';
  if (message.includes('nao sei o que fazer')) return 'nao sabe como entreter';
  return undefined;
}

function extractName(message: string): string | undefined {
  const match = message.match(/(?:meu nome e|sou a|sou o)\s+([a-zA-ZÀ-ÿ]+)/i);
  return match?.[1];
}

function containsAny(text: string, keywords: string[]): boolean {
  return keywords.some(keyword => text.includes(keyword));
}

function normalize(value: string): string {
  return value
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase();
}
