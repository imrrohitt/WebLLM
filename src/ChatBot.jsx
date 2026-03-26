import React, { useState, useEffect, useRef } from "react";
import { getOrCreateEngine } from "./webllmClient.js";

const ChatBot = () => {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [status, setStatus] = useState("Checking WebGPU…");
  const [isReady, setIsReady] = useState(false);
  /** Model fetch/load progress from WebLLM `InitProgressReport` (progress is 0–1). */
  const [modelLoad, setModelLoad] = useState(null);
  const [loadTick, setLoadTick] = useState(0);
  const loadStartedAtRef = useRef(null);
  const engineRef = useRef(null);

  // WebLLM only reports % while tensor shards download. WASM + WebGPU setup can take minutes at 0%.
  useEffect(() => {
    if (!modelLoad || isReady) return;
    const id = setInterval(() => setLoadTick((n) => n + 1), 1000);
    return () => clearInterval(id);
  }, [modelLoad, isReady]);

  useEffect(() => {
    let cancelled = false;

    async function init() {
      try {
        if (!navigator.gpu) {
          setStatus(
            "WebGPU is not available. Use a recent Chrome/Edge, or enable WebGPU in flags.",
          );
          return;
        }

        setStatus("Loading model (first run downloads weights; may take a while)…");
        loadStartedAtRef.current = performance.now();
        setLoadTick(0);
        setModelLoad({
          percent: 0,
          text: "Preparing: fetching config, WASM runtime, WebGPU, tokenizer… (no % until weights download)",
        });
        const engine = await getOrCreateEngine((report) => {
          if (!cancelled) {
            const pct = Math.min(100, report.progress * 100);
            setModelLoad({
              percent: pct,
              text: report.text,
              timeElapsedSec: report.timeElapsed,
            });
          }
        });

        if (cancelled) return;

        engineRef.current = engine;
        setIsReady(true);
        setStatus("Ready — all inference runs locally in your browser.");
        setModelLoad(null);
      } catch (error) {
        if (!cancelled) {
          setModelLoad(null);
          setStatus(`Error: ${error.message}`);
        }
      }
    }

    init();
    return () => {
      cancelled = true;
    };
  }, []);

  const formatElapsed = (totalSec) => {
    const s = Math.max(0, Math.floor(totalSec));
    const m = Math.floor(s / 60);
    const r = s % 60;
    return m > 0 ? `${m}m ${r}s` : `${r}s`;
  };

  const wallElapsedSec =
    modelLoad && loadStartedAtRef.current
      ? (performance.now() - loadStartedAtRef.current) / 1000
      : 0;

  /** True while WebLLM has not yet reported shard fetch progress (library quirk). */
  const showingWeightPercent =
    modelLoad &&
    (modelLoad.percent > 0 ||
      /Start to fetch|Fetching param|Loading model from cache|\d+\s*MB/i.test(
        modelLoad.text || "",
      ));

  const handleSend = async () => {
    const text = input.trim();
    if (!text || !engineRef.current || !isReady) return;

    const userMessage = { role: "user", content: text };
    const history = [...messages, userMessage];
    setMessages(history);
    setInput("");
    setStatus("Generating…");

    const assistantId = `a-${Date.now()}`;
    setMessages((prev) => [
      ...prev,
      { role: "assistant", id: assistantId, content: "" },
    ]);

    try {
      const stream = await engineRef.current.chat.completions.create({
        messages: [
          {
            role: "system",
            content: "You are a helpful, concise assistant.",
          },
          ...history.map(({ role, content }) => ({ role, content })),
        ],
        stream: true,
        temperature: 0.7,
        max_tokens: 1024,
      });

      let full = "";
      for await (const chunk of stream) {
        const delta = chunk.choices[0]?.delta?.content ?? "";
        full += delta;
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId ? { ...m, content: full } : m,
          ),
        );
      }

      setStatus("Ready — all inference runs locally in your browser.");
    } catch (error) {
      setMessages((prev) => prev.filter((m) => m.id !== assistantId));
      setStatus(`Error: ${error.message}`);
    }
  };

  const onKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="chat-root">
      <header className="chat-header">
        <h1>WebLLM Chat</h1>
        <p className="status">{status}</p>
        {modelLoad ? (
          <div
            className="load-panel"
            aria-live="polite"
            aria-busy="true"
            aria-label="Model loading progress"
          >
            <p className="load-elapsed">
              Elapsed: {formatElapsed(wallElapsedSec)}
              {modelLoad.timeElapsedSec != null && modelLoad.timeElapsedSec > 0
                ? ` · WebLLM: ${formatElapsed(modelLoad.timeElapsedSec)}`
                : null}
            </p>
            <div className="load-percent-row">
              {showingWeightPercent ? (
                <>
                  <span className="load-percent">
                    {modelLoad.percent < 1
                      ? modelLoad.percent.toFixed(1)
                      : Math.round(modelLoad.percent)}
                    %
                  </span>
                  <span className="load-label">weights</span>
                </>
              ) : (
                <>
                  <span className="load-percent load-percent--pending">—</span>
                  <span className="load-label">setup (no % yet)</span>
                </>
              )}
            </div>
            <div
              className={
                showingWeightPercent
                  ? "progress-track"
                  : "progress-track progress-track--indeterminate"
              }
              role="progressbar"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={
                showingWeightPercent ? Math.round(modelLoad.percent) : undefined
              }
            >
              {showingWeightPercent ? (
                <div
                  className="progress-fill"
                  style={{
                    width: `${Math.min(100, modelLoad.percent)}%`,
                  }}
                />
              ) : (
                <div className="progress-fill progress-fill--indeterminate" />
              )}
            </div>
            {modelLoad.text ? (
              <p className="progress-detail">{modelLoad.text}</p>
            ) : null}
            <p className="load-hint">
              The percentage only moves while <strong>weight shards</strong> download.
              Compiling WASM and initializing WebGPU can take several minutes first —
              that is normal.
            </p>
          </div>
        ) : null}
      </header>

      <div className="messages" role="log" aria-live="polite">
        {messages.length === 0 ? (
          <p className="empty">
            Send a message. The model runs in a web worker with WebGPU — no
            server calls.
          </p>
        ) : (
          messages.map((m, i) => (
            <div
              key={m.id ?? `${m.role}-${i}`}
              className={`bubble ${m.role === "user" ? "user" : "assistant"}`}
            >
              <span className="label">{m.role === "user" ? "You" : "AI"}</span>
              <div className="text">{m.content}</div>
            </div>
          ))
        )}
      </div>

      <div className="composer">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder={
            isReady ? "Type a message…" : "Waiting for model…"
          }
          disabled={!isReady}
          autoComplete="off"
        />
        <button type="button" onClick={handleSend} disabled={!isReady}>
          Send
        </button>
      </div>

      <footer className="footer">
        <small>
          Llama 3.2 1B (q4f16) via @mlc-ai/web-llm — prompts stay on device.
        </small>
      </footer>
    </div>
  );
};

export default ChatBot;
