Updated README.md to be more descriptive and user-friendly.

# WebLLM Chat
A production-oriented **browser-only** chat UI built with **React**, **Vite**, and [**WebLLM**](https://github.com/mlc-ai/web-llm) (`@mlc-ai/web-llm`). Inference runs **entirely on the client** using **WebGPU**; prompts and outputs do not leave the device.

- **Default model:** `Llama-3.2-1B-Instruct-q4f16_1-MLC` (small, fast to download; configurable in code).

## Features

- **Local inference** — no API keys, no backend server for the model.
- **Web Worker** — LLM work is off the main thread so the UI stays responsive.
- **OpenAI-style API** — `engine.chat.completions.create` with streaming responses.
- **Load feedback** — elapsed time, phase hints, and weight-download progress (WebLLM reports % during shard fetch; WASM/WebGPU setup can take time at 0%).

## Requirements

| Requirement | Notes |
|-------------|--------|
| **Browser** | Chromium-based with **WebGPU** (recent **Chrome** or **Edge** recommended). |
