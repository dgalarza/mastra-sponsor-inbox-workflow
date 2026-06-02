import { Agent } from "@mastra/core/agent";
import { z } from "zod";

type JsonGenerationOptions<T> = {
  id: string;
  name: string;
  system: string;
  user: string;
  schema: z.ZodType<T>;
};

const extractorModel = {
  providerId: "local-extractor",
  modelId: "mlx-community/Qwen3.6-35B-A3B-6bit",
  url: "http://gstudio:8081/v1",
  apiKey: "mlx",
};

export async function generateJson<T>(options: JsonGenerationOptions<T>): Promise<T> {
  const agent = new Agent({
    id: options.id,
    name: options.name,
    instructions: options.system,
    model: extractorModel,
  });

  const response = await agent.generate(options.user, {
    structuredOutput: {
      schema: options.schema,
      jsonPromptInjection: true,
    },
  });

  return options.schema.parse(response.object);
}
