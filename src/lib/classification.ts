import { Agent } from "@mastra/core/agent";
import { classificationSchema, type EmailClassification, type NormalizedEmail } from "./schemas";
import { emailContainsAny } from "./email";
import { routeClassification } from "./routing";

type MastraModelConfig =
  | string
  | {
      providerId: string;
      modelId: string;
      url?: string;
      apiKey?: string;
    };

function classifierModel(): MastraModelConfig | null {
  const localBaseUrl = process.env.LOCAL_CLASSIFIER_BASE_URL ?? process.env.LOCAL_MODEL_BASE_URL;

  if (localBaseUrl) {
    return {
      providerId: "local-classifier",
      modelId: process.env.LOCAL_CLASSIFIER_MODEL ?? process.env.INBOX_CLASSIFIER_MODEL ?? "local-model",
      url: localBaseUrl,
      apiKey: process.env.LOCAL_CLASSIFIER_API_KEY ?? process.env.LOCAL_MODEL_API_KEY ?? "local",
    };
  }

  if (process.env.OPENAI_API_KEY) {
    return {
      providerId: "openai",
      modelId: process.env.INBOX_CLASSIFIER_MODEL ?? "gpt-4o-mini",
      url: process.env.OPENAI_BASE_URL ?? "https://api.openai.com/v1",
      apiKey: process.env.OPENAI_API_KEY,
    };
  }

  return null;
}

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

const model = classifierModel();
const emailClassifierAgent = model
  ? new Agent({
      id: "email-classifier-agent",
      name: "Email Classifier Agent",
      instructions: classifierSystemPrompt,
      model,
    })
  : null;

export async function classifyEmail(email: NormalizedEmail): Promise<EmailClassification> {
  const fallback = deterministicClassification(email);
  const draft = emailClassifierAgent ? await classifyWithAgent(email, fallback) : fallback;
  const reconciled = reconcileSponsorSignals(email, draft);

  return {
    ...reconciled,
    routing: routeClassification(reconciled.category, reconciled.confidence),
  };
}

async function classifyWithAgent(
  email: NormalizedEmail,
  fallback: Omit<EmailClassification, "routing">,
): Promise<Omit<EmailClassification, "routing">> {
  try {
    const response = await emailClassifierAgent?.generate(JSON.stringify(email, null, 2), {
      structuredOutput: {
        schema: classificationSchema.omit({ routing: true }),
        errorStrategy: "fallback",
        fallbackValue: fallback,
        jsonPromptInjection: true,
      },
    });

    return response?.object ? classificationSchema.omit({ routing: true }).parse(response.object) : fallback;
  } catch {
    return fallback;
  }
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
