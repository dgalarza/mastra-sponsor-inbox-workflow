import { Agent } from "@mastra/core/agent";
import { inboxTriageWorkflow } from "../workflows/inbox-triage.workflow";

export const sponsorInboxAgent = new Agent({
  id: "sponsor-inbox-agent",
  name: "Sponsor Inbox Agent",
  workflows: { inboxTriageWorkflow },
  instructions: "You are a helpful assistant",
  model: process.env.AGENT_MODEL ?? process.env.SPONSOR_DRAFT_MODEL ?? "openai/gpt-4o-mini",
});
