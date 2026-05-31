import type {
  ExternalCorroboration,
  GuardrailDecision,
  Recommendation,
  ScoreRubric,
  SponsorDetails,
  SponsorProvidedEvidence,
} from "./schemas";

export function scoreSponsorFit(
  details: SponsorDetails,
  providedEvidence: SponsorProvidedEvidence,
  external: ExternalCorroboration,
): ScoreRubric {
  const audienceRelevance = details.productCategory.toLowerCase().includes("ai") ? 5 : 3;
  const contentNaturalness = details.deliverables.some((item) => item.toLowerCase().includes("dedicated")) ? 5 : 4;
  const commercialClarity = details.budgetStatus === "provided" && details.timelineStatus === "provided" ? 4 : 2;
  const productCredibility = external.overallStrength === "moderate" || external.overallStrength === "strong" ? 3 : 2;
  const reputationSafety = external.overallStrength === "none" ? 3 : 4;
  const sponsorPageSeen = providedEvidence.extractionStatus === "success";

  return {
    audienceRelevance,
    productCredibility: sponsorPageSeen ? productCredibility : Math.min(productCredibility, 2),
    contentNaturalness,
    reputationSafety,
    commercialClarity,
    rationale:
      "Strong audience/content fit from the email, but commercial clarity and independent credibility remain limited until budget, timeline, proof, and corroboration are supplied.",
  };
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
