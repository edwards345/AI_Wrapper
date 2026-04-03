import { useState, useEffect, useRef, useCallback } from "react";
import { fetchModels, runPrompt, fetchSummary } from "./api";
import type { ModelsResponse, ProviderName, ProviderResult } from "./types";

/*
 * Provider theme definitions — modeled after each chatbot's real UI:
 *
 * Claude (claude.ai):  Warm cream/sand bg, dark brown text, terracotta accent
 * ChatGPT (chatgpt.com): Dark charcoal bg (#212121), white text, green (#10a37f) accent
 * Gemini (gemini.google.com): Deep dark bg (#1e1f20), light text, Google blue (#8ab4f8) accent
 * Grok (x.ai):  Near-black bg (#09090b), white text, bright orange (#f97316) accent
 */

interface ProviderTheme {
  card: string;
  header: string;
  headerText: string;
  body: string;
  bodyText: string;
  meta: string;
  cursor: string;
  streamLabel: string;
  accent: string;      // for sidebar checkbox/text
  sidebarText: string;
  icon: string;        // provider icon/logo character
}

const THEMES: Record<ProviderName, ProviderTheme> = {
  claude: {
    card: "rounded-2xl overflow-hidden shadow-lg",
    header: "bg-[#d4a27a] px-5 py-3",
    headerText: "text-[#3d2314] font-semibold text-sm tracking-wide",
    body: "bg-[#faf6f1] px-5 py-4",
    bodyText: "text-[#3d2b1f] text-sm leading-relaxed whitespace-pre-wrap",
    meta: "text-[#a08060] text-xs",
    cursor: "bg-[#d4a27a]",
    streamLabel: "text-[#d4a27a]",
    accent: "accent-[#d4a27a]",
    sidebarText: "text-[#d4a27a]",
    icon: "C",
  },
  openai: {
    card: "rounded-2xl overflow-hidden shadow-lg",
    header: "bg-[#2a2a2a] px-5 py-3",
    headerText: "text-[#10a37f] font-semibold text-sm tracking-wide",
    body: "bg-[#212121] px-5 py-4",
    bodyText: "text-[#ececec] text-sm leading-relaxed whitespace-pre-wrap",
    meta: "text-[#8e8ea0] text-xs",
    cursor: "bg-[#10a37f]",
    streamLabel: "text-[#10a37f]",
    accent: "accent-[#10a37f]",
    sidebarText: "text-[#10a37f]",
    icon: "G",
  },
  gemini: {
    card: "rounded-2xl overflow-hidden shadow-lg",
    header: "bg-[#282a2c] px-5 py-3",
    headerText: "text-[#8ab4f8] font-semibold text-sm tracking-wide",
    body: "bg-[#1e1f20] px-5 py-4",
    bodyText: "text-[#e3e3e3] text-sm leading-relaxed whitespace-pre-wrap",
    meta: "text-[#8e8ea0] text-xs",
    cursor: "bg-[#8ab4f8]",
    streamLabel: "text-[#8ab4f8]",
    accent: "accent-[#8ab4f8]",
    sidebarText: "text-[#8ab4f8]",
    icon: "G",
  },
  grok: {
    card: "rounded-2xl overflow-hidden shadow-lg",
    header: "bg-[#18181b] px-5 py-3 border-b border-[#27272a]",
    headerText: "text-[#f97316] font-semibold text-sm tracking-wide",
    body: "bg-[#09090b] px-5 py-4",
    bodyText: "text-[#fafafa] text-sm leading-relaxed whitespace-pre-wrap",
    meta: "text-[#71717a] text-xs",
    cursor: "bg-[#f97316]",
    streamLabel: "text-[#f97316]",
    accent: "accent-[#f97316]",
    sidebarText: "text-[#f97316]",
    icon: "X",
  },
};

const PROVIDER_DISPLAY: Record<ProviderName, string> = {
  claude: "Claude",
  openai: "ChatGPT",
  gemini: "Gemini",
  grok: "Grok",
};

// Summary uses Claude's cream theme since Claude powers the synthesis
const SUMMARY_THEME = {
  card: "rounded-2xl overflow-hidden shadow-lg",
  header: "bg-[#c08a5a] px-5 py-3",
  headerText: "text-white font-semibold text-sm tracking-wide",
  body: "bg-[#faf6f1] px-5 py-4",
  bodyText: "text-[#3d2b1f] text-sm leading-relaxed whitespace-pre-wrap",
};

interface CardState {
  label: string;
  provider: ProviderName;
  model?: string;
  streaming: boolean;
  content: string;
  result?: ProviderResult;
}

function ProviderIcon({ provider }: { provider: ProviderName }) {
  const colors: Record<ProviderName, string> = {
    claude: "bg-[#d4a27a] text-[#3d2314]",
    openai: "bg-[#10a37f] text-white",
    gemini: "bg-[#8ab4f8] text-[#1e1f20]",
    grok: "bg-[#f97316] text-black",
  };
  return (
    <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold mr-2 ${colors[provider]}`}>
      {THEMES[provider].icon}
    </span>
  );
}

function ResponseCard({ card }: { card: CardState }) {
  const theme = THEMES[card.provider];

  return (
    <div className={theme.card}>
      {/* Header bar */}
      <div className={`${theme.header} flex items-center justify-between`}>
        <div className="flex items-center">
          <ProviderIcon provider={card.provider} />
          <span className={theme.headerText}>{card.label}</span>
        </div>
        <div className="flex items-center gap-3">
          {card.result && (
            <span className={theme.meta}>
              {card.result.latencyMs < 1000
                ? `${card.result.latencyMs}ms`
                : `${(card.result.latencyMs / 1000).toFixed(1)}s`}
              {card.result.inputTokens !== undefined &&
                ` · ${card.result.inputTokens}/${card.result.outputTokens} tok`}
            </span>
          )}
          {card.streaming && (
            <span className={`text-xs animate-pulse ${theme.streamLabel}`}>streaming...</span>
          )}
        </div>
      </div>

      {/* Body */}
      <div className={theme.body} style={{ minHeight: "80px" }}>
        {card.result?.status === "error" ? (
          <p className="text-red-400 text-sm">{card.result.error}</p>
        ) : card.result?.status === "timeout" ? (
          <p className="text-amber-400 text-sm">Timed out</p>
        ) : (
          <div className={theme.bodyText}>
            {card.content}
            {card.streaming && (
              <span className={`inline-block w-1.5 h-5 ${theme.cursor} animate-pulse ml-0.5 align-text-bottom rounded-sm`} />
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default function App() {
  const [modelsData, setModelsData] = useState<ModelsResponse | null>(null);
  const [selectedModels, setSelectedModels] = useState<string[]>([]);
  const [prompt, setPrompt] = useState("");
  const [systemPrompt, setSystemPrompt] = useState("");
  const [showSystem, setShowSystem] = useState(false);
  const [running, setRunning] = useState(false);
  const [cards, setCards] = useState<CardState[]>([]);
  const [summary, setSummary] = useState<{ type: string; content: string } | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const cancelRef = useRef<(() => void) | null>(null);
  const promptRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    fetchModels().then((data) => {
      setModelsData(data);
      const defaults: string[] = [];
      for (const provider of data.availableProviders) {
        const fast = data.models[provider].find((m) => m.tier === "fast");
        if (fast) defaults.push(fast.id);
        else if (data.models[provider][0]) defaults.push(data.models[provider][0].id);
      }
      setSelectedModels(defaults);
    });
  }, []);

  const toggleModel = (id: string) => {
    setSelectedModels((prev) =>
      prev.includes(id) ? prev.filter((m) => m !== id) : [...prev, id]
    );
  };

  const allResults = useRef<ProviderResult[]>([]);
  const lastPrompt = useRef("");

  const handleRun = useCallback(() => {
    if (!prompt.trim() || running) return;

    setRunning(true);
    setCards([]);
    setSummary(null);
    allResults.current = [];
    lastPrompt.current = prompt;

    const cancel = runPrompt({
      prompt,
      systemPrompt: showSystem ? systemPrompt : undefined,
      models: selectedModels.length > 0 ? selectedModels : undefined,
      onStreamStart: (label, provider) => {
        setCards((prev) => [
          ...prev,
          { label, provider: provider as ProviderName, streaming: true, content: "" },
        ]);
      },
      onStreamToken: (label, token) => {
        setCards((prev) =>
          prev.map((c) => (c.label === label ? { ...c, content: c.content + token } : c))
        );
      },
      onStreamEnd: (result) => {
        allResults.current.push(result);
        setCards((prev) =>
          prev.map((c) =>
            c.label === result.label
              ? { ...c, streaming: false, result, model: result.model, content: result.content }
              : c
          )
        );
      },
      onResult: (result) => {
        allResults.current.push(result);
        setCards((prev) => [
          ...prev,
          {
            label: result.label,
            provider: result.provider,
            model: result.model,
            streaming: false,
            content: result.status === "success" ? result.content : "",
            result,
          },
        ]);
      },
      onDone: () => {
        setRunning(false);
      },
      onError: (error) => {
        console.error(error);
        setRunning(false);
      },
    });

    cancelRef.current = cancel;
  }, [prompt, systemPrompt, showSystem, selectedModels, running]);

  const handleSummary = async (mode: "combined" | "consensus") => {
    if (allResults.current.length === 0) return;
    setSummaryLoading(true);
    try {
      const content = await fetchSummary(lastPrompt.current, allResults.current, mode);
      setSummary({ type: mode === "combined" ? "Combined Summary" : "Consensus Analysis", content });
    } catch (err) {
      console.error(err);
    }
    setSummaryLoading(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleRun();
    }
  };

  if (!modelsData) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-950">
        <div className="animate-pulse text-gray-500">Loading AI Wrapper...</div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-950">
      {/* Sidebar */}
      <aside className="w-72 bg-[#111113] border-r border-gray-800/50 flex flex-col shrink-0">
        <div className="p-5 border-b border-gray-800/50">
          <h1 className="text-lg font-bold text-white tracking-tight">AI Wrapper</h1>
          <p className="text-xs text-gray-500 mt-1">Multi-LLM Prompt Runner</p>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-5">
          {(Object.keys(modelsData.models) as ProviderName[]).map((provider) => {
            const available = modelsData.availableProviders.includes(provider);
            const theme = THEMES[provider];
            return (
              <div key={provider}>
                <div className={`flex items-center gap-2 mb-2 ${!available ? "opacity-40" : ""}`}>
                  <ProviderIcon provider={provider} />
                  <h3 className={`text-sm font-semibold ${theme.sidebarText}`}>
                    {PROVIDER_DISPLAY[provider]}
                  </h3>
                  {!available && <span className="text-gray-600 text-[10px]">(no key)</span>}
                </div>
                {modelsData.models[provider].map((m) => (
                  <label
                    key={m.id}
                    className={`flex items-center gap-2 px-2 py-1.5 rounded-lg text-sm cursor-pointer transition-colors hover:bg-white/5 ${!available ? "opacity-30 pointer-events-none" : ""}`}
                  >
                    <input
                      type="checkbox"
                      checked={selectedModels.includes(m.id)}
                      onChange={() => toggleModel(m.id)}
                      disabled={!available}
                      className={theme.accent}
                    />
                    <span className="text-gray-300 truncate text-[13px]">{m.label}</span>
                    <span className="text-gray-600 text-[10px] ml-auto font-mono">{m.tier}</span>
                  </label>
                ))}
              </div>
            );
          })}
        </div>
      </aside>

      {/* Main area */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Prompt bar */}
        <div className="border-b border-gray-800/50 p-4 bg-[#0c0c0e]">
          {showSystem && (
            <input
              type="text"
              placeholder="System prompt (optional)"
              value={systemPrompt}
              onChange={(e) => setSystemPrompt(e.target.value)}
              className="w-full bg-gray-800/50 text-gray-300 rounded-xl px-4 py-2.5 mb-2 text-sm focus:outline-none focus:ring-1 focus:ring-gray-600 border border-gray-700/50"
            />
          )}
          <div className="flex gap-3">
            <textarea
              ref={promptRef}
              placeholder="Enter your prompt..."
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              onKeyDown={handleKeyDown}
              rows={2}
              className="flex-1 bg-gray-800/50 text-gray-100 rounded-xl px-4 py-2.5 resize-none focus:outline-none focus:ring-1 focus:ring-gray-600 border border-gray-700/50 text-sm"
            />
            <div className="flex flex-col gap-1.5">
              <button
                onClick={handleRun}
                disabled={running || !prompt.trim()}
                className="bg-white hover:bg-gray-200 disabled:opacity-30 text-black px-5 py-2.5 rounded-xl text-sm font-semibold transition-colors"
              >
                {running ? "Running..." : "Run"}
              </button>
              <button
                onClick={() => setShowSystem(!showSystem)}
                className="text-[11px] text-gray-500 hover:text-gray-300 transition-colors"
              >
                {showSystem ? "Hide" : "System"} prompt
              </button>
            </div>
          </div>
        </div>

        {/* Results */}
        <div className="flex-1 overflow-y-auto p-5">
          {cards.length === 0 && !running && (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <p className="text-gray-600 text-lg">Select models and enter a prompt</p>
                <p className="text-gray-700 text-sm mt-1">Responses will appear here side-by-side</p>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {cards.map((card) => (
              <ResponseCard key={card.label} card={card} />
            ))}
          </div>

          {/* Summary buttons */}
          {cards.length > 0 && !running && (
            <div className="flex gap-3 mt-5">
              <button
                onClick={() => handleSummary("combined")}
                disabled={summaryLoading}
                className="bg-[#d4a27a] hover:bg-[#c08a5a] disabled:opacity-40 text-[#3d2314] px-4 py-2 rounded-xl text-sm font-semibold transition-colors"
              >
                {summaryLoading ? "Generating..." : "Combined Summary"}
              </button>
              <button
                onClick={() => handleSummary("consensus")}
                disabled={summaryLoading}
                className="bg-[#d4a27a] hover:bg-[#c08a5a] disabled:opacity-40 text-[#3d2314] px-4 py-2 rounded-xl text-sm font-semibold transition-colors"
              >
                Consensus Analysis
              </button>
            </div>
          )}

          {/* Summary display — uses Claude's cream theme since Claude powers the synthesis */}
          {summary && (
            <div className={`mt-5 ${SUMMARY_THEME.card}`}>
              <div className={`${SUMMARY_THEME.header} flex items-center gap-2`}>
                <ProviderIcon provider="claude" />
                <span className={SUMMARY_THEME.headerText}>{summary.type}</span>
                <span className="text-white/60 text-xs ml-1">powered by Claude</span>
              </div>
              <div className={SUMMARY_THEME.body}>
                <div className={SUMMARY_THEME.bodyText}>
                  {summary.content}
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
