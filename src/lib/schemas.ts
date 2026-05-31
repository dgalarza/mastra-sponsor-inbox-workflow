import { z } from "zod";

export const inboxCategorySchema = z.enum([
  "sponsor_inquiry",
  "client_lead",
  "existing_client",
  "newsletter_reply",
  "personal",
  "automated_noise",
  "unknown",
]);

export type InboxCategory = z.infer<typeof inboxCategorySchema>;

export const recommendationSchema = z.enum(["pursue", "needs_review", "decline"]);
export type Recommendation = z.infer<typeof recommendationSchema>;

export const rawEmailInputSchema = z.object({
  rawEmail: z.string().min(1),
  receivedAt: z.string().optional(),
  mailbox: z.string().optional(),
});

export const normalizedEmailSchema = z.object({
  senderName: z.string().nullable(),
  senderEmail: z.string().nullable(),
  subject: z.string(),
  body: z.string(),
  links: z.array(z.string().url()),
  metadata: z.object({
    receivedAt: z.string().optional(),
    mailbox: z.string().optional(),
  }),
});

export type NormalizedEmail = z.infer<typeof normalizedEmailSchema>;

export const classificationSchema = z.object({
  category: inboxCategorySchema,
  confidence: z.number().min(0).max(1),
  reason: z.string(),
  routing: z.object({
    action: z.enum(["route_sponsor", "review_required", "ignore"]),
    warning: z.string().nullable(),
  }),
});

export type EmailClassification = z.infer<typeof classificationSchema>;

export const classifiedEmailSchema = z.object({
  normalizedEmail: normalizedEmailSchema,
  classification: classificationSchema,
});

export type ClassifiedEmail = z.infer<typeof classifiedEmailSchema>;

export const sponsorIntentSchema = z.object({
  isSponsorInquiry: z.boolean(),
  confidence: z.number().min(0).max(1),
  reason: z.string(),
});

export const sponsorDetailsSchema = z.object({
  brand: z.string(),
  sender: z.object({
    name: z.string().nullable(),
    email: z.string().nullable(),
    role: z.string().nullable(),
  }),
  productCategory: z.string(),
  sponsorIntent: z.string(),
  deliverables: z.array(z.string()),
  budgetStatus: z.enum(["provided", "not_provided", "unclear"]),
  timelineStatus: z.enum(["provided", "not_provided", "unclear"]),
  demoAccess: z.enum(["offered", "not_offered", "unclear"]),
  url: z.string().url().nullable(),
  notableClaims: z.array(z.string()),
  missingInformation: z.array(z.string()),
});

export type SponsorDetails = z.infer<typeof sponsorDetailsSchema>;

export const evidenceItemSchema = z.object({
  sourceUrl: z.string(),
  summary: z.string(),
  strength: z.enum(["strong", "moderate", "weak", "none"]),
  notes: z.string().optional(),
});

export type EvidenceItem = z.infer<typeof evidenceItemSchema>;

export const sponsorProvidedEvidenceSchema = z.object({
  extractionStatus: z.enum(["success", "skipped_missing_api_key", "failed"]),
  evidence: z.array(evidenceItemSchema),
});

export type SponsorProvidedEvidence = z.infer<typeof sponsorProvidedEvidenceSchema>;

export const externalCorroborationSchema = z.object({
  searchStatus: z.enum(["success", "skipped_missing_api_key", "failed"]),
  queries: z.array(z.string()),
  evidence: z.array(evidenceItemSchema),
  overallStrength: z.enum(["strong", "moderate", "weak", "none"]),
});

export type ExternalCorroboration = z.infer<typeof externalCorroborationSchema>;

export const scoreRubricSchema = z.object({
  audienceRelevance: z.number().int().min(1).max(5),
  productCredibility: z.number().int().min(1).max(5),
  contentNaturalness: z.number().int().min(1).max(5),
  reputationSafety: z.number().int().min(1).max(5),
  commercialClarity: z.number().int().min(1).max(5),
  rationale: z.string(),
});

export type ScoreRubric = z.infer<typeof scoreRubricSchema>;

export const guardrailDecisionSchema = z.object({
  recommendation: recommendationSchema,
  reasons: z.array(z.string()),
  blockedFromPursue: z.boolean(),
});

export type GuardrailDecision = z.infer<typeof guardrailDecisionSchema>;

export const sponsorTriageBriefSchema = z.object({
  sponsorIntent: sponsorIntentSchema,
  sponsorDetails: sponsorDetailsSchema,
  sponsorProvidedEvidence: sponsorProvidedEvidenceSchema,
  externalCorroboration: externalCorroborationSchema,
  scores: scoreRubricSchema,
  guardrailDecision: guardrailDecisionSchema,
  draftReply: z.string(),
  markdown: z.string(),
});

export type SponsorTriageBrief = z.infer<typeof sponsorTriageBriefSchema>;

export const parentWorkflowOutputSchema = z.object({
  normalizedEmail: normalizedEmailSchema,
  classification: classificationSchema,
  status: z.enum(["completed", "review_required", "ignored"]),
  sponsorBrief: sponsorTriageBriefSchema.nullable(),
  markdown: z.string(),
});

export type ParentWorkflowOutput = z.infer<typeof parentWorkflowOutputSchema>;

export const workflowStateSchema = z.object({
  normalizedEmail: normalizedEmailSchema.nullable(),
  classification: classificationSchema.nullable(),
  sponsorDetails: sponsorDetailsSchema.nullable(),
  externalCorroboration: externalCorroborationSchema.nullable(),
});
