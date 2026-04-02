import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import type {
  AppState,
  ConversationRecord,
  ConversationStateRecord,
  HandoffRecord,
  LeadRecord,
  MessageRecord,
} from './types';

const defaultConversationState = (lastUserMessage = ''): ConversationStateRecord => ({
  intent: 'DUVIDA',
  nextAction: 'ask_contextType',
  lastUserMessage,
  summary: '',
  handoffRequired: false,
});

const emptyState = (): AppState => ({
  leads: {},
  leadsByPhone: {},
  conversations: {},
  conversationsByLeadId: {},
  handoffs: {},
});

export class FileBackedSalesStateStore {
  private readonly stateFile: string;

  constructor(stateFile = path.join(process.cwd(), '.mastra', 'sales-state.json')) {
    this.stateFile = stateFile;
  }

  async getOrCreateLead(phone: string, name?: string): Promise<LeadRecord> {
    const state = await this.readState();
    const existingId = state.leadsByPhone[phone];
    if (existingId) {
      const existing = state.leads[existingId];
      const updated: LeadRecord = {
        ...existing,
        name: existing.name ?? name,
        updatedAt: new Date().toISOString(),
      };
      state.leads[existingId] = updated;
      await this.writeState(state);
      return updated;
    }

    const now = new Date().toISOString();
    const lead: LeadRecord = {
      id: crypto.randomUUID(),
      phone,
      name,
      createdAt: now,
      updatedAt: now,
    };

    state.leads[lead.id] = lead;
    state.leadsByPhone[phone] = lead.id;
    await this.writeState(state);
    return lead;
  }

  async getOrCreateConversation(lead: LeadRecord): Promise<ConversationRecord> {
    const state = await this.readState();
    const existingId = state.conversationsByLeadId[lead.id];
    if (existingId) {
      return state.conversations[existingId];
    }

    const now = new Date().toISOString();
    const conversation: ConversationRecord = {
      id: crypto.randomUUID(),
      leadId: lead.id,
      status: 'open',
      currentStage: 'NEW_LEAD',
      lastMessageAt: now,
      state: defaultConversationState(),
      messages: [],
    };

    state.conversations[conversation.id] = conversation;
    state.conversationsByLeadId[lead.id] = conversation.id;
    await this.writeState(state);
    return conversation;
  }

  async getLead(leadId: string): Promise<LeadRecord | undefined> {
    const state = await this.readState();
    return state.leads[leadId];
  }

  async appendMessage(
    conversationId: string,
    message: Omit<MessageRecord, 'id' | 'conversationId'>,
  ): Promise<MessageRecord> {
    return this.updateAndReturn(conversationId, conversation => {
      const nextMessage: MessageRecord = {
        id: crypto.randomUUID(),
        conversationId,
        ...message,
      };

      const updated: ConversationRecord = {
        ...conversation,
        lastMessageAt: message.timestamp,
        messages: [...conversation.messages, nextMessage],
      };

      return { conversation: updated, value: nextMessage };
    });
  }

  async updateConversation(
    conversationId: string,
    updater: (conversation: ConversationRecord) => ConversationRecord,
  ): Promise<ConversationRecord> {
    return this.updateAndReturn(conversationId, conversation => {
      const updated = updater(conversation);
      return { conversation: updated, value: updated };
    });
  }

  async createHandoff(
    conversationId: string,
    reason: string,
    summary: string,
  ): Promise<HandoffRecord> {
    const state = await this.readState();
    const handoff: HandoffRecord = {
      id: crypto.randomUUID(),
      conversationId,
      reason,
      summary,
      createdAt: new Date().toISOString(),
    };
    state.handoffs[handoff.id] = handoff;
    await this.writeState(state);
    return handoff;
  }

  async getConversation(conversationId: string): Promise<ConversationRecord | undefined> {
    const state = await this.readState();
    return state.conversations[conversationId];
  }

  private async updateAndReturn<T>(
    conversationId: string,
    updater: (conversation: ConversationRecord) => { conversation: ConversationRecord; value: T },
  ): Promise<T> {
    const state = await this.readState();
    const conversation = state.conversations[conversationId];
    if (!conversation) {
      throw new Error(`Conversation ${conversationId} not found`);
    }

    const result = updater(conversation);
    state.conversations[conversationId] = result.conversation;
    await this.writeState(state);
    return result.value;
  }

  private async readState(): Promise<AppState> {
    try {
      const raw = await readFile(this.stateFile, 'utf8');
      return JSON.parse(raw) as AppState;
    } catch {
      await this.ensureDirectory();
      await this.writeState(emptyState());
      return emptyState();
    }
  }

  private async writeState(state: AppState): Promise<void> {
    await this.ensureDirectory();
    await writeFile(this.stateFile, JSON.stringify(state, null, 2));
  }

  private async ensureDirectory(): Promise<void> {
    await mkdir(path.dirname(this.stateFile), { recursive: true });
  }
}
