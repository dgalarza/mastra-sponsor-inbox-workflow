import { Agent } from "@mastra/core/agent";
import { inboxTriageWorkflow } from "../workflows/inbox-triage.workflow";

export const sponsorInboxAgent = new Agent({
  id: "sponsor-inbox-agent",
  name: "Sponsor Inbox Agent",
  workflows: { inboxTriageWorkflow },
  instructions: "You are a helpful assistant",
  model: {
    providerId: "openai",
    modelId: process.env.AGENT_MODEL ?? process.env.LOCAL_EXTRACTOR_MODEL ?? "mlx-community/Qwen3.6-35B-A3B-6bit",
    url: process.env.AGENT_BASE_URL ?? process.env.LOCAL_EXTRACTOR_BASE_URL ?? "http://gstudio:8081/v1",
    apiKey: process.env.AGENT_API_KEY ?? process.env.LOCAL_EXTRACTOR_API_KEY ?? "mlx",
  },
});
