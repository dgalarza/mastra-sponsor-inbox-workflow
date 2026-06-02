import { sponsorDetailsSchema, type NormalizedEmail, type SponsorDetails } from "./schemas";
import { generateJson } from "./model-lanes";

const extractorSystemPrompt = `Extract sponsor inquiry details from a creator partnership email.

Rules:
- Return only grounded facts from the email.
- budgetStatus must be "not_provided" unless an actual budget or range appears.
- Do not invent customers, case studies, security proof, or funding.
- Put missing commercial/proof information in missingInformation.
- Keep notableClaims as sponsor-provided claims, not verified facts.`;

export async function extractSponsorDetails(email: NormalizedEmail): Promise<SponsorDetails> {
  return generateJson({
    id: "sponsor-details-extractor-agent",
    name: "Sponsor Details Extractor",
    system: extractorSystemPrompt,
    user: JSON.stringify(email, null, 2),
    schema: sponsorDetailsSchema,
  });
}
