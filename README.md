# Mastra Sponsor Inbox Workflow

Teaching demo for: **Stop Making One Agent Handle the Whole Inbox**

This repo demonstrates a parent inbox workflow that performs broad email triage, then routes high-confidence sponsor inquiries into a nested sponsor-specific workflow. The point of the demo is the boundary between:

- **LLM judgment** for classification, detail extraction, and reply drafting.
- **Workflow control** for predictable routing and step visibility in Mastra Studio.
- **Deterministic guardrails** for policies that should not be left to an LLM.

## Demo Flow

1. `inboxTriageWorkflow`
   - `normalizeEmailStep` parses the raw email into sender, subject, body, links, and metadata.
   - `classifyEmailStep` classifies the email into one of the allowed inbox categories.
   - High-confidence `sponsor_inquiry` routes into the nested `sponsorTriageWorkflow`.
   - Unknown or low-confidence mail stops as review-required.
2. `sponsorTriageWorkflow`
   - Verifies sponsor intent.
   - Extracts sponsor details without inventing budget, customer proof, or case studies.
   - Uses Tavily Extract for the sponsor-provided URL.
   - Uses Tavily Search for external corroboration.
   - Scores audience fit and commercial clarity.
   - Applies a deterministic guardrail: weak external corroboration can never return `pursue`.
   - Drafts a reply that asks for missing commercial and proof details without quoting rates.
   - Renders JSON plus a Markdown Sponsor Triage Brief for Mastra Studio.

## Expected Recommendation

For the included DevFlow AI fixture, the expected final recommendation is:

```text
needs_review
```

Audience fit and sponsor intent are strong, but external corroboration is weak and commercial details are incomplete.

## Run Mastra Studio

```bash
bun install
bun run dev
```

On this `studio` machine, Node is installed through `mise`. If `mastra dev` cannot find `node` from a non-interactive shell, use:

```bash
mise exec node@24 -- bun run dev
```

Then open the Studio URL printed by the CLI and run `inboxTriageWorkflow` with:

```json
{
  "rawEmail": "paste the fixture from src/fixtures/sponsor-email.ts"
}
```

## Optional Environment

The demo runs without provider keys by using deterministic teaching fallbacks. To show live model/Tavily lanes, copy `.env.example` to `.env` and set:

- Local OpenAI-compatible model endpoints.
- `TAVILY_API_KEY`.

The default local lane values mirror Emma v2:

- Classifier: `http://lianlidg:11434/v1` with `ministral-3:8b`
- Extractor/drafting lane: `http://gstudio:8081/v1` with `mlx-community/Qwen3.6-35B-A3B-6bit`

If `TAVILY_API_KEY` is absent, Tavily steps record skipped evidence and the deterministic guardrail still forces `needs_review`.

## Important Files

- `src/mastra/workflows/inbox-triage.workflow.ts` - parent routing workflow.
- `src/mastra/workflows/sponsor-triage.workflow.ts` - nested sponsor workflow.
- `src/mastra/steps/*` - one readable teaching step per file.
- `src/lib/scoring.ts` - deterministic recommendation policy.
- `src/lib/tavily.ts` - Tavily Extract/Search client with safe fallbacks.
- `src/renderers/sponsor-brief.ts` - Studio-friendly Markdown report.
- `src/mastra/scorers/*` - workflow step scorer telemetry.
- `tests/*` - deterministic helper tests.

## Scorers

`classifyEmailStep` and `extractSponsorDetailsStep` attach custom scorers using Mastra's scorer pipeline. They are deterministic/rule-based so they can run during a live demo without another model call:

- `classifyEmailScorer` checks category correctness, confidence calibration, grounded reason, and no overconfident routing.
- `sponsorDetailsScorer` checks completeness/groundedness and catches invented budget, customer proof, or case studies.

Studio scorer persistence depends on Mastra storage, configured in `src/mastra/index.ts`.
