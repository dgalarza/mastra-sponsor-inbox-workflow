import { Agent } from "@mastra/core/agent";
import { sponsorDetailsSchema, type NormalizedEmail, type SponsorDetails } from "./schemas";

const sponsorDetailsExtractorAgent = new Agent({
  id: "sponsor-details-extractor-agent",
  name: "Sponsor Details Extractor",
  instructions: `Extract sponsor inquiry details from a creator partnership email.

Rules:
- Return only grounded facts from the email.
- budgetStatus must be "not_provided" unless an actual budget or range appears.
- Do not invent customers, case studies, security proof, or funding.
- Put missing commercial/proof information in missingInformation.
- Keep notableClaims as sponsor-provided claims, not verified facts.`,
  model: {
    providerId: "local-classifier",
    modelId: "ministral-3:8b",
    url: "http://lianlidg:11434/v1",
    apiKey: "ollama",
  },
});

export async function extractSponsorDetails(email: NormalizedEmail): Promise<SponsorDetails> {
  const response = await sponsorDetailsExtractorAgent.generate(JSON.stringify(email, null, 2), {
    structuredOutput: {
      schema: sponsorDetailsSchema,
      jsonPromptInjection: true,
    },
  });

  return sponsorDetailsSchema.parse(response.object);
}
