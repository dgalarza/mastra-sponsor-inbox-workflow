import { describe, expect, test } from "bun:test";
import { deterministicClassification, reconcileSponsorSignals } from "../src/lib/classification";
import { devflowSponsorEmail } from "../src/fixtures/sponsor-email";
import { normalizeEmail } from "../src/lib/email";
import { routeClassification } from "../src/lib/routing";

describe("normalizeEmail", () => {
  test("normalizes the synthetic sponsor email", () => {
    const email = normalizeEmail(devflowSponsorEmail);

    expect(email.senderName).toBe("Maya Chen");
    expect(email.senderEmail).toBe("maya@devflowai.dev");
    expect(email.subject).toBe("Partnership with DevFlow AI?");
    expect(email.links).toEqual(["https://devflow-blueprint.lovable.app/"]);
  });

  test("parses headers, body, links, and metadata without an LLM", () => {
    const rawEmail = [
      "From: Alex Rivera <alex@example.com>",
      "To: Damian Galarza <damian@example.com>",
      "Subject: Quick partnership idea",
      "",
      "Hi Damian,",
      "",
      "Could you look at https://example.com/demo, and https://example.com/demo?",
      "The trailing punctuation should not become part of the link.",
    ].join("\r\n");

    const email = normalizeEmail(rawEmail, { mailbox: "sponsors@example.com", receivedAt: "2026-06-01T12:00:00Z" });

    expect(email).toEqual({
      senderName: "Alex Rivera",
      senderEmail: "alex@example.com",
      subject: "Quick partnership idea",
      body: [
        "Hi Damian,",
        "",
        "Could you look at https://example.com/demo, and https://example.com/demo?",
        "The trailing punctuation should not become part of the link.",
      ].join("\n"),
      links: ["https://example.com/demo"],
      metadata: { mailbox: "sponsors@example.com", receivedAt: "2026-06-01T12:00:00Z" },
    });
  });

  test("falls back safely when common headers are missing", () => {
    const email = normalizeEmail("From: no-reply@example.com\n\nBody only");

    expect(email.senderName).toBeNull();
    expect(email.senderEmail).toBe("no-reply@example.com");
    expect(email.subject).toBe("(no subject)");
    expect(email.body).toBe("Body only");
  });
});

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
