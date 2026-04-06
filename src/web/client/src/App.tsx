import { useState, useEffect, useRef, useCallback } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { fetchModels, runPrompt, fetchSummary } from "./api";
import type { ModelsResponse, ProviderName, ProviderResult, ChatMessage, SavedChat, Attachment } from "./types";

/* ───────── Provider Themes ───────── */

interface ProviderTheme {
  card: string;
  header: string;
  headerText: string;
  userBubble: string;
  userText: string;
  body: string;
  prose: string;
  meta: string;
  cursor: string;
  streamLabel: string;
  accent: string;
  sidebarText: string;
  icon: string;
  codeBlock: string;
  codeBorder: string;
}

const THEMES: Record<ProviderName, ProviderTheme> = {
  claude: {
    card: "rounded-2xl overflow-hidden shadow-lg",
    header: "bg-[#d4a27a] px-5 py-3",
    headerText: "text-[#3d2314] font-semibold text-sm tracking-wide",
    userBubble: "bg-[#efe8df] rounded-2xl px-4 py-3 ml-8",
    userText: "text-[#3d2b1f] text-sm",
    body: "bg-[#faf6f1] px-5 py-4",
    prose: "[&_h1]:text-[#3d2314] [&_h1]:text-lg [&_h1]:font-semibold [&_h1]:mb-2 [&_h1]:mt-4 [&_h2]:text-[#3d2314] [&_h2]:text-base [&_h2]:font-semibold [&_h2]:mb-2 [&_h2]:mt-3 [&_h3]:text-[#3d2314] [&_h3]:text-sm [&_h3]:font-semibold [&_h3]:mb-1 [&_h3]:mt-2 [&_p]:text-[#3d2b1f] [&_p]:text-sm [&_p]:leading-relaxed [&_p]:mb-2 [&_ul]:text-[#3d2b1f] [&_ul]:text-sm [&_ul]:ml-4 [&_ul]:mb-2 [&_ul]:list-disc [&_ol]:text-[#3d2b1f] [&_ol]:text-sm [&_ol]:ml-4 [&_ol]:mb-2 [&_ol]:list-decimal [&_li]:mb-1 [&_strong]:text-[#3d2314] [&_a]:text-[#b07040] [&_a]:underline [&_blockquote]:border-l-2 [&_blockquote]:border-[#d4a27a] [&_blockquote]:pl-3 [&_blockquote]:italic [&_blockquote]:text-[#6b5a4e] [&_hr]:border-[#e0d5c8] [&_hr]:my-3 [&_table]:text-sm [&_table]:w-full [&_th]:text-left [&_th]:pb-1 [&_th]:border-b [&_th]:border-[#d4c8b8] [&_td]:py-1 [&_td]:border-b [&_td]:border-[#ece4da]",
    meta: "text-[#a08060] text-xs",
    cursor: "bg-[#d4a27a]",
    streamLabel: "text-[#d4a27a]",
    accent: "accent-[#d4a27a]",
    sidebarText: "text-[#d4a27a]",
    icon: "C",
    codeBlock: "bg-[#2d2214] text-[#f0e6d6] rounded-lg p-3 text-xs font-mono overflow-x-auto my-2",
    codeBorder: "bg-[#f0e6d6] text-[#6b4c2a] rounded px-1.5 py-0.5 text-xs font-mono",
  },
  openai: {
    card: "rounded-2xl overflow-hidden shadow-lg",
    header: "bg-[#2a2a2a] px-5 py-3",
    headerText: "text-[#10a37f] font-semibold text-sm tracking-wide",
    userBubble: "bg-[#2f2f2f] rounded-2xl px-4 py-3 ml-8",
    userText: "text-[#ececec] text-sm",
    body: "bg-[#212121] px-5 py-4",
    prose: "[&_h1]:text-white [&_h1]:text-lg [&_h1]:font-semibold [&_h1]:mb-2 [&_h1]:mt-4 [&_h2]:text-white [&_h2]:text-base [&_h2]:font-semibold [&_h2]:mb-2 [&_h2]:mt-3 [&_h3]:text-white [&_h3]:text-sm [&_h3]:font-semibold [&_h3]:mb-1 [&_h3]:mt-2 [&_p]:text-[#ececec] [&_p]:text-sm [&_p]:leading-relaxed [&_p]:mb-2 [&_ul]:text-[#ececec] [&_ul]:text-sm [&_ul]:ml-4 [&_ul]:mb-2 [&_ul]:list-disc [&_ol]:text-[#ececec] [&_ol]:text-sm [&_ol]:ml-4 [&_ol]:mb-2 [&_ol]:list-decimal [&_li]:mb-1 [&_strong]:text-white [&_a]:text-[#10a37f] [&_a]:underline [&_blockquote]:border-l-2 [&_blockquote]:border-[#10a37f] [&_blockquote]:pl-3 [&_blockquote]:italic [&_blockquote]:text-[#aaa] [&_hr]:border-[#444] [&_hr]:my-3 [&_table]:text-sm [&_table]:w-full [&_th]:text-left [&_th]:pb-1 [&_th]:border-b [&_th]:border-[#444] [&_th]:text-white [&_td]:py-1 [&_td]:border-b [&_td]:border-[#333]",
    meta: "text-[#8e8ea0] text-xs",
    cursor: "bg-[#10a37f]",
    streamLabel: "text-[#10a37f]",
    accent: "accent-[#10a37f]",
    sidebarText: "text-[#10a37f]",
    icon: "G",
    codeBlock: "bg-[#1a1a1a] text-[#e6e6e6] rounded-lg p-3 text-xs font-mono overflow-x-auto my-2 border border-[#333]",
    codeBorder: "bg-[#1a1a1a] text-[#e6e6e6] rounded px-1.5 py-0.5 text-xs font-mono",
  },
  gemini: {
    card: "rounded-2xl overflow-hidden shadow-lg",
    header: "bg-[#282a2c] px-5 py-3",
    headerText: "text-[#8ab4f8] font-semibold text-sm tracking-wide",
    userBubble: "bg-[#303134] rounded-2xl px-4 py-3 ml-8",
    userText: "text-[#e3e3e3] text-sm",
    body: "bg-[#1e1f20] px-5 py-4",
    prose: "[&_h1]:text-white [&_h1]:text-lg [&_h1]:font-semibold [&_h1]:mb-2 [&_h1]:mt-4 [&_h2]:text-white [&_h2]:text-base [&_h2]:font-semibold [&_h2]:mb-2 [&_h2]:mt-3 [&_h3]:text-white [&_h3]:text-sm [&_h3]:font-semibold [&_h3]:mb-1 [&_h3]:mt-2 [&_p]:text-[#e3e3e3] [&_p]:text-sm [&_p]:leading-relaxed [&_p]:mb-2 [&_ul]:text-[#e3e3e3] [&_ul]:text-sm [&_ul]:ml-4 [&_ul]:mb-2 [&_ul]:list-disc [&_ol]:text-[#e3e3e3] [&_ol]:text-sm [&_ol]:ml-4 [&_ol]:mb-2 [&_ol]:list-decimal [&_li]:mb-1 [&_strong]:text-white [&_a]:text-[#8ab4f8] [&_a]:underline [&_blockquote]:border-l-2 [&_blockquote]:border-[#8ab4f8] [&_blockquote]:pl-3 [&_blockquote]:italic [&_blockquote]:text-[#aaa] [&_hr]:border-[#444] [&_hr]:my-3 [&_table]:text-sm [&_table]:w-full [&_th]:text-left [&_th]:pb-1 [&_th]:border-b [&_th]:border-[#444] [&_th]:text-white [&_td]:py-1 [&_td]:border-b [&_td]:border-[#333]",
    meta: "text-[#8e8ea0] text-xs",
    cursor: "bg-[#8ab4f8]",
    streamLabel: "text-[#8ab4f8]",
    accent: "accent-[#8ab4f8]",
    sidebarText: "text-[#8ab4f8]",
    icon: "G",
    codeBlock: "bg-[#282a2c] text-[#e3e3e3] rounded-lg p-3 text-xs font-mono overflow-x-auto my-2 border border-[#3c4043]",
    codeBorder: "bg-[#282a2c] text-[#8ab4f8] rounded px-1.5 py-0.5 text-xs font-mono",
  },
  grok: {
    card: "rounded-2xl overflow-hidden shadow-lg",
    header: "bg-[#18181b] px-5 py-3 border-b border-[#27272a]",
    headerText: "text-[#f97316] font-semibold text-sm tracking-wide",
    userBubble: "bg-[#18181b] rounded-2xl px-4 py-3 ml-8 border border-[#27272a]",
    userText: "text-[#fafafa] text-sm",
    body: "bg-[#09090b] px-5 py-4",
    prose: "[&_h1]:text-white [&_h1]:text-lg [&_h1]:font-semibold [&_h1]:mb-2 [&_h1]:mt-4 [&_h2]:text-white [&_h2]:text-base [&_h2]:font-semibold [&_h2]:mb-2 [&_h2]:mt-3 [&_h3]:text-white [&_h3]:text-sm [&_h3]:font-semibold [&_h3]:mb-1 [&_h3]:mt-2 [&_p]:text-[#fafafa] [&_p]:text-sm [&_p]:leading-relaxed [&_p]:mb-2 [&_ul]:text-[#fafafa] [&_ul]:text-sm [&_ul]:ml-4 [&_ul]:mb-2 [&_ul]:list-disc [&_ol]:text-[#fafafa] [&_ol]:text-sm [&_ol]:ml-4 [&_ol]:mb-2 [&_ol]:list-decimal [&_li]:mb-1 [&_strong]:text-white [&_a]:text-[#f97316] [&_a]:underline [&_blockquote]:border-l-2 [&_blockquote]:border-[#f97316] [&_blockquote]:pl-3 [&_blockquote]:italic [&_blockquote]:text-[#aaa] [&_hr]:border-[#27272a] [&_hr]:my-3 [&_table]:text-sm [&_table]:w-full [&_th]:text-left [&_th]:pb-1 [&_th]:border-b [&_th]:border-[#27272a] [&_th]:text-white [&_td]:py-1 [&_td]:border-b [&_td]:border-[#1c1c1f]",
    meta: "text-[#71717a] text-xs",
    cursor: "bg-[#f97316]",
    streamLabel: "text-[#f97316]",
    accent: "accent-[#f97316]",
    sidebarText: "text-[#f97316]",
    icon: "X",
    codeBlock: "bg-[#18181b] text-[#fafafa] rounded-lg p-3 text-xs font-mono overflow-x-auto my-2 border border-[#27272a]",
    codeBorder: "bg-[#18181b] text-[#f97316] rounded px-1.5 py-0.5 text-xs font-mono border border-[#27272a]",
  },
};

const PROVIDER_DISPLAY: Record<ProviderName, string> = {
  claude: "Claude",
  openai: "ChatGPT",
  gemini: "Gemini",
  grok: "Grok",
};

/* ───────── Chat History helpers ───────── */

const STORAGE_KEY = "aiwrapper_chats";

function loadChats(): SavedChat[] {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
  } catch { return []; }
}

function saveChats(chats: SavedChat[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(chats));
}

/* ───────── Components ───────── */

interface Turn {
  role: "user" | "assistant";
  content: string;
  provider?: ProviderName;
  result?: ProviderResult;
  streaming?: boolean;
}

function ProviderIcon({ provider }: { provider: ProviderName }) {
  const colors: Record<ProviderName, string> = {
    claude: "bg-[#d4a27a] text-[#3d2314]",
    openai: "bg-[#10a37f] text-white",
    gemini: "bg-[#8ab4f8] text-[#1e1f20]",
    grok: "bg-[#f97316] text-black",
  };
  return (
    <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold mr-2 shrink-0 ${colors[provider]}`}>
      {THEMES[provider].icon}
    </span>
  );
}

function MarkdownContent({ content, theme }: { content: string; theme: ProviderTheme }) {
  return (
    <div className={theme.prose}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          code({ className, children, ...props }) {
            const isBlock = className?.includes("language-");
            if (isBlock) {
              return <pre className={theme.codeBlock}><code {...props}>{children}</code></pre>;
            }
            return <code className={theme.codeBorder} {...props}>{children}</code>;
          },
          pre({ children }) {
            return <>{children}</>;
          },
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}

/* ───────── Main App ───────── */

export default function App() {
  const [modelsData, setModelsData] = useState<ModelsResponse | null>(null);
  const [selectedModels, setSelectedModels] = useState<string[]>([]);
  const [prompt, setPrompt] = useState("");
  const [systemPrompt, setSystemPrompt] = useState("");
  const [showSystem, setShowSystem] = useState(false);
  const [running, setRunning] = useState(false);

  // Per-provider turn history: provider -> Turn[]
  const [providerTurns, setProviderTurns] = useState<Record<string, Turn[]>>({});
  const [summary, setSummary] = useState<{ type: string; content: string } | null>(null);
  const [consensus, setConsensus] = useState<{ type: string; content: string } | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [expandedCards, setExpandedCards] = useState<Set<string>>(new Set());

  // Conversation message history (for multi-turn)
  const conversationRef = useRef<ChatMessage[]>([]);
  const allResults = useRef<ProviderResult[]>([]);
  const lastPrompt = useRef("");

  // Chat history
  const [savedChats, setSavedChats] = useState<SavedChat[]>(loadChats());
  const [currentChatId, setCurrentChatId] = useState<string | null>(null);
  const [showHistory, setShowHistory] = useState(false);

  // Mobile sidebar
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // File attachments
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Client-side streaming timeout — mark streams as done if no token in 120s
  const lastTokenTime = useRef<Record<string, number>>({});
  const STREAM_IDLE_TIMEOUT = 120_000;

  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      setProviderTurns((prev) => {
        let changed = false;
        const next = { ...prev };
        for (const label of Object.keys(next)) {
          const lastTime = lastTokenTime.current[label];
          const hasStreaming = next[label].some((t) => t.streaming);
          if (hasStreaming && lastTime && now - lastTime > STREAM_IDLE_TIMEOUT) {
            changed = true;
            next[label] = next[label].map((t) =>
              t.streaming ? { ...t, streaming: false } : t
            );
            delete lastTokenTime.current[label];
          }
        }
        return changed ? next : prev;
      });
    }, 5_000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    fetchModels().then((data) => {
      setModelsData(data);
      const defaults: string[] = [];
      for (const provider of data.availableProviders) {
        const balanced = data.models[provider].find((m) => m.tier === "balanced");
        if (balanced) defaults.push(balanced.id);
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

  // Save current conversation to localStorage
  const saveCurrentChat = useCallback(() => {
    if (conversationRef.current.length === 0) return;

    const id = currentChatId || crypto.randomUUID();
    const title = conversationRef.current[0]?.content.slice(0, 60) || "Untitled";
    const chat: SavedChat = {
      id,
      title,
      timestamp: Date.now(),
      messages: conversationRef.current,
      selectedModels,
      systemPrompt: showSystem ? systemPrompt : undefined,
    };

    const chats = loadChats().filter((c) => c.id !== id);
    chats.unshift(chat);
    if (chats.length > 50) chats.length = 50; // Keep last 50
    saveChats(chats);
    setSavedChats(chats);
    setCurrentChatId(id);
  }, [currentChatId, selectedModels, systemPrompt, showSystem]);

  const loadChat = (chat: SavedChat) => {
    conversationRef.current = chat.messages;
    setCurrentChatId(chat.id);
    setSelectedModels(chat.selectedModels);
    if (chat.systemPrompt) {
      setSystemPrompt(chat.systemPrompt);
      setShowSystem(true);
    }
    setShowHistory(false);

    // Rebuild provider turns from messages
    const turns: Record<string, Turn[]> = {};
    // We don't have per-provider history in saved chats, so show a merged view
    for (let i = 0; i < chat.messages.length; i++) {
      const msg = chat.messages[i];
      if (msg.role === "user") {
        // Add user turn to all providers
        for (const model of chat.selectedModels) {
          if (!turns[model]) turns[model] = [];
          // Avoid duplicate user messages if next is also user
        }
      }
    }
    // For simplicity, clear provider turns and let user continue the conversation
    setProviderTurns({});
    setSummary(null);
  };

  const startNewChat = () => {
    if (conversationRef.current.length > 0) {
      saveCurrentChat();
    }
    conversationRef.current = [];
    allResults.current = [];
    setProviderTurns({});
    setSummary(null);
    setConsensus(null);
    setExpandedCards(new Set());
    setCurrentChatId(null);
    setPrompt("");
  };

  const deleteChat = (id: string) => {
    const chats = loadChats().filter((c) => c.id !== id);
    saveChats(chats);
    setSavedChats(chats);
    if (currentChatId === id) {
      startNewChat();
    }
  };

  const handleRun = useCallback(() => {
    if (!prompt.trim() || running) return;

    setRunning(true);
    setSummary(null);
    setConsensus(null);
    allResults.current = [];
    lastPrompt.current = prompt;

    const userPrompt = prompt;
    const currentAttachments = attachments.length > 0 ? [...attachments] : undefined;
    setPrompt("");
    setAttachments([]);

    // User turns are added per-provider when streaming/results arrive (keyed by label)

    const cancel = runPrompt({
      prompt: userPrompt,
      systemPrompt: showSystem ? systemPrompt : undefined,
      messages: conversationRef.current.length > 0 ? conversationRef.current : undefined,
      attachments: currentAttachments,
      models: selectedModels.length > 0 ? selectedModels : undefined,
      onStreamStart: (label, provider) => {
        lastTokenTime.current[label] = Date.now();
        setProviderTurns((prev) => {
          const next = { ...prev };
          const existing = next[label] || [];
          next[label] = [
            ...existing,
            { role: "user" as const, content: userPrompt },
            { role: "assistant" as const, content: "", provider: provider as ProviderName, streaming: true },
          ];
          return next;
        });
      },
      onStreamToken: (label, token) => {
        lastTokenTime.current[label] = Date.now();
        setProviderTurns((prev) => {
          const turns = prev[label];
          if (!turns) return prev;
          const last = turns[turns.length - 1];
          if (last?.role === "assistant" && last.streaming) {
            const updated = [...turns];
            updated[updated.length - 1] = { ...last, content: last.content + token };
            return { ...prev, [label]: updated };
          }
          return prev;
        });
      },
      onStreamEnd: (result) => {
        allResults.current.push(result);
        setProviderTurns((prev) => {
          const turns = prev[result.label];
          if (!turns) return prev;
          const updated = [...turns];
          const lastIdx = updated.length - 1;
          if (updated[lastIdx]?.role === "assistant") {
            updated[lastIdx] = { ...updated[lastIdx], content: result.content, streaming: false, result };
          }
          return { ...prev, [result.label]: updated };
        });

        // Update conversation history with first successful response
        if (result.status === "success" && conversationRef.current[conversationRef.current.length - 1]?.role !== "assistant") {
          if (!conversationRef.current.some((m) => m.role === "user" && m.content === userPrompt)) {
            conversationRef.current.push({ role: "user", content: userPrompt });
          }
          conversationRef.current.push({ role: "assistant", content: result.content });
          saveCurrentChat();
        }
      },
      onResult: (result) => {
        allResults.current.push(result);
        setProviderTurns((prev) => {
          const next = { ...prev };
          if (!next[result.label]) next[result.label] = [];
          // Add user turn if not already there
          const turns = next[result.label];
          if (!turns.length || turns[turns.length - 1].role !== "user") {
            turns.push({ role: "user", content: userPrompt });
          }
          next[result.label] = [
            ...turns,
            {
              role: "assistant",
              content: result.status === "success" ? result.content : "",
              provider: result.provider,
              streaming: false,
              result,
            },
          ];
          return next;
        });

        // Save conversation for non-streaming results too
        if (result.status === "success" && conversationRef.current[conversationRef.current.length - 1]?.role !== "assistant") {
          if (!conversationRef.current.some((m) => m.role === "user" && m.content === userPrompt)) {
            conversationRef.current.push({ role: "user", content: userPrompt });
          }
          conversationRef.current.push({ role: "assistant", content: result.content });
          saveCurrentChat();
        }
      },
      onDone: async (results) => {
        setRunning(false);

        // Mark all streams as done in case onStreamEnd didn't fire
        setProviderTurns((prev) => {
          const next = { ...prev };
          for (const label of Object.keys(next)) {
            next[label] = next[label].map((t) =>
              t.streaming ? { ...t, streaming: false } : t
            );
          }
          return next;
        });

        // Save in case onStreamEnd didn't fire
        if (conversationRef.current.length > 0) {
          saveCurrentChat();
        }

        // Auto-generate summary if multiple providers responded
        const successes = results.filter((r) => r.status === "success");
        if (successes.length >= 2) {
          setSummaryLoading(true);
          try {
            const summaryContent = await fetchSummary(userPrompt, results, "combined");
            setSummary({ type: "combined", content: summaryContent });
            setExpandedCards((prev) => new Set([...prev, "__summary"]));
          } catch (err) {
            console.error(err);
          }
          setSummaryLoading(false);
        }
      },
      onError: (error) => {
        console.error(error);
        setRunning(false);
      },
    });

    void cancel;
  }, [prompt, systemPrompt, showSystem, selectedModels, running, saveCurrentChat]);

  // Check if any provider is still streaming
  const anyStreaming = Object.values(providerTurns).some((turns) =>
    turns.some((t) => t.streaming)
  );

  // Collect results from providerTurns (fallback when onStreamEnd events are lost)
  function collectResults(turns: Record<string, Turn[]>): ProviderResult[] {
    const results: ProviderResult[] = [];
    for (const [label, t] of Object.entries(turns)) {
      const last = [...t].reverse().find((x) => x.role === "assistant");
      if (!last || (!last.content && !last.result)) continue;
      if (last.result) {
        results.push(last.result);
      } else if (last.content) {
        results.push({
          provider: last.provider || "claude",
          model: "", label, status: "success",
          content: last.content, latencyMs: 0,
        });
      }
    }
    return results;
  }

  // Fallback: poll to auto-summarize if all models finished but onDone never fired
  const summarizeTriggered = useRef(false);
  const runningRef = useRef(false);
  const summaryRef = useRef<{ type: string; content: string } | null>(null);
  runningRef.current = running;
  summaryRef.current = summary;

  useEffect(() => {
    const interval = setInterval(() => {
      if (!runningRef.current) {
        // If not running but still have stuck streams, clear them
        setProviderTurns((current) => {
          const hasStuck = Object.values(current).some((turns) => turns.some((t) => t.streaming));
          if (!hasStuck) return current;
          const next = { ...current };
          for (const label of Object.keys(next)) {
            next[label] = next[label].map((t) => t.streaming ? { ...t, streaming: false } : t);
          }
          return next;
        });
        return;
      }
      if (summarizeTriggered.current) return;

      setProviderTurns((current) => {
        const activeLabels = Object.keys(current).filter((k) => current[k].length > 0);
        if (activeLabels.length === 0) return current;
        const stillStreaming = Object.values(current).some((turns) => turns.some((t) => t.streaming));

        const results = collectResults(current);
        const successes = results.filter((r) => r.status === "success");
        const allDone = !stillStreaming;

        if (!allDone && successes.length < 2) return current;
        if (!allDone && successes.length < activeLabels.length) return current;

        summarizeTriggered.current = true;
        setRunning(false);

        const next = stillStreaming ? { ...current } : current;
        if (stillStreaming) {
          for (const label of Object.keys(next)) {
            next[label] = next[label].map((t) => t.streaming ? { ...t, streaming: false } : t);
          }
        }

        if (successes.length >= 2 && !summaryRef.current) {
          setSummaryLoading(true);
          fetchSummary(lastPrompt.current, results, "combined").then((content) => {
            setSummary({ type: "combined", content });
            setExpandedCards((prev) => new Set([...prev, "__summary"]));
          }).catch(console.error).finally(() => setSummaryLoading(false));
        }

        return stillStreaming ? next : current;
      });
    }, 3_000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (running) summarizeTriggered.current = false;
  }, [running]);

  // Manual summarize — stop waiting for stuck models and summarize what we have
  const handleSummarizeNow = useCallback(async () => {
    // Mark all streaming turns as done
    setProviderTurns((prev) => {
      const next = { ...prev };
      for (const label of Object.keys(next)) {
        next[label] = next[label].map((t) =>
          t.streaming ? { ...t, streaming: false } : t
        );
      }
      return next;
    });
    setRunning(false);

    const results = collectResults(providerTurns);
    const successes = results.filter((r) => r.status === "success");
    if (successes.length >= 2) {
      setSummaryLoading(true);
      try {
        const summaryContent = await fetchSummary(lastPrompt.current, results, "combined");
        setSummary({ type: "combined", content: summaryContent });
        setExpandedCards((prev) => new Set([...prev, "__summary"]));
      } catch (err) {
        console.error(err);
      }
      setSummaryLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [providerTurns]);

  // Manual consensus comparison
  const handleConsensus = useCallback(async () => {
    const results = collectResults(providerTurns);
    const successes = results.filter((r) => r.status === "success");
    if (successes.length < 2) return;

    setSummaryLoading(true);
    try {
      const consensusContent = await fetchSummary(lastPrompt.current, results, "consensus");
      setConsensus({ type: "consensus", content: consensusContent });
      setExpandedCards((prev) => new Set([...prev, "__consensus"]));
    } catch (err) {
      console.error(err);
    }
    setSummaryLoading(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [providerTurns]);

  const TEXT_EXTENSIONS = new Set([
    "text/plain", "text/csv", "text/markdown", "text/html", "text/xml",
    "application/json", "application/xml",
  ]);
  const CODE_EXTENSIONS = /\.(js|ts|tsx|jsx|py|rb|go|rs|java|c|cpp|h|hpp|cs|swift|kt|sh|bash|zsh|yaml|yml|toml|ini|cfg|sql|r|m|php|pl|lua|zig|dart|scala|ex|exs|hs|clj|erl|elm|vue|svelte)$/i;
  const DOCX_MIME = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
  const XLSX_MIMES = new Set([
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "application/vnd.ms-excel",
  ]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    for (const file of Array.from(files)) {
      const isImage = file.type.startsWith("image/");
      const isPdf = file.type === "application/pdf";
      const isText = TEXT_EXTENSIONS.has(file.type) || CODE_EXTENSIONS.test(file.name);
      const isDocx = file.type === DOCX_MIME || file.name.endsWith(".docx");
      const isXlsx = XLSX_MIMES.has(file.type) || file.name.endsWith(".xlsx") || file.name.endsWith(".xls");

      if (isImage || isPdf) {
        const reader = new FileReader();
        reader.onload = () => {
          const base64 = (reader.result as string).split(",")[1];
          setAttachments((prev) => [...prev, {
            type: isImage ? "image" : "pdf",
            mimeType: file.type,
            data: base64,
            name: file.name,
          }]);
        };
        reader.readAsDataURL(file);
      } else if (isText) {
        const reader = new FileReader();
        reader.onload = () => {
          setAttachments((prev) => [...prev, {
            type: "text",
            mimeType: file.type || "text/plain",
            data: reader.result as string,
            name: file.name,
          }]);
        };
        reader.readAsText(file);
      } else if (isDocx || isXlsx) {
        const reader = new FileReader();
        reader.onload = async () => {
          const base64 = (reader.result as string).split(",")[1];
          try {
            const res = await fetch("/api/parse-file", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ data: base64, mimeType: file.type, name: file.name }),
            });
            const result = await res.json();
            if (res.ok) {
              setAttachments((prev) => [...prev, {
                type: "text",
                mimeType: file.type,
                data: result.text,
                name: file.name,
              }]);
            }
          } catch { /* ignore parse errors */ }
        };
        reader.readAsDataURL(file);
      }
    }

    e.target.value = "";
  };

  const removeAttachment = (index: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index));
  };

  // Clipboard paste — images
  const handlePaste = useCallback((e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;

    for (const item of Array.from(items)) {
      if (item.type.startsWith("image/")) {
        e.preventDefault();
        const file = item.getAsFile();
        if (!file) continue;
        const reader = new FileReader();
        reader.onload = () => {
          const base64 = (reader.result as string).split(",")[1];
          setAttachments((prev) => [...prev, {
            type: "image",
            mimeType: file.type,
            data: base64,
            name: "pasted-image.png",
          }]);
        };
        reader.readAsDataURL(file);
      }
    }
  }, []);

  // Voice input
  const [listening, setListening] = useState(false);
  const recognitionRef = useRef<ReturnType<typeof Object> | null>(null);

  const toggleVoice = useCallback(() => {
    const SpeechRecognition = (window as unknown as Record<string, unknown>).SpeechRecognition
      || (window as unknown as Record<string, unknown>).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Speech recognition is not supported in this browser.");
      return;
    }

    if (listening && recognitionRef.current) {
      (recognitionRef.current as { stop: () => void }).stop();
      setListening(false);
      return;
    }

    const recognition = new (SpeechRecognition as new () => {
      continuous: boolean;
      interimResults: boolean;
      lang: string;
      onresult: ((e: { results: { transcript: string; isFinal: boolean }[][] }) => void) | null;
      onend: (() => void) | null;
      onerror: (() => void) | null;
      start: () => void;
      stop: () => void;
    })();
    recognition.continuous = true;
    recognition.interimResults = false;
    recognition.lang = "en-US";

    recognition.onresult = (e) => {
      let transcript = "";
      for (let i = 0; i < e.results.length; i++) {
        transcript += e.results[i][0].transcript;
      }
      setPrompt((prev) => prev + (prev ? " " : "") + transcript);
    };
    recognition.onend = () => setListening(false);
    recognition.onerror = () => setListening(false);

    recognitionRef.current = recognition;
    recognition.start();
    setListening(true);
  }, [listening]);

  // URL input
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [urlValue, setUrlValue] = useState("");
  const [urlLoading, setUrlLoading] = useState(false);

  const handleUrlFetch = async () => {
    if (!urlValue.trim()) return;
    setUrlLoading(true);
    try {
      const res = await fetch("/api/fetch-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: urlValue.trim() }),
      });
      const result = await res.json();
      if (res.ok) {
        setAttachments((prev) => [...prev, {
          type: "text",
          mimeType: "text/html",
          data: result.text,
          name: urlValue.trim(),
        }]);
        setUrlValue("");
        setShowUrlInput(false);
      }
    } catch { /* ignore */ }
    setUrlLoading(false);
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

  const activeProviders = Object.keys(providerTurns).filter((k) => providerTurns[k].length > 0);

  return (
    <div className="flex h-screen bg-gray-950">
      {/* Mobile backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-30 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`fixed inset-y-0 left-0 z-40 w-72 bg-[#111113] border-r border-gray-800/50 flex flex-col transform transition-transform duration-200 ease-in-out md:relative md:translate-x-0 ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}`}>
        <div className="p-5 border-b border-gray-800/50">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-lg font-bold text-white tracking-tight">AI Wrapper</h1>
              <p className="text-xs text-gray-500 mt-1">Multi-LLM Prompt Runner</p>
            </div>
            <button
              onClick={() => setSidebarOpen(false)}
              className="md:hidden text-gray-400 hover:text-white p-1"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </button>
          </div>
          <div className="flex gap-2 mt-3">
            <button
              onClick={() => { startNewChat(); setSidebarOpen(false); }}
              className="flex-1 bg-white/10 hover:bg-white/15 text-white text-xs px-3 py-2 rounded-lg transition-colors"
            >
              New Chat
            </button>
            <button
              onClick={() => setShowHistory(!showHistory)}
              className="flex-1 bg-white/10 hover:bg-white/15 text-white text-xs px-3 py-2 rounded-lg transition-colors"
            >
              {showHistory ? "Models" : "History"}
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {showHistory ? (
            <div className="space-y-1">
              <p className="text-xs text-gray-500 mb-2">Previous Chats</p>
              {savedChats.length === 0 && (
                <p className="text-xs text-gray-600">No saved chats yet.</p>
              )}
              {savedChats.map((chat) => (
                <div
                  key={chat.id}
                  className={`flex items-center justify-between px-3 py-2 rounded-lg cursor-pointer transition-colors text-sm ${
                    currentChatId === chat.id ? "bg-white/10 text-white" : "text-gray-400 hover:bg-white/5"
                  }`}
                >
                  <div className="flex-1 truncate mr-2" onClick={() => { loadChat(chat); setSidebarOpen(false); }}>
                    <p className="truncate">{chat.title}</p>
                    <p className="text-[10px] text-gray-600">{new Date(chat.timestamp).toLocaleDateString()}</p>
                  </div>
                  <button
                    onClick={() => deleteChat(chat.id)}
                    className="text-gray-600 hover:text-red-400 text-xs shrink-0"
                  >
                    x
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-5">
              {/* Preset tier buttons */}
              <div className="flex gap-1.5">
                {(["flagship", "balanced", "fast"] as const).map((tier) => {
                  const tierModels = (Object.keys(modelsData.models) as ProviderName[]).flatMap(
                    (p) => {
                      if (!modelsData.availableProviders.includes(p)) return [];
                      const first = modelsData.models[p].find((m) => m.tier === tier);
                      return first ? [first.id] : [];
                    }
                  );
                  const allSelected = tierModels.length > 0 && tierModels.every((id) => selectedModels.includes(id));
                  return (
                    <button
                      key={tier}
                      onClick={() => setSelectedModels(allSelected ? [] : tierModels)}
                      className={`flex-1 text-xs px-2 py-1.5 rounded-lg transition-colors font-medium capitalize ${
                        allSelected
                          ? "bg-white/20 text-white"
                          : "bg-white/5 text-gray-400 hover:bg-white/10 hover:text-gray-200"
                      }`}
                    >
                      {tier}
                    </button>
                  );
                })}
              </div>
              {(() => {
                const heavyModels = (Object.keys(modelsData.models) as ProviderName[]).flatMap((p) => {
                  if (!modelsData.availableProviders.includes(p)) return [];
                  if (p === "grok") return modelsData.models[p].filter((m) => m.tier === "max").map((m) => m.id);
                  return modelsData.models[p].filter((m) => m.tier === "flagship").map((m) => m.id);
                });
                const allSelected = heavyModels.length > 0 && heavyModels.every((id) => selectedModels.includes(id));
                return (
                  <button
                    onClick={() => setSelectedModels(allSelected ? [] : heavyModels)}
                    className={`w-full text-xs px-2 py-1.5 rounded-lg transition-colors font-medium mt-1.5 ${
                      allSelected
                        ? "bg-white/20 text-white"
                        : "bg-white/5 text-gray-400 hover:bg-white/10 hover:text-gray-200"
                    }`}
                  >
                    Heavy
                  </button>
                );
              })()}

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
          )}
        </div>
      </aside>

      {/* Main area */}
      <main className="flex-1 flex flex-col overflow-hidden min-w-0">
        {/* Mobile header */}
        <div className="md:hidden flex items-center gap-3 px-4 py-3 border-b border-gray-800/50 bg-[#0c0c0e]">
          <button
            onClick={() => setSidebarOpen(true)}
            className="text-gray-400 hover:text-white p-1"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <h1 className="text-sm font-bold text-white">AI Wrapper</h1>
        </div>

        {/* Results */}
        <div className="flex-1 overflow-y-auto p-3 md:p-5">
          {activeProviders.length === 0 && !running && !summary && (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <p className="text-gray-600 text-lg">Select models and enter a prompt</p>
                <p className="text-gray-700 text-sm mt-1">Summary and consensus appear automatically</p>
              </div>
            </div>
          )}

          {/* Waiting for first response */}
          {running && activeProviders.length === 0 && (
            <div className="flex items-center justify-center h-full">
              <div className="flex flex-col items-center gap-4">
                <div className="relative w-12 h-12">
                  <div className="absolute inset-0 rounded-full border-2 border-gray-700" />
                  <div className="absolute inset-0 rounded-full border-2 border-t-[#d4a27a] border-r-[#10a37f] border-b-[#8ab4f8] border-l-[#f97316] animate-spin" />
                </div>
                <p className="text-gray-400 text-sm animate-pulse">Waiting for responses...</p>
              </div>
            </div>
          )}

          {/* Still waiting for models / summarize button */}
          {(running || anyStreaming) && activeProviders.length > 0 && (
            <div className="flex items-center gap-3 mb-4 px-2">
              <div className="w-4 h-4 border-2 border-t-[#d4a27a] border-r-[#10a37f] border-b-[#8ab4f8] border-l-[#f97316] rounded-full animate-spin shrink-0" />
              <span className="text-gray-400 text-sm">Waiting for all models...</span>
              {allResults.current.length >= 2 && (
                <button
                  onClick={handleSummarizeNow}
                  className="bg-white/10 hover:bg-white/15 text-white text-xs px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap"
                >
                  Summarize Now
                </button>
              )}
            </div>
          )}

          {/* Compare button — available after models finish, if no consensus yet */}
          {!running && !anyStreaming && !consensus && !summaryLoading && activeProviders.length >= 2 && allResults.current.length >= 2 && (
            <div className="flex items-center gap-3 mb-4 px-2">
              <button
                onClick={handleConsensus}
                className="bg-white/10 hover:bg-white/15 text-white text-xs px-3 py-1.5 rounded-lg transition-colors"
              >
                Compare &amp; Find Consensus
              </button>
            </div>
          )}

          {/* Loading indicator while generating summaries */}
          {summaryLoading && (
            <div className="flex items-center gap-3 mb-5 px-2">
              <div className="w-4 h-4 border-2 border-[#d4a27a] border-t-transparent rounded-full animate-spin" />
              <span className="text-gray-400 text-sm">Generating summary and consensus...</span>
            </div>
          )}

          {/* Combined Summary — collapsible */}
          {summary && (
            <div className="mb-2">
              <button
                onClick={() => {
                  setExpandedCards((prev) => {
                    const next = new Set(prev);
                    if (next.has("__summary")) next.delete("__summary");
                    else next.add("__summary");
                    return next;
                  });
                }}
                className={`w-full flex items-center justify-between px-4 py-3 rounded-xl transition-colors ${
                  expandedCards.has("__summary") ? "bg-[#c08a5a]" : "bg-gray-800/50 hover:bg-gray-800"
                }`}
              >
                <div className="flex items-center gap-2">
                  <ProviderIcon provider="claude" />
                  <span className={expandedCards.has("__summary") ? "text-white font-semibold text-sm" : "text-sm font-medium text-[#d4a27a]"}>
                    Combined Summary
                  </span>
                  <span className={expandedCards.has("__summary") ? "text-white/60 text-xs" : "text-gray-500 text-xs"}>powered by Claude</span>
                </div>
                <span className="text-gray-500 text-xs">{expandedCards.has("__summary") ? "▼" : "▶"}</span>
              </button>
              {expandedCards.has("__summary") && (
                <div className="mt-1 rounded-2xl overflow-hidden shadow-lg">
                  <div className="bg-[#faf6f1] px-5 py-4">
                    <MarkdownContent content={summary.content} theme={THEMES.claude} />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Consensus Analysis — collapsible */}
          {consensus && (
            <div className="mb-2">
              <button
                onClick={() => {
                  setExpandedCards((prev) => {
                    const next = new Set(prev);
                    if (next.has("__consensus")) next.delete("__consensus");
                    else next.add("__consensus");
                    return next;
                  });
                }}
                className={`w-full flex items-center justify-between px-4 py-3 rounded-xl transition-colors ${
                  expandedCards.has("__consensus") ? "bg-[#8b6a3e]" : "bg-gray-800/50 hover:bg-gray-800"
                }`}
              >
                <div className="flex items-center gap-2">
                  <ProviderIcon provider="claude" />
                  <span className={expandedCards.has("__consensus") ? "text-white font-semibold text-sm" : "text-sm font-medium text-[#d4a27a]"}>
                    Consensus Analysis
                  </span>
                  <span className={expandedCards.has("__consensus") ? "text-white/60 text-xs" : "text-gray-500 text-xs"}>powered by Claude</span>
                </div>
                <span className="text-gray-500 text-xs">{expandedCards.has("__consensus") ? "▼" : "▶"}</span>
              </button>
              {expandedCards.has("__consensus") && (
                <div className="mt-1 rounded-2xl overflow-hidden shadow-lg">
                  <div className="bg-[#faf6f1] px-5 py-4">
                    <MarkdownContent content={consensus.content} theme={THEMES.claude} />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Individual AI responses — collapsible */}
          {activeProviders.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs text-gray-500 mb-2 px-1">Individual AI Responses</p>
              {activeProviders.map((label) => {
                const turns = providerTurns[label];
                const provider = turns.find((t) => t.provider)?.provider || "claude";
                const theme = THEMES[provider];
                const isExpanded = expandedCards.has(label);
                const lastAssistant = [...turns].reverse().find((t) => t.role === "assistant");
                const isStreaming = lastAssistant?.streaming;

                return (
                  <div key={label}>
                    {/* Collapsed header — always visible */}
                    <button
                      onClick={() => {
                        setExpandedCards((prev) => {
                          const next = new Set(prev);
                          if (next.has(label)) next.delete(label);
                          else next.add(label);
                          return next;
                        });
                      }}
                      className={`w-full flex items-center justify-between px-4 py-3 rounded-xl transition-colors ${
                        isExpanded ? theme.header : "bg-gray-800/50 hover:bg-gray-800"
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <ProviderIcon provider={provider} />
                        <span className={isExpanded ? theme.headerText : `text-sm font-medium ${theme.sidebarText}`}>
                          {label}
                        </span>
                        {isStreaming && (
                          <span className={`text-xs animate-pulse ${theme.streamLabel}`}>streaming...</span>
                        )}
                      </div>
                      <div className="flex items-center gap-3">
                        {lastAssistant?.result && (
                          <span className={`${theme.meta}`}>
                            {lastAssistant.result.latencyMs < 1000
                              ? `${lastAssistant.result.latencyMs}ms`
                              : `${(lastAssistant.result.latencyMs / 1000).toFixed(1)}s`}
                          </span>
                        )}
                        <span className="text-gray-500 text-xs">{isExpanded ? "▼" : "▶"}</span>
                      </div>
                    </button>

                    {/* Expanded card */}
                    {isExpanded && (
                      <div className={`mt-1 ${theme.card}`}>
                        <div className={`${theme.body} space-y-3 max-h-[80vh] md:max-h-[600px] overflow-y-auto`}>
                          {turns.map((turn, i) => {
                            if (turn.role === "user") {
                              return (
                                <div key={i} className={theme.userBubble}>
                                  <p className={theme.userText}>{turn.content}</p>
                                </div>
                              );
                            }
                            if (turn.result?.status === "error") {
                              return <p key={i} className="text-red-400 text-sm">{turn.result.error}</p>;
                            }
                            if (turn.result?.status === "timeout") {
                              return <p key={i} className="text-amber-400 text-sm">Timed out</p>;
                            }
                            return (
                              <div key={i}>
                                {turn.streaming ? (
                                  <div className={`${theme.prose} [&_p]:inline`}>
                                    <ReactMarkdown remarkPlugins={[remarkGfm]}>{turn.content}</ReactMarkdown>
                                    <span className={`inline-block w-1.5 h-5 ${theme.cursor} animate-pulse ml-0.5 align-text-bottom rounded-sm`} />
                                  </div>
                                ) : (
                                  <MarkdownContent content={turn.content} theme={theme} />
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Prompt bar — pinned to bottom */}
        <div className="border-t border-gray-800/50 p-3 md:p-4 bg-[#0c0c0e]">
          {showSystem && (
            <input
              type="text"
              placeholder="System prompt (optional)"
              value={systemPrompt}
              onChange={(e) => setSystemPrompt(e.target.value)}
              className="w-full bg-gray-800/50 text-gray-300 rounded-xl px-4 py-2.5 mb-2 text-sm focus:outline-none focus:ring-1 focus:ring-gray-600 border border-gray-700/50"
            />
          )}

          {/* URL input bar */}
          {showUrlInput && (
            <div className="flex gap-2 mb-2">
              <input
                type="url"
                placeholder="https://example.com/article"
                value={urlValue}
                onChange={(e) => setUrlValue(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") handleUrlFetch(); }}
                className="flex-1 bg-gray-800/50 text-gray-300 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-gray-600 border border-gray-700/50 min-w-0"
                autoFocus
              />
              <button onClick={handleUrlFetch} disabled={urlLoading || !urlValue.trim()} className="bg-white/10 hover:bg-white/15 disabled:opacity-30 text-white text-xs px-3 py-2 rounded-lg transition-colors">
                {urlLoading ? "..." : "Fetch"}
              </button>
              <button onClick={() => { setShowUrlInput(false); setUrlValue(""); }} className="text-gray-500 hover:text-gray-300 text-xs px-2">Cancel</button>
            </div>
          )}

          {/* Attachment previews */}
          {attachments.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-2">
              {attachments.map((att, i) => (
                <div key={i} className="flex items-center gap-1.5 bg-gray-800/70 rounded-lg px-2.5 py-1.5 text-xs text-gray-300 border border-gray-700/50 max-w-[200px]">
                  {att.type === "image" ? (
                    <img src={`data:${att.mimeType};base64,${att.data}`} className="w-8 h-8 rounded object-cover shrink-0" />
                  ) : att.type === "text" ? (
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-blue-400 shrink-0" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clipRule="evenodd" />
                    </svg>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-red-400 shrink-0" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clipRule="evenodd" />
                    </svg>
                  )}
                  <span className="truncate">{att.name}</span>
                  <button onClick={() => removeAttachment(i)} className="text-gray-500 hover:text-red-400 ml-auto shrink-0">×</button>
                </div>
              ))}
            </div>
          )}

          <div className="flex gap-1.5 md:gap-2">
            {/* File attach button */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,application/pdf,.txt,.csv,.json,.xml,.md,.py,.js,.ts,.tsx,.jsx,.go,.rs,.java,.c,.cpp,.h,.cs,.swift,.kt,.sh,.yaml,.yml,.toml,.sql,.php,.rb,.lua,.docx,.xlsx,.xls"
              multiple
              onChange={handleFileSelect}
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="self-end text-gray-400 hover:text-white p-2 transition-colors shrink-0"
              title="Attach file"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
              </svg>
            </button>

            {/* Voice input button */}
            <button
              onClick={toggleVoice}
              className={`self-end p-2 transition-colors shrink-0 ${listening ? "text-red-400 animate-pulse" : "text-gray-400 hover:text-white"}`}
              title={listening ? "Stop recording" : "Voice input"}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
              </svg>
            </button>

            {/* URL fetch button */}
            <button
              onClick={() => setShowUrlInput(!showUrlInput)}
              className={`self-end p-2 transition-colors shrink-0 ${showUrlInput ? "text-white" : "text-gray-400 hover:text-white"}`}
              title="Fetch URL content"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
              </svg>
            </button>

            <textarea
              placeholder={conversationRef.current.length > 0 ? "Continue the conversation..." : "Enter your prompt..."}
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              onKeyDown={handleKeyDown}
              onPaste={handlePaste}
              rows={2}
              className="flex-1 bg-gray-800/50 text-gray-100 rounded-xl px-3 md:px-4 py-2.5 resize-none focus:outline-none focus:ring-1 focus:ring-gray-600 border border-gray-700/50 text-sm min-w-0"
            />
            <div className="flex flex-col gap-1.5">
              <button
                onClick={handleRun}
                disabled={running || !prompt.trim()}
                className="bg-white hover:bg-gray-200 disabled:opacity-30 text-black px-4 md:px-5 py-2.5 rounded-xl text-sm font-semibold transition-colors"
              >
                {running ? "..." : "Send"}
              </button>
              <button
                onClick={() => setShowSystem(!showSystem)}
                className="text-[11px] text-gray-500 hover:text-gray-300 transition-colors"
              >
                {showSystem ? "Hide" : "Sys"}
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
