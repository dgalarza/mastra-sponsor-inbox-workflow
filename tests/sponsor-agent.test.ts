import { expect, test } from "bun:test";
import { devflowSponsorEmail } from "../src/fixtures/sponsor-email";
import { runInboxTriageWorkflow, runInboxTriageWorkflowTool, sponsorInboxAgent } from "../src/mastra/agents/sponsor-inbox.agent";

process.env.TAVILY_API_KEY = "";

test("sponsor inbox agent registers a workflow delegation tool", () => {
  expect(sponsorInboxAgent.name).toBe("Sponsor Inbox Agent");
  expect(runInboxTriageWorkflowTool.id).toBe("run-inbox-triage-workflow");
});

test("agent workflow helper runs the parent triage workflow without invoking the agent model", async () => {
  const result = await runInboxTriageWorkflow({
    rawEmail: devflowSponsorEmail,
    mailbox: "youtube@damian.example",
  });

  expect(result.status).toBe("completed");
  expect(result.classification.category).toBe("sponsor_inquiry");
  expect(result.sponsorBrief?.guardrailDecision.recommendation).toBe("needs_review");
  expect(result.markdown).toContain("Sponsor Triage Brief");
}, 15_000);
