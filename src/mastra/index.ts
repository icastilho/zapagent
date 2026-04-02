import { Mastra } from '@mastra/core/mastra';
import { PinoLogger } from '@mastra/loggers';
import { LibSQLStore } from '@mastra/libsql';
import { DuckDBStore } from '@mastra/duckdb';
import { FilesystemStore, MastraCompositeStore } from '@mastra/core/storage';
import {
  Observability,
  DefaultExporter,
  CloudExporter,
  SensitiveDataFilter,
} from '@mastra/observability';
import { createWhatsAppSellerAgent } from './agents/whatsapp-seller-agent';
import { WhatsAppCloudAdapter } from './domain/whatsapp-sales/channel-adapter';
import { FileBackedSalesStateStore } from './domain/whatsapp-sales/state-store';
import { WhatsAppSalesRuntime } from './domain/whatsapp-sales/runtime';
import { createWhatsAppApiRoutes } from './server/whatsapp-routes';
import { sellerScorers } from './scorers/whatsapp-seller-scorer';

const salesStateStore = new FileBackedSalesStateStore();
const runtimeDeps = {
  stateStore: salesStateStore,
};

const whatsappSellerAgent = createWhatsAppSellerAgent(runtimeDeps);
const channelAdapter = new WhatsAppCloudAdapter();
const whatsappSalesRuntime = new WhatsAppSalesRuntime({
  ...runtimeDeps,
  agent: whatsappSellerAgent,
  channelAdapter,
});

export const mastra = new Mastra({
  agents: { whatsappSellerAgent },
  scorers: {
    brevityScorer: sellerScorers.brevityScorer,
    policyComplianceScorer: sellerScorers.policyComplianceScorer,
    nextStepScorer: sellerScorers.nextStepScorer,
  },
  storage: new MastraCompositeStore({
    id: 'composite-storage',
    default: new LibSQLStore({
      id: 'mastra-storage',
      url: 'file:./mastra.db',
    }),
    editor: new FilesystemStore({
      dir: '.mastra-storage',
    }),
    domains: {
      observability: await new DuckDBStore().getStore('observability'),
    },
  }),
  server: {
    build: {
      swaggerUI: true,
    },
    apiRoutes: createWhatsAppApiRoutes(whatsappSalesRuntime),
  },
  logger: new PinoLogger({
    name: 'Mastra',
    level: 'info',
  }),
  observability: new Observability({
    configs: {
      default: {
        serviceName: 'mastra-whatsapp-seller',
        exporters: [
          new DefaultExporter(),
          new CloudExporter(),
        ],
        spanOutputProcessors: [new SensitiveDataFilter()],
      },
    },
  }),
});
