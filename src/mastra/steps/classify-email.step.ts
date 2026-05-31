import { createStep } from "@mastra/core/workflows";
import { classifyEmail } from "../../lib/classification";
import { classificationSchema, normalizedEmailSchema, workflowStateSchema } from "../../lib/schemas";
import { classifyEmailScorer } from "../scorers/classify-email.scorer";

export const classifyEmailStep = createStep({
  id: "classify-email",
  description: "Use the model lane for inbox judgment, then attach deterministic routing policy.",
  inputSchema: normalizedEmailSchema,
  outputSchema: classificationSchema,
  stateSchema: workflowStateSchema.pick({ classification: true }),
  scorers: {
    classifyEmail: {
      scorer: classifyEmailScorer,
      sampling: { type: "ratio", rate: 1 },
    },
  },
  execute: async (params: any) => {
    const { inputData, setState } = params;
    const classification = await classifyEmail(inputData);
    await setState({ classification });
    return classification;
  },
});
