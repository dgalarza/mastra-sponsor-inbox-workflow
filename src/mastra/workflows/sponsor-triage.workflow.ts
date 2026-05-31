import { createWorkflow } from "@mastra/core/workflows";
import { classifiedEmailSchema, parentWorkflowOutputSchema, workflowStateSchema } from "../../lib/schemas";
import { applyGuardrailsStep } from "../steps/apply-guardrails.step";
import { draftSponsorReplyStep } from "../steps/draft-reply.step";
import { extractSponsorDetailsStep } from "../steps/extract-sponsor-details.step";
import { renderSponsorBriefStep } from "../steps/render-sponsor-brief.step";
import { scoreSponsorFitStep } from "../steps/score-sponsor-fit.step";
import { sponsorIntentReviewStep } from "../steps/sponsor-intent-review.step";
import { tavilyExtractSponsorUrlStep } from "../steps/tavily-extract.step";
import { tavilySearchCorroborationStep } from "../steps/tavily-search.step";
import { sponsorIntentEnvelopeSchema, verifySponsorIntentStep } from "../steps/verify-sponsor-intent.step";

export const sponsorResearchWorkflow = createWorkflow({
  id: "sponsor-research-workflow",
  description: "Research, score, guardrail, and draft only after sponsor intent is explicit.",
  inputSchema: sponsorIntentEnvelopeSchema,
  outputSchema: parentWorkflowOutputSchema,
  stateSchema: workflowStateSchema,
})
  .then(extractSponsorDetailsStep)
  .then(tavilyExtractSponsorUrlStep)
  .then(tavilySearchCorroborationStep)
  .then(scoreSponsorFitStep)
  .then(applyGuardrailsStep)
  .then(draftSponsorReplyStep)
  .then(renderSponsorBriefStep)
  .commit();

export const sponsorTriageWorkflow = createWorkflow({
  id: "sponsor-triage-workflow",
  description: "Nested workflow for sponsor-specific research, scoring, guardrails, and reply drafting.",
  inputSchema: classifiedEmailSchema,
  outputSchema: parentWorkflowOutputSchema,
  stateSchema: workflowStateSchema,
})
  .then(verifySponsorIntentStep)
  .branch([
    [async ({ inputData }) => inputData.sponsorIntent.isSponsorInquiry, sponsorResearchWorkflow],
    [async ({ inputData }) => !inputData.sponsorIntent.isSponsorInquiry, sponsorIntentReviewStep],
  ])
  .map(async ({ getStepResult }) => {
    const sponsorResult = getStepResult("sponsor-research-workflow");
    const reviewResult = getStepResult("sponsor-intent-review");
    return parentWorkflowOutputSchema.parse(sponsorResult ?? reviewResult);
  })
  .commit();
