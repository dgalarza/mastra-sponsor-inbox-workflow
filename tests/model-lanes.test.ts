import { afterEach, expect, test } from "bun:test";
import { z } from "zod";
import { generateJsonOrFallback } from "../src/lib/model-lanes";

const originalEnv = { ...process.env };
const originalFetch = globalThis.fetch;

afterEach(() => {
  process.env = { ...originalEnv };
  globalThis.fetch = originalFetch;
});

test("local model lane uses the extractor-specific model env", async () => {
  process.env.LOCAL_MODEL_BASE_URL = "http://local.test/v1";
  process.env.LOCAL_MODEL_API_KEY = "test";
  process.env.LOCAL_CLASSIFIER_MODEL = "classifier-local";
  process.env.LOCAL_EXTRACTOR_MODEL = "extractor-local";
  process.env.SPONSOR_EXTRACTOR_MODEL = "gpt-4o-mini";

  let requestedModel = "";
  globalThis.fetch = (async (_url, init) => {
    requestedModel = JSON.parse(String(init?.body)).model;
    return new Response(JSON.stringify({ choices: [{ message: { content: JSON.stringify({ ok: true }) } }] }), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  }) as typeof fetch;

  const result = await generateJsonOrFallback({
    system: "Return JSON.",
    user: "{}",
    schema: z.object({ ok: z.boolean() }),
    modelEnv: "SPONSOR_EXTRACTOR_MODEL",
    fallback: () => ({ ok: false }),
  });

  expect(result.ok).toBe(true);
  expect(requestedModel).toBe("extractor-local");
});

test("local model lane uses the classifier-specific model env", async () => {
  process.env.LOCAL_MODEL_BASE_URL = "http://local.test/v1";
  process.env.LOCAL_CLASSIFIER_MODEL = "classifier-local";
  process.env.LOCAL_EXTRACTOR_MODEL = "extractor-local";
  process.env.INBOX_CLASSIFIER_MODEL = "gpt-4o-mini";

  let requestedModel = "";
  globalThis.fetch = (async (_url, init) => {
    requestedModel = JSON.parse(String(init?.body)).model;
    return new Response(JSON.stringify({ choices: [{ message: { content: JSON.stringify({ ok: true }) } }] }), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  }) as typeof fetch;

  await generateJsonOrFallback({
    system: "Return JSON.",
    user: "{}",
    schema: z.object({ ok: z.boolean() }),
    modelEnv: "INBOX_CLASSIFIER_MODEL",
    fallback: () => ({ ok: false }),
  });

  expect(requestedModel).toBe("classifier-local");
});
