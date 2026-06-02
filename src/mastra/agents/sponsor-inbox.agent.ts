import { Agent } from "@mastra/core/agent";
import { createTool } from "@mastra/core/tools";
import { parentWorkflowOutputSchema, rawEmailInputSchema, type ParentWorkflowOutput, type RawEmailInput } from "../../lib/schemas";
import { inboxTriageWorkflow } from "../workflows/inbox-triage.workflow";

const emptyWorkflowState = {
  normalizedEmail: null,
  classification: null,
  sponsorDetails: null,
  externalCorroboration: null,
};

export async function runInboxTriageWorkflow(input: RawEmailInput): Promise<ParentWorkflowOutput> {
  const run = await inboxTriageWorkflow.createRun();
  const result = await run.start({
    inputData: input,
    initialState: emptyWorkflowState,
  });

  if (result.status !== "success") {
    throw new Error(`Inbox triage workflow failed with status: ${result.status}`);
  }

  return parentWorkflowOutputSchema.parse(result.result);
}

export const runInboxTriageWorkflowTool = createTool({
  id: "run-inbox-triage-workflow",
  description:
    "Run the deterministic inbox triage workflow for a raw email. Use this instead of manually classifying, researching, scoring, or drafting sponsor replies.",
  inputSchema: rawEmailInputSchema,
  outputSchema: parentWorkflowOutputSchema,
  execute: runInboxTriageWorkflow,
});

export const sponsorInboxAgent = new Agent({
  id: "sponsor-inbox-agent",
  name: "Sponsor Inbox Agent",
  instructions: [
    "You help triage inbound creator email for sponsorship opportunities.",
    "When a user provides an email, call runInboxTriageWorkflowTool and base your answer on the workflow output.",
    "Do not invent brand research, commercial terms, audience fit, or reply copy outside of the workflow result.",
    "Summarize the recommendation, the main reasons, and the suggested next action in plain language.",
  ].join("\n"),
  model: process.env.AGENT_MODEL ?? process.env.SPONSOR_DRAFT_MODEL ?? "openai/gpt-4o-mini",
  tools: {
    runInboxTriageWorkflowTool,
  },
});
