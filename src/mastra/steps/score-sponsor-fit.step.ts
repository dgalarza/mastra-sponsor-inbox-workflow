import { createStep } from "@mastra/core/workflows";
import { scoreRubricSchema } from "../../lib/schemas";
import { scoreSponsorFit } from "../../lib/scoring";
import { corroborationEnvelopeSchema } from "./tavily-search.step";

export const scoredSponsorEnvelopeSchema = corroborationEnvelopeSchema.extend({
  scores: scoreRubricSchema,
});

export const scoreSponsorFitStep = createStep({
  id: "score-sponsor-fit",
  description: "Score fit with a transparent rubric instead of hiding judgment in a single agent answer.",
  inputSchema: corroborationEnvelopeSchema,
  outputSchema: scoredSponsorEnvelopeSchema,
  execute: async ({ inputData }) => ({
    ...inputData,
    scores: await scoreSponsorFit(
      inputData.sponsorDetails,
      inputData.sponsorProvidedEvidence,
      inputData.externalCorroboration,
    ),
  }),
});
