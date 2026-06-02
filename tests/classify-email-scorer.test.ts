import { expect, test } from "bun:test";
import { devflowSponsorEmail } from "../src/fixtures/sponsor-email";
import { normalizeEmail } from "../src/lib/email";
import { classifyEmailScorer } from "../src/mastra/scorers/classify-email.scorer";

test("classifier scorer accepts grounded sponsor classification", async () => {
  const input = normalizeEmail(devflowSponsorEmail);
  const result = await classifyEmailScorer.run({
    input,
    output: {
      category: "sponsor_inquiry",
      confidence: 0.92,
      reason: "The email asks about a partnership with dedicated videos, integrated mentions, pricing, and a media kit.",
      routing: { action: "route_sponsor", warning: null },
    },
  });

  expect(result.score).toBe(1);
  expect(result.reason).toContain("passed all checks");
});

test("classifier scorer catches unsafe sponsor routing", async () => {
  const input = normalizeEmail(devflowSponsorEmail);
  const result = await classifyEmailScorer.run({
    input,
    output: {
      category: "client_lead",
      confidence: 0.93,
      reason: "The email asks about a partnership.",
      routing: { action: "review_required", warning: null },
    },
  });

  expect(result.score).toBeLessThan(1);
  expect(result.reason).toContain("category was not sponsor_inquiry");
});
