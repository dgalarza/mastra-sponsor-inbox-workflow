import { createStep } from "@mastra/core/workflows";
import { extractSponsorProvidedClaims } from "../../lib/tavily";
import { sponsorProvidedEvidenceSchema } from "../../lib/schemas";
import { sponsorDetailsEnvelopeSchema } from "./extract-sponsor-details.step";

export const sponsorProvidedEvidenceEnvelopeSchema = sponsorDetailsEnvelopeSchema.extend({
  sponsorProvidedEvidence: sponsorProvidedEvidenceSchema,
});

export const tavilyExtractSponsorUrlStep = createStep({
  id: "tavily-extract-sponsor-url",
  description: "Extract and summarize sponsor-provided URL claims without treating them as independent proof.",
  inputSchema: sponsorDetailsEnvelopeSchema,
  outputSchema: sponsorProvidedEvidenceEnvelopeSchema,
  execute: async ({ inputData }) => {
    const sponsorProvidedEvidence = await extractSponsorProvidedClaims(inputData.sponsorDetails.url);
    return { ...inputData, sponsorProvidedEvidence };
  },
});
