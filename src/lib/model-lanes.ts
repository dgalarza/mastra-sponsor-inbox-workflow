import { z } from "zod";

type JsonLaneOptions<T> = {
  system: string;
  user: string;
  schema: z.ZodType<T>;
  modelEnv: string;
  fallback: () => T;
};

type LocalLaneKind = "classifier" | "extractor";

function localLaneKind(modelEnv: string): LocalLaneKind {
  return modelEnv.includes("EXTRACTOR") ? "extractor" : "classifier";
}

function modelConfig(modelEnv: string) {
  const lane = localLaneKind(modelEnv);
  const localBaseUrl =
    lane === "extractor"
      ? process.env.LOCAL_EXTRACTOR_BASE_URL ?? process.env.LOCAL_MODEL_BASE_URL
      : process.env.LOCAL_CLASSIFIER_BASE_URL ?? process.env.LOCAL_MODEL_BASE_URL;

  if (localBaseUrl) {
    const localModelEnv = lane === "extractor" ? "LOCAL_EXTRACTOR_MODEL" : "LOCAL_CLASSIFIER_MODEL";
    const localApiKey =
      lane === "extractor"
        ? process.env.LOCAL_EXTRACTOR_API_KEY ?? process.env.LOCAL_MODEL_API_KEY
        : process.env.LOCAL_CLASSIFIER_API_KEY ?? process.env.LOCAL_MODEL_API_KEY;

    return {
      baseUrl: localBaseUrl,
      apiKey: localApiKey ?? "local",
      model: process.env[localModelEnv] ?? process.env[modelEnv] ?? "local-model",
    };
  }

  if (process.env.OPENAI_API_KEY) {
    return {
      baseUrl: process.env.OPENAI_BASE_URL ?? "https://api.openai.com/v1",
      apiKey: process.env.OPENAI_API_KEY,
      model: process.env[modelEnv] ?? "gpt-4o-mini",
    };
  }

  return null;
}

export async function generateJsonOrFallback<T>(options: JsonLaneOptions<T>): Promise<T> {
  const config = modelConfig(options.modelEnv);
  if (!config) return options.fallback();

  try {
    const response = await fetch(`${config.baseUrl.replace(/\/$/, "")}/chat/completions`, {
      method: "POST",
      headers: {
        authorization: `Bearer ${config.apiKey}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: config.model,
        temperature: 0,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: options.system },
          { role: "user", content: options.user },
        ],
      }),
    });

    if (!response.ok) return options.fallback();
    const payload = (await response.json()) as { choices?: Array<{ message?: { content?: string } }> };
    const content = payload.choices?.[0]?.message?.content;
    if (!content) return options.fallback();
    return options.schema.parse(JSON.parse(content));
  } catch {
    return options.fallback();
  }
}
