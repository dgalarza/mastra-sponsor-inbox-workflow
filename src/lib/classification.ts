import { classificationSchema, type EmailClassification, type NormalizedEmail } from "./schemas";
import { emailContainsAny } from "./email";
import { generateJsonOrFallback } from "./model-lanes";
import { routeClassification } from "./routing";

const classifierSystemPrompt = `Classify creator inbox email into exactly one category:
sponsor_inquiry, client_lead, existing_client, newsletter_reply, personal, automated_noise, unknown.

Category boundary:
- sponsor_inquiry: brand partnership, sponsorship, dedicated video, integrated mention, media kit, creator pricing, product demo for a potential paid promotion.
- client_lead: consulting/coaching/software-services lead asking to hire Damian for implementation work.

If an email mentions both "partnership" and creator deliverables/pricing/media kit, choose sponsor_inquiry rather than client_lead.

Return JSON with category, confidence, and reason. Confidence must be calibrated:
- below 0.75 if unsure or ambiguous
- 0.75-0.85 if routeable but worth a warning
- above 0.85 only when the email clearly belongs to that category

Ground the reason in text from the email. Do not infer facts that are not present.`;

export async function classifyEmail(email: NormalizedEmail): Promise<EmailClassification> {
  const draft = await generateJsonOrFallback({
    system: classifierSystemPrompt,
    user: JSON.stringify(email, null, 2),
    schema: classificationSchema.omit({ routing: true }),
    modelEnv: "INBOX_CLASSIFIER_MODEL",
    fallback: () => deterministicClassification(email),
  });
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

export function deterministicClassification(email: NormalizedEmail): Omit<EmailClassification, "routing"> {
  if (
    emailContainsAny(email, [
      "partnership",
      "sponsor",
      "dedicated video",
      "integrated mention",
      "media kit",
      "pricing",
      "demo workspace",
    ])
  ) {
    return {
      category: "sponsor_inquiry",
      confidence: 0.92,
      reason:
        "The email asks about a partnership, dedicated videos/integrated mentions, pricing, availability, and a media kit.",
    };
  }

  if (emailContainsAny(email, ["unsubscribe", "no-reply", "do not reply"])) {
    return {
      category: "automated_noise",
      confidence: 0.9,
      reason: "The email contains automated/no-reply language.",
    };
  }

  return {
    category: "unknown",
    confidence: 0.55,
    reason: "The email does not contain enough clear signals for this demo classifier.",
  };
}
