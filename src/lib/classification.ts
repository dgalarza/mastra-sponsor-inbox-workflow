import { Agent } from "@mastra/core/agent";
import { classificationSchema, type EmailClassification, type NormalizedEmail } from "./schemas";
import { emailContainsAny } from "./email";
import { routeClassification } from "./routing";

const emailClassifierAgent = new Agent({
  id: "email-classifier-agent",
  name: "Email Classifier Agent",
  instructions: `Classify creator inbox email into exactly one category:
sponsor_inquiry, client_lead, existing_client, newsletter_reply, personal, automated_noise, unknown.

Category boundary:
- sponsor_inquiry: brand partnership, sponsorship, dedicated video, integrated mention, media kit, creator pricing, product demo for a potential paid promotion.
- client_lead: consulting/coaching/software-services lead asking to hire Damian for implementation work.

If an email mentions both "partnership" and creator deliverables/pricing/media kit, choose sponsor_inquiry rather than client_lead.

Return JSON with category, confidence, and reason. Confidence must be calibrated:
- below 0.75 if unsure or ambiguous
- 0.75-0.85 if routeable but worth a warning
- above 0.85 only when the email clearly belongs to that category

Ground the reason in text from the email. Do not infer facts that are not present.`,
  model: {
    providerId: "local-classifier",
    modelId: "ministral-3:8b",
    url: "http://lianlidg:11434/v1",
    apiKey: "ollama",
  },
});

export async function classifyEmail(email: NormalizedEmail): Promise<EmailClassification> {
  const response = await emailClassifierAgent.generate(JSON.stringify(email, null, 2), {
    structuredOutput: {
      schema: classificationSchema.omit({ routing: true }),
      jsonPromptInjection: true,
    },
  });

  const draft = classificationSchema.omit({ routing: true }).parse(response.object);
  const reconciled = reconcileSponsorSignals(email, draft);

  return {
    ...reconciled,
    routing: routeClassification(reconciled.category, reconciled.confidence),
  };
}

export function reconcileSponsorSignals(
  email: NormalizedEmail,
  draft: Omit<EmailClassification, "routing">,
): Omit<EmailClassification, "routing"> {
  const hasSponsorSignals = emailContainsAny(email, [
    "partnership",
    "sponsor",
    "dedicated video",
    "dedicated videos",
    "integrated mention",
    "integrated mentions",
    "media kit",
    "pricing",
  ]);

  if (hasSponsorSignals && draft.category === "client_lead") {
    return {
      category: "sponsor_inquiry",
      confidence: Math.max(draft.confidence, 0.9),
      reason: `${draft.reason} Reconciled to sponsor_inquiry because the email asks about creator partnership deliverables, pricing, availability, and media kit details.`,
    };
  }

  return draft;
}
