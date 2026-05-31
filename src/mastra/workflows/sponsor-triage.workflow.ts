import { createWorkflow } from "@mastra/core/workflows";
import { classifiedEmailSchema, parentWorkflowOutputSchema, workflowStateSchema } from "../../lib/schemas";
import { applyGuardrailsStep } from "../steps/apply-guardrails.step";
import { draftSponsorReplyStep } from "../steps/draft-reply.step";
import { extractSponsorDetailsStep } from "../steps/extract-sponsor-details.step";
import { renderSponsorBriefStep } from "../steps/render-sponsor-brief.step";
import { scoreSponsorFitStep } from "../steps/score-sponsor-fit.step";
import { tavilyExtractSponsorUrlStep } from "../steps/tavily-extract.step";
import { tavilySearchCorroborationStep } from "../steps/tavily-search.step";

export const sponsorTriageWorkflow = createWorkflow({
  id: "sponsor-triage-workflow",
  description: "Nested workflow for sponsor-specific research, scoring, guardrails, and reply drafting.",
  inputSchema: classifiedEmailSchema,
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
