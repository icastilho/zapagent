export type ConversationIntent =
  | 'COMO_FUNCIONA'
  | 'FESTA'
  | 'CASA'
  | 'PRECO'
  | 'DISPONIBILIDADE'
  | 'RESERVA'
  | 'DUVIDA'
  | 'CATALOGO'
  | 'INDECISAO';

export type ContextType = 'festa' | 'casa';

export type ConversationStage =
  | 'NEW_LEAD'
  | 'CONTACTED'
  | 'QUALIFYING'
  | 'RECOMMENDING'
  | 'VERIFYING'
  | 'READY_TO_RESERVE'
  | 'HANDED_OFF';

export type MissingSlot =
  | 'contextType'
  | 'childAge'
  | 'eventDate'
  | 'childrenCount'
  | 'eventLocation'
  | 'interestProduct'
  | 'painPoint';

export interface LeadRecord {
  id: string;
  phone: string;
  name?: string;
  createdAt: string;
  updatedAt: string;
}

export interface MessageRecord {
  id: string;
  conversationId: string;
  role: 'user' | 'agent' | 'human' | 'system';
  content: string;
  timestamp: string;
  metadata?: Record<string, unknown>;
}

export interface ConversationStateRecord {
  intent: ConversationIntent;
  contextType?: ContextType;
  customerName?: string;
  childAge?: string;
  eventDate?: string;
  childrenCount?: string;
  eventLocation?: string;
  interestProduct?: string;
  painPoint?: string;
  nextAction: string;
  lastUserMessage: string;
  summary: string;
  handoffRequired: boolean;
  handoffReason?: string;
}

export interface ConversationRecord {
  id: string;
  leadId: string;
  status: 'open' | 'handed_off' | 'closed';
  currentStage: ConversationStage;
  lastMessageAt: string;
  assignedHuman?: string;
  handoffReason?: string;
  state: ConversationStateRecord;
  messages: MessageRecord[];
}

export interface HandoffRecord {
  id: string;
  conversationId: string;
  reason: string;
  summary: string;
  createdAt: string;
}

export interface AppState {
  leads: Record<string, LeadRecord>;
  leadsByPhone: Record<string, string>;
  conversations: Record<string, ConversationRecord>;
  conversationsByLeadId: Record<string, string>;
  handoffs: Record<string, HandoffRecord>;
}

export interface InboundWhatsAppEvent {
  provider: 'meta';
  payload: unknown;
}

export interface NormalizedInboundMessage {
  provider: 'meta' | 'internal';
  messageId: string;
  phone: string;
  text: string;
  timestamp: string;
  profileName?: string;
  rawPayload: unknown;
}

export interface OutboundWhatsAppMessage {
  to: string;
  text: string;
  conversationId: string;
}

export interface PolicyDecision {
  intent: ConversationIntent;
  missingSlots: MissingSlot[];
  nextAction: string;
  handoffRequired: boolean;
  handoffReason?: string;
  stage: ConversationStage;
  extractedFields: Partial<ConversationStateRecord>;
}

export interface KnowledgeContext {
  businessSummary: string;
  differentiators: string[];
  allowedClaims: string[];
  forbiddenClaims: string[];
  recommendationHint: string;
  approvedTemplates: Record<string, string>;
}

export interface PriceCheckResult {
  status: 'needs_verification';
  message: string;
}

export interface AvailabilityCheckResult {
  status: 'needs_verification';
  message: string;
}

export interface HandoffResult {
  success: boolean;
  handoffId: string;
  userMessage: string;
  summary: string;
}

export interface RuntimeDependencies {
  stateStore: {
    getOrCreateLead(phone: string, name?: string): Promise<LeadRecord>;
    getLead(leadId: string): Promise<LeadRecord | undefined>;
    getOrCreateConversation(lead: LeadRecord): Promise<ConversationRecord>;
    appendMessage(
      conversationId: string,
      message: Omit<MessageRecord, 'id' | 'conversationId'>,
    ): Promise<MessageRecord>;
    updateConversation(
      conversationId: string,
      updater: (conversation: ConversationRecord) => ConversationRecord,
    ): Promise<ConversationRecord>;
    createHandoff(
      conversationId: string,
      reason: string,
      summary: string,
    ): Promise<HandoffRecord>;
    getConversation(conversationId: string): Promise<ConversationRecord | undefined>;
  };
}
