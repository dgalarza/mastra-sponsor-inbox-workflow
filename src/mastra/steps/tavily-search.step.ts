import { createStep } from "@mastra/core/workflows";
import { searchExternalCorroboration } from "../../lib/tavily";
import { externalCorroborationSchema, workflowStateSchema } from "../../lib/schemas";
import { sponsorProvidedEvidenceEnvelopeSchema } from "./tavily-extract.step";

export const corroborationEnvelopeSchema = sponsorProvidedEvidenceEnvelopeSchema.extend({
  externalCorroboration: externalCorroborationSchema,
});

export const tavilySearchCorroborationStep = createStep({
  id: "tavily-search-corroboration",
  description: "Search independent sources for corroboration of the sponsor's claims.",
  inputSchema: sponsorProvidedEvidenceEnvelopeSchema,
  outputSchema: corroborationEnvelopeSchema,
  stateSchema: workflowStateSchema.pick({ externalCorroboration: true }),
  execute: async ({ inputData, setState }) => {
    const externalCorroboration = await searchExternalCorroboration(inputData.sponsorDetails.brand);
    await setState({ externalCorroboration });
    return { ...inputData, externalCorroboration };
  },
});
