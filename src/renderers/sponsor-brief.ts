import type { SponsorTriageBrief } from "../lib/schemas";

function scoreLine(label: string, value: number) {
  return `| ${label} | ${value}/5 |`;
}

export function renderSponsorBrief(brief: Omit<SponsorTriageBrief, "markdown">): string {
  const details = brief.sponsorDetails;
  const external = brief.externalCorroboration;
  const provided = brief.sponsorProvidedEvidence;

  return `# Sponsor Triage Brief: ${details.brand}

## Recommendation

**${brief.guardrailDecision.recommendation}**

${brief.guardrailDecision.reasons.map((reason) => `- ${reason}`).join("\n")}

## Sponsor Snapshot

| Field | Value |
| --- | --- |
| Sender | ${details.sender.name ?? "Unknown"} <${details.sender.email ?? "unknown"}> |
| Role | ${details.sender.role ?? "Unknown"} |
| Product category | ${details.productCategory} |
| Sponsor intent | ${details.sponsorIntent} |
| Deliverables | ${details.deliverables.join(", ") || "Not specified"} |
| Budget | ${details.budgetStatus} |
| Timeline | ${details.timelineStatus} |
| Demo access | ${details.demoAccess} |
| URL | ${details.url ?? "Not provided"} |

## Sponsor-Provided Claims

${details.notableClaims.map((claim) => `- ${claim}`).join("\n")}

## Tavily Extract Evidence

Status: **${provided.extractionStatus}**

${provided.evidence.map((item) => `- ${item.sourceUrl}: ${item.summary}`).join("\n")}

## Tavily Search Corroboration

Overall strength: **${external.overallStrength}**

${external.evidence.map((item) => `- ${item.sourceUrl}: ${item.summary}`).join("\n")}

## Fit Scores

| Rubric | Score |
| --- | --- |
${scoreLine("Audience relevance", brief.scores.audienceRelevance)}
${scoreLine("Product credibility", brief.scores.productCredibility)}
${scoreLine("Content naturalness", brief.scores.contentNaturalness)}
${scoreLine("Reputation safety", brief.scores.reputationSafety)}
${scoreLine("Commercial clarity", brief.scores.commercialClarity)}

${brief.scores.rationale}

## Missing Information

${details.missingInformation.map((item) => `- ${item}`).join("\n")}

## Draft Reply

${brief.draftReply}
`;
}

export function renderReviewRequiredMarkdown(reason: string) {
  return `# Inbox Review Required

${reason}
`;
}
