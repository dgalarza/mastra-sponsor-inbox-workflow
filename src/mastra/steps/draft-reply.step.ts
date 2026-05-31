import { createStep } from "@mastra/core/workflows";
import { z } from "zod";
import { draftSponsorReply } from "../../lib/reply-policy";
import { guardedSponsorEnvelopeSchema } from "./apply-guardrails.step";

export const draftedSponsorEnvelopeSchema = guardedSponsorEnvelopeSchema.extend({
  draftReply: z.string(),
});

export const draftSponsorReplyStep = createStep({
  id: "draft-sponsor-reply",
  description: "Draft a policy-safe reply that asks for missing details without committing to rates.",
  inputSchema: guardedSponsorEnvelopeSchema,
  outputSchema: draftedSponsorEnvelopeSchema,
  execute: async ({ inputData }) => ({
    ...inputData,
    draftReply: draftSponsorReply(inputData.sponsorDetails, inputData.guardrailDecision),
  }),
});
