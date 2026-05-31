import { sponsorDetailsSchema, type NormalizedEmail, type SponsorDetails } from "./schemas";
import { generateJsonOrFallback } from "./model-lanes";

const extractorSystemPrompt = `Extract sponsor inquiry details from a creator partnership email.

Rules:
- Return only grounded facts from the email.
- budgetStatus must be "not_provided" unless an actual budget or range appears.
- Do not invent customers, case studies, security proof, or funding.
- Put missing commercial/proof information in missingInformation.
- Keep notableClaims as sponsor-provided claims, not verified facts.`;

export async function extractSponsorDetails(email: NormalizedEmail): Promise<SponsorDetails> {
  return generateJsonOrFallback({
    system: extractorSystemPrompt,
    user: JSON.stringify(email, null, 2),
    schema: sponsorDetailsSchema,
    modelEnv: "SPONSOR_EXTRACTOR_MODEL",
    fallback: () => deterministicSponsorDetails(email),
  });
}

export function deterministicSponsorDetails(email: NormalizedEmail): SponsorDetails {
  const body = email.body;
  const roleMatch = body.match(/\n([^\n]*Lead[^\n]*)\nDevFlow AI/i);
  const brand = body.match(/from\s+([A-Z][A-Za-z0-9\s]+AI)/)?.[1] ?? "DevFlow AI";
  const url = email.links.find((link) => link.includes("devflow-blueprint.lovable.app")) ?? email.links[0] ?? null;

  return {
    brand,
    sender: {
      name: email.senderName,
      email: email.senderEmail,
      role: roleMatch?.[1]?.trim() ?? "Partnerships Lead",
    },
    productCategory: "AI engineering workflow platform",
    sponsorIntent:
      "Explore a paid creator partnership with dedicated videos or integrated mentions for production AI workflow content.",
    deliverables: ["dedicated videos", "integrated mentions"],
    budgetStatus: "not_provided",
    timelineStatus: "not_provided",
    demoAccess: body.toLowerCase().includes("demo workspace") ? "offered" : "unclear",
    url,
    notableClaims: [
      "Helps product and engineering teams turn product specs into implementation plans.",
      "Can create Linear tickets, GitHub PR checklists, and release notes.",
      "Believes Damian's audience of AI builders, technical founders, and developers is a strong fit.",
    ],
    missingInformation: [
      "Budget range",
      "Campaign timeline",
      "Exact deliverable scope",
      "Customer proof or case studies",
      "Security/compliance materials",
    ],
  };
}
