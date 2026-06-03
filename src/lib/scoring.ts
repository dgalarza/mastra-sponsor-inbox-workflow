import { Agent } from "@mastra/core/agent";
import { getExtractorModel } from "./model-lanes";
import type {
  ExternalCorroboration,
  GuardrailDecision,
  Recommendation,
  ScoreRubric,
  SponsorDetails,
  SponsorProvidedEvidence,
} from "./schemas";
import { scoreRubricSchema } from "./schemas";

const sponsorFitScorerAgent = new Agent({
  id: "sponsor-fit-scorer-agent",
  name: "Sponsor Fit Scorer",
  instructions: `Score a sponsor opportunity for a creator using the provided email extraction and research evidence.

Return scores from 1 to 5 for:
- audienceRelevance
- productCredibility
- contentNaturalness
- reputationSafety
- commercialClarity

Scoring rules:
- Ground every score in the supplied data only.
- Use lower scores when research is missing, weak, contradictory, or failed.
- Do not treat sponsor-provided claims as independent proof.
- commercialClarity should stay low when budget, timeline, or deliverables are vague or missing.
- productCredibility and reputationSafety should reflect the external corroboration strength and any warning signs in the evidence.
- rationale should briefly explain the strongest positives, the biggest gaps, and any uncertainty that should drive human review.`,
  model: getExtractorModel(),
});

export async function scoreSponsorFit(
  details: SponsorDetails,
  providedEvidence: SponsorProvidedEvidence,
  external: ExternalCorroboration,
): Promise<ScoreRubric> {
  const response = await sponsorFitScorerAgent.generate(
    JSON.stringify(
      {
        sponsorDetails: details,
        sponsorProvidedEvidence: providedEvidence,
        externalCorroboration: external,
      },
      null,
      2,
    ),
    {
      structuredOutput: {
        schema: scoreRubricSchema,
        jsonPromptInjection: true,
      },
    },
  );

  return scoreRubricSchema.parse(response.object);
}

export function applySponsorGuardrails(scores: ScoreRubric, details: SponsorDetails, external: ExternalCorroboration): GuardrailDecision {
  const reasons: string[] = [];
  const externalWeak = external.overallStrength === "weak" || external.overallStrength === "none";
  const commercialIncomplete = details.budgetStatus !== "provided" || details.timelineStatus !== "provided";
  const average =
    (scores.audienceRelevance +
      scores.productCredibility +
      scores.contentNaturalness +
      scores.reputationSafety +
      scores.commercialClarity) /
    5;

  if (externalWeak) {
    reasons.push("External corroboration is weak, so deterministic policy blocks an automatic pursue recommendation.");
  }

  if (commercialIncomplete) {
    reasons.push("Commercial details are incomplete: budget and/or timeline were not provided.");
  }

  if (scores.audienceRelevance >= 4 && scores.contentNaturalness >= 4) {
    reasons.push("Audience relevance and content naturalness are strong enough to continue discovery.");
  }

  let recommendation: Recommendation = "needs_review";
  if (!externalWeak && !commercialIncomplete && average >= 4) {
    recommendation = "pursue";
  } else if (scores.audienceRelevance <= 2 || scores.reputationSafety <= 2) {
    recommendation = "decline";
  }

  return {
    recommendation: externalWeak && recommendation === "pursue" ? "needs_review" : recommendation,
    reasons,
    blockedFromPursue: externalWeak,
  };
}
