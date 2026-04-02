import crypto from 'node:crypto';
import type {
  InboundWhatsAppEvent,
  NormalizedInboundMessage,
  OutboundWhatsAppMessage,
} from './types';
import { logError, logInfo, logWarn } from './logging';

type MetaWebhookValue = {
  contacts?: { profile?: { name?: string }; wa_id?: string }[];
  messages?: {
    id?: string;
    from?: string;
    timestamp?: string;
    text?: { body?: string };
    type?: string;
  }[];
};

type MetaWebhookEntry = {
  changes?: {
    value?: MetaWebhookValue;
  }[];
}[];

export class WhatsAppCloudAdapter {
  verifyWebhook(query: Record<string, string | undefined>) {
    const mode = query['hub.mode'];
    const token = query['hub.verify_token'];
    const challenge = query['hub.challenge'];

    const expected = process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN;
    if (mode === 'subscribe' && expected && token === expected && challenge) {
      logInfo('whatsapp.webhook.verify.success', {
        mode,
      });
      return { ok: true, challenge };
    }

    logWarn('whatsapp.webhook.verify.failed', {
      mode,
      hasExpectedToken: Boolean(expected),
      tokenMatched: Boolean(expected && token === expected),
    });
    return { ok: false, challenge };
  }

  normalizeInbound(event: InboundWhatsAppEvent): NormalizedInboundMessage | null {
    const payload = event.payload as { entry?: MetaWebhookEntry };
    const value = payload.entry?.[0]?.changes?.[0]?.value;
    const message = value?.messages?.[0];
    if (!message || message.type !== 'text' || !message.text?.body || !message.from) {
      logInfo('whatsapp.webhook.ignored', {
        hasMessage: Boolean(message),
        messageType: message?.type,
        from: message?.from,
      });
      return null;
    }

    const normalized = {
      provider: 'meta' as const,
      messageId: message.id ?? crypto.randomUUID(),
      phone: message.from,
      text: message.text.body,
      timestamp: message.timestamp
        ? new Date(Number(message.timestamp) * 1000).toISOString()
        : new Date().toISOString(),
      profileName: value?.contacts?.[0]?.profile?.name,
      rawPayload: event.payload,
    };

    logInfo('whatsapp.webhook.normalized', {
      messageId: normalized.messageId,
      phone: normalized.phone,
      profileName: normalized.profileName,
      textPreview: preview(normalized.text),
    });

    return normalized;
  }

  async sendText(message: OutboundWhatsAppMessage): Promise<{ delivered: boolean }> {
    const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
    const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;

    if (!phoneNumberId || !accessToken) {
      logWarn('whatsapp.outbound.dry_run', {
        to: message.to,
        conversationId: message.conversationId,
        textPreview: preview(message.text),
      });
      console.log(
        '[whatsapp-dry-run]',
        JSON.stringify({
          to: message.to,
          conversationId: message.conversationId,
          text: message.text,
        }),
      );
      return { delivered: false };
    }

    try {
      const response = await fetch(
        `https://graph.facebook.com/v22.0/${phoneNumberId}/messages`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            messaging_product: 'whatsapp',
            to: message.to,
            type: 'text',
            text: { body: message.text },
          }),
        },
      );

      if (!response.ok) {
        const body = await response.text();
        throw new Error(`WhatsApp send failed: ${response.status} ${body}`);
      }

      logInfo('whatsapp.outbound.sent', {
        to: message.to,
        conversationId: message.conversationId,
        textPreview: preview(message.text),
      });

      return { delivered: true };
    } catch (error) {
      logError('whatsapp.outbound.failed', error, {
        to: message.to,
        conversationId: message.conversationId,
        textPreview: preview(message.text),
      });
      throw error;
    }
  }
}

function preview(text: string, max = 120) {
  return text.length <= max ? text : `${text.slice(0, max)}...`;
}
