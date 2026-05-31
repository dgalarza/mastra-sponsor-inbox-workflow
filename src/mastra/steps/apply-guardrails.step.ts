import { createStep } from "@mastra/core/workflows";
import { guardrailDecisionSchema } from "../../lib/schemas";
import { applySponsorGuardrails } from "../../lib/scoring";
import { scoredSponsorEnvelopeSchema } from "./score-sponsor-fit.step";

export const guardedSponsorEnvelopeSchema = scoredSponsorEnvelopeSchema.extend({
  guardrailDecision: guardrailDecisionSchema,
});

export const applyGuardrailsStep = createStep({
  id: "apply-guardrails",
  description: "Apply deterministic recommendation policy after judgment and research are complete.",
  inputSchema: scoredSponsorEnvelopeSchema,
  outputSchema: guardedSponsorEnvelopeSchema,
  execute: async ({ inputData }) => ({
    ...inputData,
    guardrailDecision: applySponsorGuardrails(inputData.scores, inputData.sponsorDetails, inputData.externalCorroboration),
  }),
});
