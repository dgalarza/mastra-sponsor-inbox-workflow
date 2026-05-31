import { createStep } from "@mastra/core/workflows";
import { parentWorkflowOutputSchema } from "../../lib/schemas";
import { renderReviewRequiredMarkdown } from "../../renderers/sponsor-brief";
import { sponsorIntentEnvelopeSchema } from "./verify-sponsor-intent.step";

export const sponsorIntentReviewStep = createStep({
  id: "sponsor-intent-review",
  description: "Stop safely when sponsor intent is not explicit enough for automation.",
  inputSchema: sponsorIntentEnvelopeSchema,
  outputSchema: parentWorkflowOutputSchema,
  execute: async ({ inputData }) => {
    const reason = `Sponsor-specific intent was not explicit enough for automation. Verification confidence: ${inputData.sponsorIntent.confidence}. ${inputData.sponsorIntent.reason}`;

    return {
      normalizedEmail: inputData.normalizedEmail,
      classification: inputData.classification,
      status: "review_required" as const,
      sponsorBrief: null,
      markdown: renderReviewRequiredMarkdown(reason),
    };
  },
});
