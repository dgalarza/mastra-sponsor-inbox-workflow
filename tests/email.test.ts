import { expect, test } from "bun:test";
import { deterministicClassification, reconcileSponsorSignals } from "../src/lib/classification";
import { devflowSponsorEmail } from "../src/fixtures/sponsor-email";
import { normalizeEmail } from "../src/lib/email";
import { routeClassification } from "../src/lib/routing";

test("deterministic classifier routes clear sponsor inquiries", () => {
  const email = normalizeEmail(devflowSponsorEmail);
  const classification = deterministicClassification(email);
  const routing = routeClassification(classification.category, classification.confidence);

  expect(classification.category).toBe("sponsor_inquiry");
  expect(routing.action).toBe("route_sponsor");
});

test("sponsor signals override client lead drift from small local classifiers", () => {
  const email = normalizeEmail(devflowSponsorEmail);
  const reconciled = reconcileSponsorSignals(email, {
    category: "client_lead",
    confidence: 0.95,
    reason: "The email asks about a potential partnership and pricing, which looks like a prospective client intent.",
  });

  expect(reconciled.category).toBe("sponsor_inquiry");
  expect(routeClassification(reconciled.category, reconciled.confidence).action).toBe("route_sponsor");
});
