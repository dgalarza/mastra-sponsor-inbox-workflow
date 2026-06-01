import type { NormalizedEmail } from "./schemas";

const linkPattern = /https?:\/\/[^\s<>)"]+/g;

export function normalizeEmail(rawEmail: string, metadata: NormalizedEmail["metadata"] = {}): NormalizedEmail {
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

  const from = headers.get("from") ?? "";
  const match = from.match(/^(.*?)\s*<([^>]+)>$/);
  const senderName = match?.[1]?.trim() || (from.includes("@") ? null : from || null);
  const senderEmail = match?.[2]?.trim() || (from.includes("@") ? from.trim() : null);
  const body = bodyLines.join("\n").trim();
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
