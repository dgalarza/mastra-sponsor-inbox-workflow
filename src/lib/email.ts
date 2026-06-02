import type { NormalizedEmail } from "./schemas";

const linkPattern = /https?:\/\/[^\s<>)"]+/g;
const collapsedHeaderPattern = /\b(from|to|cc|bcc|subject|date):\s*/gi;

type ParsedEmail = {
  headers: Map<string, string>;
  body: string;
};

function parseStandardEmail(rawEmail: string): ParsedEmail {
  const lines = rawEmail.replace(/\r\n/g, "\n").split("\n");
  const headerLines: string[] = [];
  const bodyLines: string[] = [];
  let inHeaders = true;

  for (const line of lines) {
    if (inHeaders && line.trim() === "") {
      inHeaders = false;
      continue;
    }

    if (inHeaders) {
      headerLines.push(line);
    } else {
      bodyLines.push(line);
    }
  }

  const headers = new Map<string, string>();
  for (const line of headerLines) {
    const separator = line.indexOf(":");
    if (separator === -1) continue;
    headers.set(line.slice(0, separator).trim().toLowerCase(), line.slice(separator + 1).trim());
  }

  return { headers, body: bodyLines.join("\n").trim() };
}

function splitCollapsedSubject(value: string) {
  const punctuationBoundary = value.match(/^(.*?[.!?])\s{2,}(.+)$/s);
  if (punctuationBoundary) {
    return { subject: punctuationBoundary[1].trim(), body: punctuationBoundary[2].trim() };
  }

  const doubleSpaceBoundary = value.match(/^(.*?)\s{2,}(.+)$/s);
  if (doubleSpaceBoundary) {
    return { subject: doubleSpaceBoundary[1].trim(), body: doubleSpaceBoundary[2].trim() };
  }

  return { subject: value.trim(), body: "" };
}

function parseCollapsedEmail(rawEmail: string): ParsedEmail {
  const compact = rawEmail.replace(/\r?\n/g, " ").trim();
  const matches = Array.from(compact.matchAll(collapsedHeaderPattern));
  const headers = new Map<string, string>();
  let body = "";

  for (let index = 0; index < matches.length; index += 1) {
    const match = matches[index];
    const key = match[1].toLowerCase();
    const valueStart = (match.index ?? 0) + match[0].length;
    const valueEnd = matches[index + 1]?.index ?? compact.length;
    const value = compact.slice(valueStart, valueEnd).trim();

    if (key === "subject" && valueEnd === compact.length) {
      const split = splitCollapsedSubject(value);
      headers.set(key, split.subject);
      body = split.body;
    } else {
      headers.set(key, value);
    }
  }

  return { headers, body };
}

function parseEmail(rawEmail: string): ParsedEmail {
  const parsed = parseStandardEmail(rawEmail);
  const shouldTryCollapsedFallback =
    parsed.body === "" && /\bfrom:\s*/i.test(rawEmail) && /\bsubject:\s*/i.test(rawEmail) && /\s(?:to|cc|bcc|subject):\s*/i.test(rawEmail);

  return shouldTryCollapsedFallback ? parseCollapsedEmail(rawEmail) : parsed;
}

export function normalizeEmail(rawEmail: string, metadata: NormalizedEmail["metadata"] = {}): NormalizedEmail {
  const { headers, body } = parseEmail(rawEmail);
  const from = headers.get("from") ?? "";
  const match = from.match(/^(.*?)\s*<([^>]+)>$/);
  const senderName = match?.[1]?.trim() || (from.includes("@") ? null : from || null);
  const senderEmail = match?.[2]?.trim() || (from.includes("@") ? from.trim() : null);
  const links = Array.from(new Set((body.match(linkPattern) ?? []).map((url) => url.replace(/[.,;!?]+$/, ""))));

  return {
    senderName,
    senderEmail,
    subject: headers.get("subject") ?? "(no subject)",
    body,
    links,
    metadata,
  };
}

export function emailContainsAny(email: NormalizedEmail, terms: string[]): boolean {
  const haystack = `${email.subject}\n${email.body}`.toLowerCase();
  return terms.some((term) => haystack.includes(term.toLowerCase()));
}
