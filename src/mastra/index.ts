import { Mastra } from "@mastra/core/mastra";
import { LibSQLStore } from "@mastra/libsql";
import { PinoLogger } from "@mastra/loggers";
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
  storage: new LibSQLStore({
    id: "mastra-storage",
    url: process.env.DATABASE_URL ?? "file:./mastra.db",
  }),
  logger: new PinoLogger({
    name: "Mastra",
    level: "info",
  }),
});
