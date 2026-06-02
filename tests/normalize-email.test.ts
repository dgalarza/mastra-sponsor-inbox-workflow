import { describe, expect, test } from "bun:test";
import { devflowSponsorEmail } from "../src/fixtures/sponsor-email";
import { normalizeEmail } from "../src/lib/email";

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

  test("handles a collapsed one-line pasted email", () => {
    const rawEmail = devflowSponsorEmail.replace(/\n+/g, "  ");
    const email = normalizeEmail(rawEmail, { mailbox: "damian@damiangalarza.com" });

    expect(email.senderName).toBe("Maya Chen");
    expect(email.senderEmail).toBe("maya@devflowai.dev");
    expect(email.subject).toBe("Partnership with DevFlow AI?");
    expect(email.body).toContain("Hi Damian");
    expect(email.links).toEqual(["https://devflow-blueprint.lovable.app/"]);
    expect(email.metadata).toEqual({ mailbox: "damian@damiangalarza.com" });
  });

  test("falls back safely when common headers are missing", () => {
    const email = normalizeEmail("From: no-reply@example.com\n\nBody only");

    expect(email.senderName).toBeNull();
    expect(email.senderEmail).toBe("no-reply@example.com");
    expect(email.subject).toBe("(no subject)");
    expect(email.body).toBe("Body only");
  });
});
