import { createScorer } from "@mastra/core/evals";
import { classificationSchema, normalizedEmailSchema } from "../../lib/schemas";

function hasSponsorLanguage(email: { subject: string; body: string }) {
  const text = `${email.subject} ${email.body}`.toLowerCase();
  return ["partnership", "sponsor", "dedicated videos", "integrated mentions", "media kit"].some((signal) =>
    text.includes(signal),
  );
}

export const classifyEmailScorer = createScorer({
  id: "classify-email-scorer",
  name: "Sponsor Classification Check",
  description: "Checks whether clear sponsor inquiries are classified as sponsor_inquiry.",
  type: {
    input: normalizedEmailSchema,
    output: classificationSchema,
  },
})
  .preprocess(({ run }) => ({
    input: normalizedEmailSchema.safeParse(run.input),
    output: classificationSchema.safeParse(run.output),
  }))
  .generateScore(({ results }) => {
    const { input, output } = results.preprocessStepResult as {
      input: ReturnType<typeof normalizedEmailSchema.safeParse>;
      output: ReturnType<typeof classificationSchema.safeParse>;
    };

    if (!input.success || !output.success) return 0;
    if (!hasSponsorLanguage(input.data)) return 1;

    return output.data.category === "sponsor_inquiry" ? 1 : 0;
  })
  .generateReason(({ score }) =>
    score === 1
      ? "Clear sponsor inquiry was classified correctly."
      : "Clear sponsor inquiry was not classified as sponsor_inquiry.",
  );
