import { describe, expect, test } from "bun:test";
import { applySponsorGuardrails } from "../src/lib/scoring";
import type { ExternalCorroboration, ScoreRubric, SponsorDetails } from "../src/lib/schemas";

const scores: ScoreRubric = {
  audienceRelevance: 5,
  productCredibility: 4,
  contentNaturalness: 5,
  reputationSafety: 4,
  commercialClarity: 4,
  rationale: "fixture",
};

const details: SponsorDetails = {
  brand: "DevFlow AI",
  sender: { name: "Maya Chen", email: "maya@devflowai.dev", role: "Partnerships Lead" },
  productCategory: "AI engineering workflow platform",
  sponsorIntent: "Explore partnership",
  deliverables: ["dedicated videos", "integrated mentions"],
  budgetStatus: "provided",
  timelineStatus: "provided",
  demoAccess: "offered",
  url: "https://devflow-blueprint.lovable.app/",
  notableClaims: [],
  missingInformation: [],
};

test("weak external corroboration blocks pursue", () => {
  const external: ExternalCorroboration = {
    searchStatus: "success",
    queries: [],
    evidence: [],
    overallStrength: "weak",
  };

  const decision = applySponsorGuardrails(scores, details, external);

  expect(decision.recommendation).toBe("needs_review");
  expect(decision.blockedFromPursue).toBe(true);
});

test("strong evidence and commercial clarity can pursue", () => {
  const external: ExternalCorroboration = {
    searchStatus: "success",
    queries: [],
    evidence: [],
    overallStrength: "strong",
  };

  const decision = applySponsorGuardrails(scores, details, external);

  expect(decision.recommendation).toBe("pursue");
  expect(decision.blockedFromPursue).toBe(false);
});
