import { expect, test } from "bun:test";
import { devflowSponsorEmail } from "../src/fixtures/sponsor-email";
import { normalizeEmail } from "../src/lib/email";
import type { ClassifiedEmail } from "../src/lib/schemas";
import { sponsorDetailsScorer } from "../src/mastra/scorers/sponsor-details.scorer";
import { sponsorTriageWorkflow } from "../src/mastra/workflows/sponsor-triage.workflow";

process.env.TAVILY_API_KEY = "";

function classifiedEmailFrom(rawEmail: string, reason = "fixture"): ClassifiedEmail {
  return {
    normalizedEmail: normalizeEmail(rawEmail),
    classification: {
      category: "sponsor_inquiry",
      confidence: 0.92,
      reason,
      routing: { action: "route_sponsor", warning: null },
    },
  };
}

test("sponsor workflow exposes the sponsor research sequence as workflow steps", async () => {
  const run = await sponsorTriageWorkflow.createRun({ disableScorers: true });
  const result = await run.start({
    inputData: classifiedEmailFrom(devflowSponsorEmail),
    initialState: {
      normalizedEmail: null,
      classification: null,
      sponsorDetails: null,
      externalCorroboration: null,
    },
  });

  if (result.status !== "success") throw new Error("Workflow failed before producing a sponsor brief.");

  expect(result.result.status).toBe("completed");
  expect(result.result.sponsorBrief?.guardrailDecision.recommendation).toBe("needs_review");
  expect(Object.keys(result.steps)).toContain("extract-sponsor-details");
  expect(Object.keys(result.steps)).toContain("tavily-search-corroboration");
  expect(Object.keys(result.steps)).toContain("render-sponsor-brief");
}, 15_000);

test("sponsor detail scorer accepts real step envelope telemetry", async () => {
  const input = classifiedEmailFrom(devflowSponsorEmail);
  const output = {
    ...input,
    sponsorDetails: {
      brand: "DevFlow AI",
      sender: { name: "Maya Chen", email: "maya@devflowai.dev", role: "Partnerships Lead" },
      productCategory: "AI engineering workflow platform",
      sponsorIntent: "Explore partnership",
      deliverables: ["dedicated videos", "integrated mentions"],
      budgetStatus: "not_provided" as const,
      timelineStatus: "not_provided" as const,
      demoAccess: "offered" as const,
      url: "https://devflow-blueprint.lovable.app/",
      notableClaims: ["Turns specs into implementation plans."],
      missingInformation: ["Budget range"],
    },
  };

  const result = await sponsorDetailsScorer.run({ input, output });

  expect(result.score).toBe(1);
  expect(result.reason).toContain("Sponsor extraction is complete");
});

test("sponsor detail scorer catches invented commercial proof in envelope output", async () => {
  const input = classifiedEmailFrom(devflowSponsorEmail);
  const output = {
    ...input,
    sponsorDetails: {
      brand: "DevFlow AI",
      sender: { name: "Maya Chen", email: "maya@devflowai.dev", role: "Partnerships Lead" },
      productCategory: "AI engineering workflow platform",
      sponsorIntent: "Explore partnership",
      deliverables: ["dedicated videos", "integrated mentions"],
      budgetStatus: "provided" as const,
      timelineStatus: "not_provided" as const,
      demoAccess: "offered" as const,
      url: "https://devflow-blueprint.lovable.app/",
      notableClaims: ["SOC 2 certified with several enterprise customer case studies."],
      missingInformation: ["Campaign timeline"],
    },
  };

  const result = await sponsorDetailsScorer.run({ input, output });

  expect(result.score).toBeLessThan(1);
  expect(result.reason).toContain("invented budget");
});
