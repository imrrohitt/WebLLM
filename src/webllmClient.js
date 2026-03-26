import { CreateWebWorkerMLCEngine } from "@mlc-ai/web-llm";

/** Single shared engine promise — avoids duplicate loads under React Strict Mode remounts. */
let enginePromise = null;

const MODEL_ID = "Llama-3.2-1B-Instruct-q4f16_1-MLC";

export function getOrCreateEngine(initProgressCallback) {
  if (!enginePromise) {
    enginePromise = CreateWebWorkerMLCEngine(
      new Worker(new URL("./worker.ts", import.meta.url), { type: "module" }),
      MODEL_ID,
      { initProgressCallback },
    );
  }
  return enginePromise;
}
