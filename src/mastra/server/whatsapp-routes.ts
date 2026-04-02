import { registerApiRoute } from '@mastra/core/server';
import { z } from 'zod';
import { WhatsAppCloudAdapter } from '../domain/whatsapp-sales/channel-adapter';
import { logError, logInfo } from '../domain/whatsapp-sales/logging';
import { WhatsAppSalesRuntime } from '../domain/whatsapp-sales/runtime';

const replaySchema = z.object({
  text: z.string().min(1),
});

export function createWhatsAppApiRoutes(runtime: WhatsAppSalesRuntime) {
  const channelAdapter = new WhatsAppCloudAdapter();

  return [
    registerApiRoute('/webhooks/whatsapp', {
      method: 'GET',
      requiresAuth: false,
      openapi: {
        summary: 'Verify WhatsApp webhook',
        tags: ['WhatsApp'],
        responses: {
          200: { description: 'Webhook verified' },
          403: { description: 'Forbidden' },
        },
      },
      handler: async c => {
        try {
          logInfo('whatsapp.route.verify.request', {
            path: c.req.path,
          });
          const verification = channelAdapter.verifyWebhook(c.req.query());
          if (!verification.ok) {
            return c.text('Forbidden', 403);
          }

          return c.text(verification.challenge);
        } catch (error) {
          logError('whatsapp.route.verify.failed', error, {
            path: c.req.path,
          });
          return c.json({ error: 'Webhook verification failed' }, 500);
        }
      },
    }),
    registerApiRoute('/webhooks/whatsapp', {
      method: 'POST',
      requiresAuth: false,
      openapi: {
        summary: 'Receive WhatsApp webhook message',
        tags: ['WhatsApp'],
        responses: {
          200: { description: 'Webhook accepted' },
        },
      },
      handler: async c => {
        try {
          const payload = await c.req.json();
          logInfo('whatsapp.route.inbound.request', {
            path: c.req.path,
            hasEntry: Boolean((payload as { entry?: unknown }).entry),
          });
          const normalized = channelAdapter.normalizeInbound({
            provider: 'meta',
            payload,
          });

          if (!normalized) {
            return c.json({ acknowledged: true, ignored: true });
          }

          const result = await runtime.handleInboundMessage(normalized);
          return c.json(result);
        } catch (error) {
          logError('whatsapp.route.inbound.failed', error, {
            path: c.req.path,
          });
          return c.json({ acknowledged: false, error: 'Inbound processing failed' }, 500);
        }
      },
    }),
    registerApiRoute('/internal/conversations/:conversationId/reply', {
      method: 'POST',
      requiresAuth: false,
      openapi: {
        summary: 'Replay a conversation message internally',
        tags: ['WhatsApp'],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: replaySchema,
            },
          },
        },
        responses: {
          200: { description: 'Replay accepted' },
        },
      },
      handler: async c => {
        try {
          const body = replaySchema.parse(await c.req.json());
          const conversationId = c.req.param('conversationId');
          logInfo('whatsapp.route.replay.request', {
            conversationId,
            textPreview: body.text.slice(0, 120),
          });
          const result = await runtime.replayInternalMessage(
            conversationId,
            body.text,
          );
          return c.json(result);
        } catch (error) {
          logError('whatsapp.route.replay.failed', error, {
            conversationId: c.req.param('conversationId'),
          });
          return c.json({ acknowledged: false, error: 'Replay failed' }, 500);
        }
      },
    }),
  ];
}
