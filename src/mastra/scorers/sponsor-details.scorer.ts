import { createScorer } from "@mastra/core/evals";
import { classifiedEmailSchema, sponsorDetailsSchema, type NormalizedEmail, type SponsorDetails } from "../../lib/schemas";

export const sponsorDetailsScorerOutputSchema = classifiedEmailSchema.extend({
  sponsorDetails: sponsorDetailsSchema,
});

type Analysis = {
  complete: boolean;
  grounded: boolean;
  noInventedCommercialProof: boolean;
  issues: string[];
};

export function parseSponsorDetailsScorerRun(run: { input?: unknown; output?: unknown }): {
  input: NormalizedEmail | null;
  output: SponsorDetails | null;
} {
  const input = classifiedEmailSchema.safeParse(run.input);
  const output = sponsorDetailsScorerOutputSchema.safeParse(run.output);
  return {
    input: input.success ? input.data.normalizedEmail : null,
    output: output.success ? output.data.sponsorDetails : null,
  };
}

export const sponsorDetailsScorer = createScorer({
  id: "sponsor-details-scorer",
  name: "Sponsor Details Groundedness",
  description: "Checks extraction completeness and catches invented budget, customers, case studies, or proof.",
  type: {
    input: classifiedEmailSchema,
    output: sponsorDetailsScorerOutputSchema,
  },
})
  .preprocess(({ run }) => parseSponsorDetailsScorerRun(run))
  .analyze(({ results }): Analysis => {
    const data = results.preprocessStepResult as ReturnType<typeof parseSponsorDetailsScorerRun>;
    const issues: string[] = [];

    if (!data.input || !data.output) {
      return {
        complete: false,
        grounded: false,
        noInventedCommercialProof: false,
        issues: ["Step input or output did not match expected schemas."],
      };
    }

    const text = `${data.input.subject}\n${data.input.body}`.toLowerCase();
    const complete = Boolean(data.output.brand && data.output.sender.email && data.output.productCategory && data.output.url);
    if (!complete) issues.push("Important sponsor details are missing.");

    const grounded =
      text.includes(data.output.brand.toLowerCase()) &&
      data.output.deliverables.every((deliverable) => text.includes(deliverable.toLowerCase()));
    if (!grounded) issues.push("Brand or deliverables were not grounded in the email.");

    const budgetMentioned = /budget|pricing|\$\d|\d+\s?(k|usd)/i.test(text);
    const noInventedBudget = data.output.budgetStatus !== "provided" || budgetMentioned;
    const noInventedProof = data.output.notableClaims.every(
      (claim) => !/customer|case stud|funding|soc ?2|iso ?27001/i.test(claim),
    );
    const noInventedCommercialProof = noInventedBudget && noInventedProof;
    if (!noInventedCommercialProof) {
      issues.push("Extractor invented budget, customer proof, case studies, funding, or compliance evidence.");
    }

    return { complete, grounded, noInventedCommercialProof, issues };
  })
  .generateScore(({ results }) => {
    const analysis = results.analyzeStepResult as Analysis;
    const checks = [analysis.complete, analysis.grounded, analysis.noInventedCommercialProof];
    return checks.filter(Boolean).length / checks.length;
  })
  .generateReason(({ results, score }) => {
    const analysis = results.analyzeStepResult as Analysis;
    return analysis.issues.length === 0
      ? `Score ${score.toFixed(2)}. Sponsor extraction is complete, grounded, and avoids invented proof.`
      : `Score ${score.toFixed(2)}. Issues: ${analysis.issues.join(" ")}`;
  });
