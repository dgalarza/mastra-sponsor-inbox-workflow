import { createStep } from "@mastra/core/workflows";
import { extractSponsorDetails } from "../../lib/sponsor-details";
import { classifiedEmailSchema, sponsorDetailsSchema, sponsorIntentSchema, workflowStateSchema } from "../../lib/schemas";
import { sponsorDetailsScorer } from "../scorers/sponsor-details.scorer";

export const sponsorDetailsEnvelopeSchema = classifiedEmailSchema.extend({
  sponsorIntent: sponsorIntentSchema,
  sponsorDetails: sponsorDetailsSchema,
});

export const extractSponsorDetailsStep = createStep({
  id: "extract-sponsor-details",
  description: "Extract sponsor details while preserving what is unknown instead of inventing proof.",
  inputSchema: classifiedEmailSchema,
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

    return {
      ...inputData,
      sponsorIntent: {
        isSponsorInquiry: inputData.classification.category === "sponsor_inquiry",
        confidence: inputData.classification.confidence,
        reason: inputData.classification.reason,
      },
      sponsorDetails,
    };
  },
});
