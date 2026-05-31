import { createStep } from "@mastra/core/workflows";
import { extractSponsorDetails } from "../../lib/sponsor-details";
import { sponsorDetailsSchema, workflowStateSchema } from "../../lib/schemas";
import { sponsorDetailsScorer } from "../scorers/sponsor-details.scorer";
import { sponsorIntentEnvelopeSchema } from "./verify-sponsor-intent.step";

export const sponsorDetailsEnvelopeSchema = sponsorIntentEnvelopeSchema.extend({
  sponsorDetails: sponsorDetailsSchema,
});

export const extractSponsorDetailsStep = createStep({
  id: "extract-sponsor-details",
  description: "Extract sponsor details while preserving what is unknown instead of inventing proof.",
  inputSchema: sponsorIntentEnvelopeSchema,
  outputSchema: sponsorDetailsEnvelopeSchema,
  stateSchema: workflowStateSchema.pick({ sponsorDetails: true }),
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
    return { ...inputData, sponsorDetails };
  },
});
