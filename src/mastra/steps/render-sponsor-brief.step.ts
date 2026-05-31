import { createStep } from "@mastra/core/workflows";
import { parentWorkflowOutputSchema, sponsorTriageBriefSchema } from "../../lib/schemas";
import { renderSponsorBrief } from "../../renderers/sponsor-brief";
import { draftedSponsorEnvelopeSchema } from "./draft-reply.step";

export const renderSponsorBriefStep = createStep({
  id: "render-sponsor-brief",
  description: "Render final JSON plus a Markdown dashboard that reads well in Mastra Studio.",
  inputSchema: draftedSponsorEnvelopeSchema,
  outputSchema: parentWorkflowOutputSchema,
  execute: async ({ inputData }) => {
    const briefWithoutMarkdown = {
      sponsorIntent: inputData.sponsorIntent,
      sponsorDetails: inputData.sponsorDetails,
      sponsorProvidedEvidence: inputData.sponsorProvidedEvidence,
      externalCorroboration: inputData.externalCorroboration,
      scores: inputData.scores,
      guardrailDecision: inputData.guardrailDecision,
      draftReply: inputData.draftReply,
    };
    const markdown = renderSponsorBrief(briefWithoutMarkdown);
    const sponsorBrief = sponsorTriageBriefSchema.parse({ ...briefWithoutMarkdown, markdown });

    return {
      normalizedEmail: inputData.normalizedEmail,
      classification: inputData.classification,
      status: "completed" as const,
      sponsorBrief,
      markdown,
    };
  },
});
