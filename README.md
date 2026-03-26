# WebLLM Chat

A production-oriented **browser-only** chat UI built with **React**, **Vite**, and [**WebLLM**](https://github.com/mlc-ai/web-llm) (`@mlc-ai/web-llm`). Inference runs **entirely on the client** using **WebGPU**; prompts and outputs do not leave the device.

**Default model:** `Llama-3.2-1B-Instruct-q4f16_1-MLC` (small, fast to download; configurable in code).

---

## Features

- **Local inference** — no API keys, no backend server for the model.
- **Web Worker** — LLM work is off the main thread so the UI stays responsive.
- **OpenAI-style API** — `engine.chat.completions.create` with streaming responses.
- **Load feedback** — elapsed time, phase hints, and weight-download progress (WebLLM reports % during shard fetch; WASM/WebGPU setup can take time at 0%).

---

## Requirements

| Requirement | Notes |
|-------------|--------|
| **Browser** | Chromium-based with **WebGPU** (recent **Chrome** or **Edge** recommended). |
| **Context** | **HTTPS** or **localhost** (required for workers and modern APIs). |
| **Hardware** | Enough RAM/VRAM for the chosen model; 1B q4 is relatively light. |
| **Node.js** | **18+** (20+ recommended) for development and builds. |

Check WebGPU: [https://webgpureport.org](https://webgpureport.org)

---

## Quick start

```bash
git clone git@github.com:imrrohitt/WebLLM.git
cd WebLLM
npm install
npm run dev
```

Open the URL printed in the terminal (usually `http://localhost:5173`). The first load **downloads model artifacts** into the browser cache; later visits are faster.

---

## Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Start Vite dev server with HMR. |
| `npm run build` | Typecheck-free production build to `dist/`. |
| `npm run preview` | Serve the production build locally. |

---

## Production build

```bash
npm run build
```

Static output is in **`dist/`**. Deploy it to any static host (Netlify, Vercel, Cloudflare Pages, S3 + CloudFront, GitHub Pages, etc.).

### Subpath hosting (e.g. GitHub Pages)

If the app is not served from the domain root, set the Vite base URL before building:

```bash
# Example: site at https://username.github.io/WebLLM/
npx vite build --base=/WebLLM/
```

Then configure your host to serve `dist/` at that path.

---

## Configuration

| What | Where |
|------|--------|
| **Model ID** | `src/webllmClient.js` — change `MODEL_ID` to another [bundled MLC model](https://mlc.ai/models). |
| **System prompt / UX** | `src/ChatBot.jsx` |

---

## Architecture

```
src/
├── main.jsx          # React entry
├── App.jsx           # Shell
├── ChatBot.jsx       # Chat UI, init, streaming, load progress
├── webllmClient.js   # CreateWebWorkerMLCEngine + model id
├── worker.ts         # WebWorkerMLCEngineHandler (WebLLM worker entry)
└── index.css         # Styles
```

- **`CreateWebWorkerMLCEngine`** bundles reliably under Vite and avoids fragile service-worker registration in dev.
- A **module singleton** avoids double model load under React Strict Mode.

---

## Troubleshooting

| Symptom | What to try |
|---------|-------------|
| **WebGPU not available** | Update Chrome/Edge; enable WebGPU in `chrome://flags` if needed. |
| **Stuck at 0% for minutes** | Normal while **WASM** compiles and **WebGPU** initializes; % moves during **weight shard** download. Watch elapsed time and status text. |
| **Very slow first load** | Large download + compile; use Wi‑Fi; retry after partial cache. |
| **Worker errors** | Open DevTools **Console**; ensure **HTTPS/localhost** and no strict extensions blocking workers. |

---

## Security & privacy

- No server component sends user text to a cloud LLM in this app’s default configuration.
- Hosting provider may still log HTTP requests to your static assets; use a privacy policy appropriate to your deployment.

---

## License

This project is provided as-is. **WebLLM** and **model weights** are subject to their respective licenses (see [@mlc-ai/web-llm](https://www.npmjs.com/package/@mlc-ai/web-llm) and the model card for **Llama** terms).

---

## Acknowledgments

- [MLC / WebLLM](https://github.com/mlc-ai/web-llm) — in-browser inference stack.
- [Vite](https://vitejs.dev/) — build tooling.
