import { useState, useEffect, useRef, useCallback } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { fetchModels, runPrompt, fetchSummary } from "./api";
import type { ModelsResponse, ProviderName, ProviderResult, ChatMessage, SavedChat } from "./types";

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
    setPrompt("");

    // User turns are added per-provider when streaming/results arrive (keyed by label)

    const cancel = runPrompt({
      prompt: userPrompt,
      systemPrompt: showSystem ? systemPrompt : undefined,
      messages: conversationRef.current.length > 0 ? conversationRef.current : undefined,
      models: selectedModels.length > 0 ? selectedModels : undefined,
      onStreamStart: (label, provider) => {
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
      },
      onDone: async (results) => {
        setRunning(false);

        // Update conversation history with user prompt and first successful response
        conversationRef.current = [
          ...conversationRef.current,
          { role: "user", content: userPrompt },
        ];
        const firstSuccess = results.find((r) => r.status === "success");
        if (firstSuccess) {
          conversationRef.current = [
            ...conversationRef.current,
            { role: "assistant", content: firstSuccess.content },
          ];
        }

        // Auto-save
        setTimeout(() => saveCurrentChat(), 100);

        // Auto-generate summary and consensus if multiple providers responded
        const successes = results.filter((r) => r.status === "success");
        if (successes.length >= 2) {
          setSummaryLoading(true);
          try {
            const [summaryContent, consensusContent] = await Promise.all([
              fetchSummary(userPrompt, results, "combined"),
              fetchSummary(userPrompt, results, "consensus"),
            ]);
            setSummary({ type: "combined", content: summaryContent });
            setConsensus({ type: "consensus", content: consensusContent });
            setExpandedCards((prev) => new Set([...prev, "__summary", "__consensus"]));
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
      {/* Sidebar */}
      <aside className="w-72 bg-[#111113] border-r border-gray-800/50 flex flex-col shrink-0">
        <div className="p-5 border-b border-gray-800/50">
          <h1 className="text-lg font-bold text-white tracking-tight">AI Wrapper</h1>
          <p className="text-xs text-gray-500 mt-1">Multi-LLM Prompt Runner</p>
          <div className="flex gap-2 mt-3">
            <button
              onClick={startNewChat}
              className="flex-1 bg-white/10 hover:bg-white/15 text-white text-xs px-3 py-1.5 rounded-lg transition-colors"
            >
              New Chat
            </button>
            <button
              onClick={() => setShowHistory(!showHistory)}
              className="flex-1 bg-white/10 hover:bg-white/15 text-white text-xs px-3 py-1.5 rounded-lg transition-colors"
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
                  <div className="flex-1 truncate mr-2" onClick={() => loadChat(chat)}>
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
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Results */}
        <div className="flex-1 overflow-y-auto p-5">
          {activeProviders.length === 0 && !running && !summary && (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <p className="text-gray-600 text-lg">Select models and enter a prompt</p>
                <p className="text-gray-700 text-sm mt-1">Summary and consensus appear automatically</p>
              </div>
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
                        <div className={`${theme.body} space-y-3 max-h-[600px] overflow-y-auto`}>
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
        <div className="border-t border-gray-800/50 p-4 bg-[#0c0c0e]">
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
              placeholder={conversationRef.current.length > 0 ? "Continue the conversation..." : "Enter your prompt..."}
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
                {running ? "Running..." : "Send"}
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
      </main>
    </div>
  );
}
