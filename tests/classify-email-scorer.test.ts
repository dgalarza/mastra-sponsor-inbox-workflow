import { expect, test } from "bun:test";
import { devflowSponsorEmail } from "../src/fixtures/sponsor-email";
import { normalizeEmail } from "../src/lib/email";
import { classifyEmailScorer } from "../src/mastra/scorers/classify-email.scorer";

const sponsorEmail = normalizeEmail(devflowSponsorEmail);

test("classifier scorer passes a clear sponsor inquiry", async () => {
  const result = await classifyEmailScorer.run({
    input: sponsorEmail,
    output: {
      category: "sponsor_inquiry",
      confidence: 0.92,
      reason: "The email asks about a partnership.",
      routing: { action: "route_sponsor", warning: null },
    },
  });

  expect(result.score).toBe(1);
  expect(result.reason).toContain("classified correctly");
});

test("classifier scorer fails when sponsor email is classified as something else", async () => {
  const result = await classifyEmailScorer.run({
    input: sponsorEmail,
    output: {
      category: "client_lead",
      confidence: 0.93,
      reason: "The email asks about a partnership.",
      routing: { action: "review_required", warning: null },
    },
  });

  expect(result.score).toBe(0);
  expect(result.reason).toContain("not classified as sponsor_inquiry");
});
