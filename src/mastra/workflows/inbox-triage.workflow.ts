import { createWorkflow } from "@mastra/core/workflows";
import { classifiedEmailSchema, parentWorkflowOutputSchema, rawEmailInputSchema, workflowStateSchema } from "../../lib/schemas";
import { classifyEmailStep } from "../steps/classify-email.step";
import { normalizeEmailStep } from "../steps/normalize-email.step";
import { reviewRequiredStep } from "../steps/review-required.step";
import { sponsorTriageWorkflow } from "./sponsor-triage.workflow";

export const inboxTriageWorkflow = createWorkflow({
  id: "inbox-triage-workflow",
  description: "Parent workflow that normalizes, classifies, and routes creator inbox email.",
  inputSchema: rawEmailInputSchema,
  outputSchema: parentWorkflowOutputSchema,
  stateSchema: workflowStateSchema,
})
  .then(normalizeEmailStep)
  .then(classifyEmailStep)
  .map(async ({ inputData, getStepResult }) => {
    const normalizedEmail = getStepResult("normalize-email");
    return classifiedEmailSchema.parse({
      normalizedEmail,
      classification: inputData,
    });
  })
  .branch([
    [async ({ inputData }) => inputData.classification.routing.action === "route_sponsor", sponsorTriageWorkflow],
    [async ({ inputData }) => inputData.classification.routing.action !== "route_sponsor", reviewRequiredStep],
  ])
  .map(async ({ getStepResult }) => {
    const sponsorResult = getStepResult("sponsor-triage-workflow");
    const reviewResult = getStepResult("review-required");
    return parentWorkflowOutputSchema.parse(sponsorResult ?? reviewResult);
  })
  .commit();
