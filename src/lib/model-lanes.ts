import { Agent } from "@mastra/core/agent";
import { z } from "zod";

type JsonLaneOptions<T> = {
  system: string;
  user: string;
  schema: z.ZodType<T>;
  modelEnv: string;
  fallback: () => T;
};

type LocalLaneKind = "classifier" | "extractor";

type MastraModelConfig = string | {
  providerId: string;
  modelId: string;
  url?: string;
  apiKey?: string;
};

function localLaneKind(modelEnv: string): LocalLaneKind {
  return modelEnv.includes("EXTRACTOR") ? "extractor" : "classifier";
}

function localModelConfig(modelEnv: string): MastraModelConfig | null {
  const lane = localLaneKind(modelEnv);
  const localBaseUrl =
    lane === "extractor"
      ? process.env.LOCAL_EXTRACTOR_BASE_URL ?? process.env.LOCAL_MODEL_BASE_URL
      : process.env.LOCAL_CLASSIFIER_BASE_URL ?? process.env.LOCAL_MODEL_BASE_URL;

  if (!localBaseUrl) return null;

  const localModelEnv = lane === "extractor" ? "LOCAL_EXTRACTOR_MODEL" : "LOCAL_CLASSIFIER_MODEL";
  const localApiKey =
    lane === "extractor"
      ? process.env.LOCAL_EXTRACTOR_API_KEY ?? process.env.LOCAL_MODEL_API_KEY
      : process.env.LOCAL_CLASSIFIER_API_KEY ?? process.env.LOCAL_MODEL_API_KEY;

  return {
    providerId: `local-${lane}`,
    modelId: process.env[localModelEnv] ?? process.env[modelEnv] ?? "local-model",
    url: localBaseUrl,
    apiKey: localApiKey ?? "local",
  };
}

export function modelConfig(modelEnv: string): MastraModelConfig | null {
  const local = localModelConfig(modelEnv);
  if (local) return local;

  if (process.env.OPENAI_API_KEY) {
    return {
      providerId: "openai",
      modelId: process.env[modelEnv] ?? "gpt-4o-mini",
      url: process.env.OPENAI_BASE_URL ?? "https://api.openai.com/v1",
      apiKey: process.env.OPENAI_API_KEY,
    };
  }

  return null;
}

export async function generateJsonOrFallback<T>(options: JsonLaneOptions<T>): Promise<T> {
  const model = modelConfig(options.modelEnv);
  const fallback = options.fallback();
  if (!model) return fallback;

  try {
    const agent = new Agent({
      id: `${options.modelEnv.toLowerCase().replace(/_/g, "-")}-structured-agent`,
      name: `${options.modelEnv} Structured Agent`,
      instructions: options.system,
      model,
    });

    const response = await agent.generate(options.user, {
      structuredOutput: {
        schema: options.schema,
        errorStrategy: "fallback",
        fallbackValue: fallback,
        jsonPromptInjection: true,
      },
    });

    return response.object ? options.schema.parse(response.object) : fallback;
  } catch {
    return fallback;
  }
}
