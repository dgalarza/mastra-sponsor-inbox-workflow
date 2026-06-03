# Mastra Sponsor Inbox Workflow

Reference repo for the video **Stop Making One Agent Handle the Whole Inbox**.

This project shows a production-shaped pattern for agent systems:

- use a workflow for routing, visibility, and guardrails
- use small focused agents for judgment-heavy steps
- keep final recommendation policy deterministic where it matters

The demo starts with broad inbox triage, then routes sponsor inquiries into a sponsor-specific workflow that extracts details, runs research, scores fit, applies guardrails, drafts a reply, and renders a shareable brief.

## Architecture

### Parent workflow: `inboxTriageWorkflow`

1. normalize the raw email into a structured envelope
2. classify the email into one inbox category
3. route only high-confidence sponsor inquiries into the child workflow
4. stop low-confidence or out-of-scope email as review-required

### Child workflow: `sponsorTriageWorkflow`

1. extract sponsor details from the email
2. extract sponsor-provided claims from the linked URL with Tavily Extract
3. search for external corroboration with Tavily Search
4. score the opportunity with a Qwen-backed rubric over the research payload
5. apply deterministic guardrails to the recommendation
6. draft a reply
7. render a markdown sponsor brief

The important boundary is:

- agents decide things like classification, extraction, and scoring
- workflows decide sequencing, routing, persistence, and observability
- guardrails enforce hard policy, even when an agent is optimistic

## Quickstart

### Prerequisites

- Bun
- Node.js 22+
- optional: an OpenAI-compatible local model endpoint for the classifier lane
- optional: an OpenAI-compatible local model endpoint for the extractor lane
- optional: `TAVILY_API_KEY` for live sponsor-page extraction and corroboration

### Install

```bash
bun install
cp .env.example .env
```

### Run Mastra Studio

```bash
bun run dev
```

Then open the Studio URL printed by the CLI and run `inboxTriageWorkflow`.

## Example Payload

Use the fixture from [`src/fixtures/sponsor-email.ts`](src/fixtures/sponsor-email.ts) or paste a payload like:

```json
{
  "rawEmail": "From: Maya Chen <maya@devflowai.dev>\nTo: Damian Galarza <damian@example.com>\nSubject: Partnership with DevFlow AI?\n\nHi Damian,\n\nI’ve been watching your recent videos on building production AI agents with Codex and Mastra, and I really appreciate that you focus on the implementation tradeoffs instead of just the flashy demo.\n\nI’m reaching out from DevFlow AI. We’re building an AI engineering workflow platform that helps product and engineering teams turn product specs into implementation plans, Linear tickets, GitHub PR checklists, and release notes.\n\nGiven your audience of AI builders, technical founders, and developers working with agentic coding tools, I think there could be a strong fit for a partnership.\n\nWe’re exploring both dedicated videos and integrated mentions with creators who can speak credibly to production AI workflows. Would you be open to sharing your pricing, availability, and any media kit details?\n\nHappy to set you up with a demo workspace and product walkthrough materials if helpful.\n\nYou can learn more here:\nhttps://devflow-blueprint.lovable.app/\n\nBest,\nMaya Chen\nPartnerships Lead\nDevFlow AI",
  "mailbox": "youtube@damian.example"
}
```

Expected result for the included fixture: `needs_review`.

Why: the fit can be strong, but missing budget, timeline, and independent proof should block an automatic `pursue`.

## Environment

`.env.example` is set up for two optional local lanes:

- classifier lane: a cheaper model for inbox categorization
- extractor lane: a stronger model for sponsor extraction, scoring, and drafting

Default local URLs are:

- `http://localhost:11434/v1` for the classifier lane
- `http://localhost:8081/v1` for the extractor lane

If you do not provide local model endpoints:

- the repo still typechecks and tests cleanly
- the deterministic guardrails still work
- live workflow runs that depend on model calls will need valid model endpoints

If `TAVILY_API_KEY` is missing, Tavily steps record skipped evidence and the workflow still lands on a safe `needs_review`.

## Stage Tags

The repo is also organized as a teaching series. Check out the `stage-*` tags to follow the build path used in the video:

- `stage-00-scaffold`
- `stage-01-normalize-email`
- `stage-02-classify-email`
- `stage-03-route-for-review`
- `stage-04-sponsor-child-workflow`
- `stage-05-research-and-guardrails`
- `stage-06-render-brief-and-reply`
- `stage-07-add-scorers`
- `stage-08-observability-final`
- `stage-09-lightweight-agent`

## Important Files

- `src/mastra/workflows/inbox-triage.workflow.ts` - parent routing workflow
- `src/mastra/workflows/sponsor-triage.workflow.ts` - sponsor-specific child workflow
- `src/mastra/steps/` - one readable workflow step per file
- `src/lib/classification.ts` - classifier agent
- `src/lib/sponsor-details.ts` - sponsor-detail extraction agent
- `src/lib/scoring.ts` - sponsor-fit scoring agent plus deterministic guardrails
- `src/lib/tavily.ts` - Tavily Extract and Search integration with safe fallbacks
- `src/renderers/sponsor-brief.ts` - markdown output for Studio and API consumers
- `src/mastra/scorers/` - telemetry scorers for workflow quality signals

## Observability

Mastra Observability is configured in [`src/mastra/index.ts`](src/mastra/index.ts) with DuckDB for traces, logs, metrics, and scorer output.

After a run, you can inspect traces in Studio or query the API:

```bash
curl http://localhost:4111/api/observability/traces
```

## Tests

```bash
bun test
bun run typecheck
```

## Sharing Notes

If you plan to publish or fork this repo:

- keep `.env` private
- point `.env` at your own local or hosted model endpoints
- review the stage tags if you want the repo to mirror the video sequence exactly
