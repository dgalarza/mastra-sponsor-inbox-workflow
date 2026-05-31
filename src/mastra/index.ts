import { Mastra } from "@mastra/core/mastra";
import { MastraCompositeStore } from "@mastra/core/storage";
import { DuckDBStore } from "@mastra/duckdb";
import { LibSQLStore } from "@mastra/libsql";
import { PinoLogger } from "@mastra/loggers";
import { DefaultExporter, Observability } from "@mastra/observability";
import { inboxTriageWorkflow } from "./workflows/inbox-triage.workflow";
import { sponsorTriageWorkflow } from "./workflows/sponsor-triage.workflow";
import { classifyEmailScorer } from "./scorers/classify-email.scorer";
import { sponsorDetailsScorer } from "./scorers/sponsor-details.scorer";

export const mastra = new Mastra({
  workflows: {
    inboxTriageWorkflow,
    sponsorTriageWorkflow,
  },
  scorers: {
    classifyEmailScorer,
    sponsorDetailsScorer,
  },
  storage: new MastraCompositeStore({
    id: "mastra-composite-storage",
    default: new LibSQLStore({
      id: "mastra-storage",
      url: process.env.DATABASE_URL ?? "file:./mastra.db",
    }),
    domains: {
      observability: new DuckDBStore({
        id: "mastra-observability-storage",
        path: process.env.OBSERVABILITY_DB_URL ?? "mastra-observability.duckdb",
      }).observability,
    },
  }),
  observability: new Observability({
    configs: {
      default: {
        serviceName: "mastra-sponsor-inbox-workflow",
        logging: { enabled: true, level: "info" },
        exporters: [new DefaultExporter()],
      },
    },
  }),
  logger: new PinoLogger({
    name: "Mastra",
    level: "info",
  }),
});
