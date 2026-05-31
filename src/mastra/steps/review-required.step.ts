import { createStep } from "@mastra/core/workflows";
import { classifiedEmailSchema, parentWorkflowOutputSchema } from "../../lib/schemas";
import { renderReviewRequiredMarkdown } from "../../renderers/sponsor-brief";

export const reviewRequiredStep = createStep({
  id: "review-required",
  description: "Stop safely when the parent inbox classifier should not automate the email.",
  inputSchema: classifiedEmailSchema,
  outputSchema: parentWorkflowOutputSchema,
  execute: async ({ inputData }) => {
    const warning = inputData.classification.routing.warning ?? "This email is outside the sponsor automation lane.";
    return {
      normalizedEmail: inputData.normalizedEmail,
      classification: inputData.classification,
      status: inputData.classification.routing.action === "ignore" ? ("ignored" as const) : ("review_required" as const),
      sponsorBrief: null,
      markdown: renderReviewRequiredMarkdown(warning),
    };
  },
});
