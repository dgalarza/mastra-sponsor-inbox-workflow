import { expect, test } from "bun:test";
import { draftSponsorReply } from "../src/lib/reply-policy";
import { renderSponsorBrief } from "../src/renderers/sponsor-brief";

test("renders recommendation and draft reply sections", () => {
  const markdown = renderSponsorBrief({
    sponsorIntent: { isSponsorInquiry: true, confidence: 0.94, reason: "grounded" },
    sponsorDetails: {
      brand: "DevFlow AI",
      sender: { name: "Maya Chen", email: "maya@devflowai.dev", role: "Partnerships Lead" },
      productCategory: "AI engineering workflow platform",
      sponsorIntent: "Explore partnership",
      deliverables: ["dedicated videos", "integrated mentions"],
      budgetStatus: "not_provided",
      timelineStatus: "not_provided",
      demoAccess: "offered",
      url: "https://devflow-blueprint.lovable.app/",
      notableClaims: ["Turns specs into implementation plans."],
      missingInformation: ["Budget range"],
    },
    sponsorProvidedEvidence: { extractionStatus: "skipped_missing_api_key", evidence: [] },
    externalCorroboration: { searchStatus: "skipped_missing_api_key", queries: [], evidence: [], overallStrength: "none" },
    scores: {
      audienceRelevance: 5,
      productCredibility: 2,
      contentNaturalness: 5,
      reputationSafety: 3,
      commercialClarity: 2,
      rationale: "fixture",
    },
    guardrailDecision: {
      recommendation: "needs_review",
      reasons: ["External corroboration is weak."],
      blockedFromPursue: true,
    },
    draftReply: "Hi Maya,\n\nCould you send budget and proof?",
  });

  expect(markdown).toContain("Sponsor Triage Brief: DevFlow AI");
  expect(markdown).toContain("**needs_review**");
  expect(markdown).toContain("## Draft Reply");
});


test("draft reply does not expose internal workflow notes", () => {
  const draft = draftSponsorReply(
    {
      brand: "DevFlow AI",
      sender: { name: "Maya Chen", email: "maya@devflowai.dev", role: "Partnerships Lead" },
      productCategory: "AI engineering workflow platform",
      sponsorIntent: "Explore partnership",
      deliverables: ["dedicated videos", "integrated mentions"],
      budgetStatus: "not_provided",
      timelineStatus: "not_provided",
      demoAccess: "offered",
      url: "https://devflow-blueprint.lovable.app/",
      notableClaims: [],
      missingInformation: [],
    },
    { recommendation: "needs_review", reasons: [], blockedFromPursue: true },
  );

  expect(draft).not.toContain("Internal note:");
  expect(draft).not.toContain("current workflow recommendation");
});
