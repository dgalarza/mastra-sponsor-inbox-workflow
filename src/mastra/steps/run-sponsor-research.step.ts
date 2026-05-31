import { createStep } from "@mastra/core/workflows";
import { applySponsorGuardrails, scoreSponsorFit } from "../../lib/scoring";
import { draftSponsorReply } from "../../lib/reply-policy";
import { parentWorkflowOutputSchema, sponsorTriageBriefSchema, workflowStateSchema } from "../../lib/schemas";
import { extractSponsorDetails } from "../../lib/sponsor-details";
import { extractSponsorProvidedClaims, searchExternalCorroboration } from "../../lib/tavily";
import { renderSponsorBrief } from "../../renderers/sponsor-brief";
import { sponsorDetailsScorer } from "../scorers/sponsor-details.scorer";
import { sponsorIntentEnvelopeSchema } from "./verify-sponsor-intent.step";

export const runSponsorResearchStep = createStep({
  id: "run-sponsor-research",
  description: "Run the sponsor research sequence after explicit sponsor intent has been verified.",
  inputSchema: sponsorIntentEnvelopeSchema,
  outputSchema: parentWorkflowOutputSchema,
  stateSchema: workflowStateSchema.pick({ sponsorDetails: true, externalCorroboration: true }),
  scorers: {
    sponsorDetails: {
      scorer: sponsorDetailsScorer,
      sampling: { type: "ratio", rate: 1 },
    },
  },
  execute: async (params: any) => {
    const { inputData, setState } = params;
    const sponsorDetails = await extractSponsorDetails(inputData.normalizedEmail);
    await setState({ sponsorDetails });

    const sponsorProvidedEvidence = await extractSponsorProvidedClaims(sponsorDetails.url);
    const externalCorroboration = await searchExternalCorroboration(sponsorDetails.brand);
    await setState({ externalCorroboration });

    const scores = scoreSponsorFit(sponsorDetails, sponsorProvidedEvidence, externalCorroboration);
    const guardrailDecision = applySponsorGuardrails(scores, sponsorDetails, externalCorroboration);
    const draftReply = draftSponsorReply(sponsorDetails, guardrailDecision);

    const briefWithoutMarkdown = {
      sponsorIntent: inputData.sponsorIntent,
      sponsorDetails,
      sponsorProvidedEvidence,
      externalCorroboration,
      scores,
      guardrailDecision,
      draftReply,
    };
    const markdown = renderSponsorBrief(briefWithoutMarkdown);
    const sponsorBrief = sponsorTriageBriefSchema.parse({ ...briefWithoutMarkdown, markdown });

    return parentWorkflowOutputSchema.parse({
      normalizedEmail: inputData.normalizedEmail,
      classification: inputData.classification,
      status: "completed",
      sponsorBrief,
      markdown,
    });
  },
});
