import { Agent } from "@mastra/core/agent";
import { z } from "zod";

type JsonGenerationOptions<T> = {
  id: string;
  name: string;
  system: string;
  user: string;
  schema: z.ZodType<T>;
};

export function getClassifierModel() {
  return {
    providerId: "local-classifier",
    modelId: process.env.LOCAL_CLASSIFIER_MODEL ?? "ministral-3:8b",
    url: process.env.LOCAL_CLASSIFIER_BASE_URL ?? process.env.LOCAL_MODEL_BASE_URL ?? "http://localhost:11434/v1",
    apiKey: process.env.LOCAL_CLASSIFIER_API_KEY ?? process.env.LOCAL_MODEL_API_KEY ?? "ollama",
  };
}

export function getExtractorModel() {
  return {
    providerId: "local-extractor",
    modelId: process.env.LOCAL_EXTRACTOR_MODEL ?? "mlx-community/Qwen3.6-35B-A3B-6bit",
    url: process.env.LOCAL_EXTRACTOR_BASE_URL ?? process.env.LOCAL_MODEL_BASE_URL ?? "http://localhost:8081/v1",
    apiKey: process.env.LOCAL_EXTRACTOR_API_KEY ?? process.env.LOCAL_MODEL_API_KEY ?? "mlx",
  };
}

export async function generateJson<T>(options: JsonGenerationOptions<T>): Promise<T> {
  const agent = new Agent({
    id: options.id,
    name: options.name,
    instructions: options.system,
    model: getExtractorModel(),
  });

  const response = await agent.generate(options.user, {
    structuredOutput: {
      schema: options.schema,
      jsonPromptInjection: true,
    },
  });

  return options.schema.parse(response.object);
}
