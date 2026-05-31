import type { EvidenceItem, ExternalCorroboration, SponsorProvidedEvidence } from "./schemas";

type TavilyExtractResponse = {
  results?: Array<{ url?: string; raw_content?: string; content?: string }>;
  failed_results?: Array<{ url?: string; error?: string }>;
};

type TavilySearchResponse = {
  results?: Array<{ title?: string; url?: string; content?: string; score?: number }>;
};

const externalQueries = [
  "DevFlow AI GitHub",
  "DevFlow AI reviews",
  "DevFlow AI funding",
  "DevFlow AI security",
  "DevFlow AI customers",
];

function tavilyKey() {
  return process.env.TAVILY_API_KEY?.trim();
}

function summarizeText(text: string, maxLength = 420) {
  const compact = text.replace(/\s+/g, " ").trim();
  if (compact.length <= maxLength) return compact;
  return `${compact.slice(0, maxLength - 1).trim()}...`;
}

export async function extractSponsorProvidedClaims(url: string | null): Promise<SponsorProvidedEvidence> {
  if (!url) {
    return { extractionStatus: "failed", evidence: [] };
  }

  const apiKey = tavilyKey();
  if (!apiKey) {
    return {
      extractionStatus: "skipped_missing_api_key",
      evidence: [
        {
          sourceUrl: url,
          summary: "Tavily Extract was skipped because TAVILY_API_KEY is not set.",
          strength: "weak",
        },
      ],
    };
  }

  try {
    const response = await fetch("https://api.tavily.com/extract", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        api_key: apiKey,
        urls: [url],
        extract_depth: "basic",
        include_images: false,
      }),
    });

    if (!response.ok) {
      return {
        extractionStatus: "failed",
        evidence: [{ sourceUrl: url, summary: `Tavily Extract failed with HTTP ${response.status}.`, strength: "weak" }],
      };
    }

    const payload = (await response.json()) as TavilyExtractResponse;
    const results = payload.results ?? [];
    return {
      extractionStatus: "success",
      evidence: results.map((result) => ({
        sourceUrl: result.url ?? url,
        summary: summarizeText(result.raw_content ?? result.content ?? "No extractable page text returned."),
        strength: "moderate",
        notes: "Sponsor-provided source; useful for claims, not independent proof.",
      })),
    };
  } catch (error) {
    return {
      extractionStatus: "failed",
      evidence: [{ sourceUrl: url, summary: `Tavily Extract error: ${String(error)}`, strength: "weak" }],
    };
  }
}

export async function searchExternalCorroboration(brand: string): Promise<ExternalCorroboration> {
  const queries = externalQueries.map((query) => query.replace("DevFlow AI", brand));
  const apiKey = tavilyKey();
  if (!apiKey) {
    return {
      searchStatus: "skipped_missing_api_key",
      queries,
      evidence: [
        {
          sourceUrl: "tavily://search-skipped",
          summary: "Tavily Search was skipped because TAVILY_API_KEY is not set.",
          strength: "none",
        },
      ],
      overallStrength: "none",
    };
  }

  try {
    const evidence: EvidenceItem[] = [];

    for (const query of queries) {
      const response = await fetch("https://api.tavily.com/search", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          api_key: apiKey,
          query,
          search_depth: "basic",
          max_results: 3,
          include_answer: false,
          include_raw_content: false,
        }),
      });

      if (!response.ok) continue;
      const payload = (await response.json()) as TavilySearchResponse;
      for (const result of payload.results ?? []) {
        if (!result.url || result.url.includes("devflow-blueprint.lovable.app")) continue;
        evidence.push({
          sourceUrl: result.url,
          summary: summarizeText(`${result.title ?? query}: ${result.content ?? ""}`),
          strength: result.score && result.score > 0.7 ? "moderate" : "weak",
          notes: `Query: ${query}`,
        });
      }
    }

    const uniqueEvidence = Array.from(new Map(evidence.map((item) => [item.sourceUrl, item])).values()).slice(0, 8);
    const hasModerate = uniqueEvidence.some((item) => item.strength === "moderate" || item.strength === "strong");

    return {
      searchStatus: "success",
      queries,
      evidence:
        uniqueEvidence.length > 0
          ? uniqueEvidence
          : [{ sourceUrl: "tavily://no-results", summary: "No external corroborating results were found.", strength: "none" }],
      overallStrength: hasModerate ? "moderate" : uniqueEvidence.length > 0 ? "weak" : "none",
    };
  } catch (error) {
    return {
      searchStatus: "failed",
      queries,
      evidence: [{ sourceUrl: "tavily://search-error", summary: `Tavily Search error: ${String(error)}`, strength: "none" }],
      overallStrength: "none",
    };
  }
}
