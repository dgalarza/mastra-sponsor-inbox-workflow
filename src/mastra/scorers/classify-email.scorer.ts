import { createScorer } from "@mastra/core/evals";
import { classificationSchema, normalizedEmailSchema } from "../../lib/schemas";
import { routeClassification } from "../../lib/routing";

type Analysis = {
  categoryCorrect: boolean;
  confidenceCalibrated: boolean;
  reasonGrounded: boolean;
  routingSafe: boolean;
  issues: string[];
};

function parseRun(run: { input?: unknown; output?: unknown }) {
  const input = normalizedEmailSchema.safeParse(run.input);
  const output = classificationSchema.safeParse(run.output);
  return { input: input.success ? input.data : null, output: output.success ? output.data : null };
}

export const classifyEmailScorer = createScorer({
  id: "classify-email-scorer",
  name: "Classify Email Quality",
  description: "Checks sponsor category correctness, confidence calibration, grounded reason, and routing safety.",
  type: {
    input: normalizedEmailSchema,
    output: classificationSchema,
  },
})
  .preprocess(({ run }) => parseRun(run))
  .analyze(({ results }): Analysis => {
    const data = results.preprocessStepResult as ReturnType<typeof parseRun>;
    const issues: string[] = [];

    if (!data.input || !data.output) {
      return {
        categoryCorrect: false,
        confidenceCalibrated: false,
        reasonGrounded: false,
        routingSafe: false,
        issues: ["Step input or output did not match expected schemas."],
      };
    }

    const emailText = `${data.input.subject}\n${data.input.body}`.toLowerCase();
    const hasSponsorSignals =
      emailText.includes("partnership") ||
      emailText.includes("dedicated videos") ||
      emailText.includes("integrated mentions") ||
      emailText.includes("media kit");
    const categoryCorrect = hasSponsorSignals ? data.output.category === "sponsor_inquiry" : true;
    if (!categoryCorrect) issues.push("Sponsor signals were present but category was not sponsor_inquiry.");

    const confidenceCalibrated =
      data.output.category === "unknown" ? data.output.confidence < 0.75 : data.output.confidence >= 0.75;
    if (!confidenceCalibrated) issues.push("Confidence did not match routing policy bands.");

    const reasonGrounded = data.output.reason
      .toLowerCase()
      .split(/\W+/)
      .filter((word) => word.length > 5)
      .some((word) => emailText.includes(word));
    if (!reasonGrounded) issues.push("Reason does not appear grounded in email text.");

    const expectedRouting = routeClassification(data.output.category, data.output.confidence);
    const routingSafe = expectedRouting.action === data.output.routing.action;
    if (!routingSafe) issues.push("Routing action did not match deterministic routing policy.");

    return { categoryCorrect, confidenceCalibrated, reasonGrounded, routingSafe, issues };
  })
  .generateScore(({ results }) => {
    const analysis = results.analyzeStepResult as Analysis;
    const checks = [analysis.categoryCorrect, analysis.confidenceCalibrated, analysis.reasonGrounded, analysis.routingSafe];
    return checks.filter(Boolean).length / checks.length;
  })
  .generateReason(({ results, score }) => {
    const analysis = results.analyzeStepResult as Analysis;
    return analysis.issues.length === 0
      ? `Score ${score.toFixed(2)}. Classification and routing passed all checks.`
      : `Score ${score.toFixed(2)}. Issues: ${analysis.issues.join(" ")}`;
  });
