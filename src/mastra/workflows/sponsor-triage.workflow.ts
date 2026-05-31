import { createWorkflow } from "@mastra/core/workflows";
import { classifiedEmailSchema, parentWorkflowOutputSchema, workflowStateSchema } from "../../lib/schemas";
import { runSponsorResearchStep } from "../steps/run-sponsor-research.step";
import { sponsorIntentReviewStep } from "../steps/sponsor-intent-review.step";
import { verifySponsorIntentStep } from "../steps/verify-sponsor-intent.step";

export const sponsorTriageWorkflow = createWorkflow({
  id: "sponsor-triage-workflow",
  description: "Nested workflow for sponsor-specific research, scoring, guardrails, and reply drafting.",
  inputSchema: classifiedEmailSchema,
  outputSchema: parentWorkflowOutputSchema,
  stateSchema: workflowStateSchema,
})
  .then(verifySponsorIntentStep)
  .branch([
    [async ({ inputData }) => inputData.sponsorIntent.isSponsorInquiry, runSponsorResearchStep],
    [async ({ inputData }) => !inputData.sponsorIntent.isSponsorInquiry, sponsorIntentReviewStep],
  ])
  .map(async ({ getStepResult }) => {
    const sponsorResult = getStepResult("run-sponsor-research");
    const reviewResult = getStepResult("sponsor-intent-review");
    return parentWorkflowOutputSchema.parse(sponsorResult ?? reviewResult);
  })
  .commit();
