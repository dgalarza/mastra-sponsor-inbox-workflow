import { afterEach, expect, test } from "bun:test";
import { z } from "zod";
import { generateJson } from "../src/lib/model-lanes";

const originalFetch = globalThis.fetch;

afterEach(() => {
  globalThis.fetch = originalFetch;
});

test("structured extractor calls the local Qwen model", async () => {
  let requestedModel = "";
  globalThis.fetch = (async (_url: Parameters<typeof fetch>[0], init?: Parameters<typeof fetch>[1]) => {
    requestedModel = JSON.parse(String(init?.body)).model;
    return new Response(JSON.stringify({ choices: [{ message: { content: JSON.stringify({ ok: true }) } }] }), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  }) as unknown as typeof fetch;

  const result = await generateJson({
    id: "test-extractor",
    name: "Test Extractor",
    system: "Return JSON.",
    user: "{}",
    schema: z.object({ ok: z.boolean() }),
  });

  expect(result.ok).toBe(true);
  expect(requestedModel).toBe("mlx-community/Qwen3.6-35B-A3B-6bit");
});
