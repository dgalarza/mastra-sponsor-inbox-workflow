import { createStep } from "@mastra/core/workflows";
import { classifiedEmailSchema, sponsorIntentSchema } from "../../lib/schemas";

export const sponsorIntentEnvelopeSchema = classifiedEmailSchema.extend({
  sponsorIntent: sponsorIntentSchema,
});

export const verifySponsorIntentStep = createStep({
  id: "verify-sponsor-intent",
  description: "Double-check sponsor intent inside the narrower child workflow.",
  inputSchema: classifiedEmailSchema,
  outputSchema: sponsorIntentEnvelopeSchema,
  execute: async ({ inputData }) => {
    const text = `${inputData.normalizedEmail.subject}\n${inputData.normalizedEmail.body}`.toLowerCase();
    const hasIntent =
      text.includes("partnership") &&
      (text.includes("dedicated") || text.includes("integrated mention") || text.includes("pricing"));

    return {
      ...inputData,
      sponsorIntent: {
        isSponsorInquiry: hasIntent,
        confidence: hasIntent ? 0.94 : 0.6,
        reason: hasIntent
          ? "Email explicitly discusses partnership options, pricing, availability, and sponsor deliverables."
          : "Sponsor-specific intent was not explicit enough for automation.",
      },
    };
  },
});
