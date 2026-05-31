import { createStep } from "@mastra/core/workflows";
import { normalizeEmail } from "../../lib/email";
import { normalizedEmailSchema, rawEmailInputSchema, workflowStateSchema } from "../../lib/schemas";

export const normalizeEmailStep = createStep({
  id: "normalize-email",
  description: "Parse raw email text into structured fields the rest of the workflow can trust.",
  inputSchema: rawEmailInputSchema,
  outputSchema: normalizedEmailSchema,
  stateSchema: workflowStateSchema.pick({ normalizedEmail: true }),
  execute: async ({ inputData, setState }) => {
    const normalizedEmail = normalizeEmail(inputData.rawEmail, {
      receivedAt: inputData.receivedAt,
      mailbox: inputData.mailbox,
    });
    await setState({ normalizedEmail });
    return normalizedEmail;
  },
});
