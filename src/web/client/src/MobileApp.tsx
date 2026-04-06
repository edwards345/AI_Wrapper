import { useState, useEffect, useRef, useCallback } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { fetchModels, runPrompt, fetchSummary } from "./api";
import type { ModelsResponse, ProviderName, ProviderResult, ChatMessage, SavedChat, Attachment } from "./types";

/* ───────── Themes (compact) ───────── */

const THEMES: Record<ProviderName, {
  accent: string; bg: string; text: string; icon: string; name: string;
  prose: string; codeBlock: string; codeBorder: string;
}> = {
  claude: {
    accent: "#d4a27a", bg: "bg-[#faf6f1]", text: "text-[#3d2b1f]", icon: "C", name: "Claude",
    prose: "[&_h1]:text-[#3d2314] [&_h1]:text-base [&_h1]:font-semibold [&_h1]:mb-2 [&_h2]:text-[#3d2314] [&_h2]:text-sm [&_h2]:font-semibold [&_h2]:mb-1 [&_h3]:text-[#3d2314] [&_h3]:text-sm [&_h3]:font-semibold [&_p]:text-[#3d2b1f] [&_p]:text-sm [&_p]:leading-relaxed [&_p]:mb-2 [&_ul]:text-[#3d2b1f] [&_ul]:text-sm [&_ul]:ml-4 [&_ul]:mb-2 [&_ul]:list-disc [&_ol]:text-[#3d2b1f] [&_ol]:text-sm [&_ol]:ml-4 [&_ol]:mb-2 [&_ol]:list-decimal [&_li]:mb-1 [&_strong]:text-[#3d2314] [&_a]:text-[#b07040] [&_a]:underline [&_blockquote]:border-l-2 [&_blockquote]:border-[#d4a27a] [&_blockquote]:pl-3 [&_blockquote]:italic [&_table]:text-sm [&_table]:w-full [&_th]:text-left [&_th]:pb-1 [&_th]:border-b [&_th]:border-[#d4c8b8] [&_td]:py-1 [&_td]:border-b [&_td]:border-[#ece4da]",
    codeBlock: "bg-[#2d2214] text-[#f0e6d6] rounded-lg p-3 text-xs font-mono overflow-x-auto my-2",
    codeBorder: "bg-[#f0e6d6] text-[#6b4c2a] rounded px-1.5 py-0.5 text-xs font-mono",
  },
  openai: {
    accent: "#10a37f", bg: "bg-[#212121]", text: "text-[#ececec]", icon: "G", name: "ChatGPT",
    prose: "[&_h1]:text-white [&_h1]:text-base [&_h1]:font-semibold [&_h1]:mb-2 [&_h2]:text-white [&_h2]:text-sm [&_h2]:font-semibold [&_h2]:mb-1 [&_h3]:text-white [&_h3]:text-sm [&_h3]:font-semibold [&_p]:text-[#ececec] [&_p]:text-sm [&_p]:leading-relaxed [&_p]:mb-2 [&_ul]:text-[#ececec] [&_ul]:text-sm [&_ul]:ml-4 [&_ul]:mb-2 [&_ul]:list-disc [&_ol]:text-[#ececec] [&_ol]:text-sm [&_ol]:ml-4 [&_ol]:mb-2 [&_ol]:list-decimal [&_li]:mb-1 [&_strong]:text-white [&_a]:text-[#10a37f] [&_a]:underline [&_blockquote]:border-l-2 [&_blockquote]:border-[#10a37f] [&_blockquote]:pl-3 [&_blockquote]:italic [&_table]:text-sm [&_table]:w-full [&_th]:text-left [&_th]:pb-1 [&_th]:border-b [&_th]:border-[#444] [&_td]:py-1 [&_td]:border-b [&_td]:border-[#333]",
    codeBlock: "bg-[#1a1a1a] text-[#e6e6e6] rounded-lg p-3 text-xs font-mono overflow-x-auto my-2 border border-[#333]",
    codeBorder: "bg-[#1a1a1a] text-[#e6e6e6] rounded px-1.5 py-0.5 text-xs font-mono",
  },
  gemini: {
    accent: "#8ab4f8", bg: "bg-[#1e1f20]", text: "text-[#e3e3e3]", icon: "G", name: "Gemini",
    prose: "[&_h1]:text-white [&_h1]:text-base [&_h1]:font-semibold [&_h1]:mb-2 [&_h2]:text-white [&_h2]:text-sm [&_h2]:font-semibold [&_h2]:mb-1 [&_h3]:text-white [&_h3]:text-sm [&_h3]:font-semibold [&_p]:text-[#e3e3e3] [&_p]:text-sm [&_p]:leading-relaxed [&_p]:mb-2 [&_ul]:text-[#e3e3e3] [&_ul]:text-sm [&_ul]:ml-4 [&_ul]:mb-2 [&_ul]:list-disc [&_ol]:text-[#e3e3e3] [&_ol]:text-sm [&_ol]:ml-4 [&_ol]:mb-2 [&_ol]:list-decimal [&_li]:mb-1 [&_strong]:text-white [&_a]:text-[#8ab4f8] [&_a]:underline [&_blockquote]:border-l-2 [&_blockquote]:border-[#8ab4f8] [&_blockquote]:pl-3 [&_blockquote]:italic [&_table]:text-sm [&_table]:w-full [&_th]:text-left [&_th]:pb-1 [&_th]:border-b [&_th]:border-[#444] [&_td]:py-1 [&_td]:border-b [&_td]:border-[#333]",
    codeBlock: "bg-[#282a2c] text-[#e3e3e3] rounded-lg p-3 text-xs font-mono overflow-x-auto my-2 border border-[#3c4043]",
    codeBorder: "bg-[#282a2c] text-[#8ab4f8] rounded px-1.5 py-0.5 text-xs font-mono",
  },
  grok: {
    accent: "#f97316", bg: "bg-[#09090b]", text: "text-[#fafafa]", icon: "X", name: "Grok",
    prose: "[&_h1]:text-white [&_h1]:text-base [&_h1]:font-semibold [&_h1]:mb-2 [&_h2]:text-white [&_h2]:text-sm [&_h2]:font-semibold [&_h2]:mb-1 [&_h3]:text-white [&_h3]:text-sm [&_h3]:font-semibold [&_p]:text-[#fafafa] [&_p]:text-sm [&_p]:leading-relaxed [&_p]:mb-2 [&_ul]:text-[#fafafa] [&_ul]:text-sm [&_ul]:ml-4 [&_ul]:mb-2 [&_ul]:list-disc [&_ol]:text-[#fafafa] [&_ol]:text-sm [&_ol]:ml-4 [&_ol]:mb-2 [&_ol]:list-decimal [&_li]:mb-1 [&_strong]:text-white [&_a]:text-[#f97316] [&_a]:underline [&_blockquote]:border-l-2 [&_blockquote]:border-[#f97316] [&_blockquote]:pl-3 [&_blockquote]:italic [&_table]:text-sm [&_table]:w-full [&_th]:text-left [&_th]:pb-1 [&_th]:border-b [&_th]:border-[#27272a] [&_td]:py-1 [&_td]:border-b [&_td]:border-[#1c1c1f]",
    codeBlock: "bg-[#18181b] text-[#fafafa] rounded-lg p-3 text-xs font-mono overflow-x-auto my-2 border border-[#27272a]",
    codeBorder: "bg-[#18181b] text-[#f97316] rounded px-1.5 py-0.5 text-xs font-mono border border-[#27272a]",
  },
};

/* ───────── Types ───────── */

interface Turn {
  role: "user" | "assistant";
  content: string;
  provider?: ProviderName;
  result?: ProviderResult;
  streaming?: boolean;
}

type MobileView = "chat" | "models" | "history";

/* ───────── Chat History helpers (server-side) ───────── */

async function loadChatsFromServer(): Promise<SavedChat[]> {
  try {
    const res = await fetch("/api/chats");
    if (res.ok) return await res.json();
  } catch { /* ignore */ }
  return [];
}

function saveChatToServer(chat: SavedChat) {
  fetch("/api/chats", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(chat),
  }).catch(() => {});
}

function deleteChatFromServer(id: string) {
  fetch(`/api/chats/${id}`, { method: "DELETE" }).catch(() => {});
}

/* ───────── Mobile App ───────── */

export default function MobileApp() {
  const [modelsData, setModelsData] = useState<ModelsResponse | null>(null);
  const [selectedModels, setSelectedModels] = useState<string[]>([]);
  const [prompt, setPrompt] = useState("");
  const [systemPrompt, setSystemPrompt] = useState("");
  const [showSystem, setShowSystem] = useState(false);
  const [running, setRunning] = useState(false);
  const [providerTurns, setProviderTurns] = useState<Record<string, Turn[]>>({});
  const [summary, setSummary] = useState<{ type: string; content: string } | null>(null);
  const [consensus, setConsensus] = useState<{ type: string; content: string } | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [expandedCards, setExpandedCards] = useState<Set<string>>(new Set());
  const [view, setView] = useState<MobileView>("chat");
  const [attachments, setAttachments] = useState<Attachment[]>([]);

  // Chat history
  const [savedChats, setSavedChats] = useState<SavedChat[]>([]);
  const [currentChatId, setCurrentChatId] = useState<string | null>(null);

  // Load chats from server on mount
  useEffect(() => {
    loadChatsFromServer().then(setSavedChats);
  }, []);

  const conversationRef = useRef<ChatMessage[]>([]);
  const allResults = useRef<ProviderResult[]>([]);
  const lastPrompt = useRef("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const lastTokenTime = useRef<Record<string, number>>({});

  // Geolocation
  const [location, setLocation] = useState<{ lat: number; lon: number } | null>(null);
  useEffect(() => {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setLocation({ lat: pos.coords.latitude, lon: pos.coords.longitude }),
        () => {}, // silently fail
        { enableHighAccuracy: false, timeout: 10_000 }
      );
    }
  }, []);

  // No JS viewport height — use CSS fixed positioning instead

  // Client-side streaming timeout (120s idle) — checked every 5s
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      setProviderTurns((prev) => {
        let changed = false;
        const next = { ...prev };
        for (const label of Object.keys(next)) {
          const lt = lastTokenTime.current[label];
          if (next[label].some((t) => t.streaming) && lt && now - lt > 120_000) {
            changed = true;
            next[label] = next[label].map((t) => t.streaming ? { ...t, streaming: false } : t);
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

  // Auto-scroll to bottom
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [providerTurns, summary, consensus]);

  const toggleModel = (id: string) => {
    setSelectedModels((prev) => prev.includes(id) ? prev.filter((m) => m !== id) : [...prev, id]);
  };

  // Chat history functions — use refs to avoid stale closures
  const currentChatIdRef = useRef(currentChatId);
  currentChatIdRef.current = currentChatId;
  const selectedModelsRef = useRef(selectedModels);
  selectedModelsRef.current = selectedModels;
  const systemPromptRef = useRef(systemPrompt);
  systemPromptRef.current = systemPrompt;
  const showSystemRef = useRef(showSystem);
  showSystemRef.current = showSystem;

  const saveCurrentChat = useCallback(() => {
    if (conversationRef.current.length === 0) return;
    const id = currentChatIdRef.current || crypto.randomUUID();
    const title = conversationRef.current[0]?.content.slice(0, 60) || "Untitled";
    const chat: SavedChat = {
      id, title, timestamp: Date.now(),
      messages: [...conversationRef.current],
      selectedModels: selectedModelsRef.current,
      systemPrompt: showSystemRef.current ? systemPromptRef.current : undefined,
    };
    saveChatToServer(chat);
    setSavedChats((prev) => {
      const filtered = prev.filter((c) => c.id !== id);
      return [chat, ...filtered].slice(0, 100);
    });
    if (!currentChatIdRef.current) {
      currentChatIdRef.current = id;
      setCurrentChatId(id);
    }
  }, []);

  const startNewChat = () => {
    if (conversationRef.current.length > 0) saveCurrentChat();
    conversationRef.current = [];
    allResults.current = [];
    setProviderTurns({});
    setSummary(null);
    setConsensus(null);
    setExpandedCards(new Set());
    currentChatIdRef.current = null;
    setCurrentChatId(null);
    setPrompt("");
    setView("chat");
  };

  const loadChat = (chat: SavedChat) => {
    conversationRef.current = chat.messages;
    setCurrentChatId(chat.id);
    setSelectedModels(chat.selectedModels);
    if (chat.systemPrompt) { setSystemPrompt(chat.systemPrompt); setShowSystem(true); }
    setProviderTurns({});
    setSummary(null);
    setConsensus(null);
    setView("chat");
  };

  const deleteChat = (id: string) => {
    deleteChatFromServer(id);
    setSavedChats((prev) => prev.filter((c) => c.id !== id));
    if (currentChatId === id) startNewChat();
  };

  const activeProviders = Object.keys(providerTurns).filter((k) => providerTurns[k].length > 0);
  const anyStreaming = Object.values(providerTurns).some((turns) => turns.some((t) => t.streaming));

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
    setView("chat");

    // Build system prompt with location context
    const locationCtx = location ? `User's current location: ${location.lat.toFixed(4)}, ${location.lon.toFixed(4)}. Use this for context if relevant to the question.` : "";
    const fullSystemPrompt = [locationCtx, showSystem ? systemPrompt : ""].filter(Boolean).join("\n\n") || undefined;

    runPrompt({
      prompt: userPrompt,
      systemPrompt: fullSystemPrompt,
      messages: conversationRef.current.length > 0 ? conversationRef.current : undefined,
      attachments: currentAttachments,
      models: selectedModels.length > 0 ? selectedModels : undefined,
      onStreamStart: (label, provider) => {
        lastTokenTime.current[label] = Date.now();
        setProviderTurns((prev) => ({
          ...prev,
          [label]: [...(prev[label] || []),
            { role: "user" as const, content: userPrompt },
            { role: "assistant" as const, content: "", provider: provider as ProviderName, streaming: true },
          ],
        }));
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
          const turns = next[result.label];
          if (!turns.length || turns[turns.length - 1].role !== "user") {
            turns.push({ role: "user", content: userPrompt });
          }
          next[result.label] = [...turns, {
            role: "assistant",
            content: result.status === "success" ? result.content : "",
            provider: result.provider,
            streaming: false,
            result,
          }];
          return next;
        });
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
        if (conversationRef.current.length > 0) saveCurrentChat();
        setProviderTurns((prev) => {
          const next = { ...prev };
          for (const label of Object.keys(next)) {
            next[label] = next[label].map((t) => t.streaming ? { ...t, streaming: false } : t);
          }
          return next;
        });
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
          } catch (err) { console.error(err); }
          setSummaryLoading(false);
        }
      },
      onError: (error) => { console.error(error); setRunning(false); },
    });
  }, [prompt, systemPrompt, showSystem, selectedModels, running, attachments, saveCurrentChat]);

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

  const providerTurnsRef = useRef(providerTurns);
  providerTurnsRef.current = providerTurns;

  useEffect(() => {
    const interval = setInterval(() => {
      const current = providerTurnsRef.current;

      if (!runningRef.current) {
        const hasStuck = Object.values(current).some((turns) => turns.some((t) => t.streaming));
        if (hasStuck) {
          const next: Record<string, Turn[]> = {};
          for (const [label, turns] of Object.entries(current)) {
            next[label] = turns.map((t) => t.streaming ? { ...t, streaming: false } : t);
          }
          setProviderTurns(next);
        }
        return;
      }
      if (summarizeTriggered.current) return;

      const activeLabels = Object.keys(current).filter((k) => current[k].length > 0);
      if (activeLabels.length === 0) return;
      const stillStreaming = Object.values(current).some((turns) => turns.some((t) => t.streaming));

      const results = collectResults(current);
      const successes = results.filter((r) => r.status === "success");

      if (stillStreaming && successes.length < activeLabels.length) return;

      summarizeTriggered.current = true;
      setRunning(false);
      if (conversationRef.current.length > 0) saveCurrentChat();

      if (stillStreaming) {
        const next: Record<string, Turn[]> = {};
        for (const [label, turns] of Object.entries(current)) {
          next[label] = turns.map((t) => t.streaming ? { ...t, streaming: false } : t);
        }
        setProviderTurns(next);
      }

      if (successes.length >= 2 && !summaryRef.current) {
        setSummaryLoading(true);
        Promise.all([
          fetchSummary(lastPrompt.current, results, "combined"),
          fetchSummary(lastPrompt.current, results, "consensus"),
        ]).then(([summaryContent, consensusContent]) => {
          setSummary({ type: "combined", content: summaryContent });
          setConsensus({ type: "consensus", content: consensusContent });
          setExpandedCards((prev) => new Set([...prev, "__summary", "__consensus"]));
        }).catch(console.error).finally(() => setSummaryLoading(false));
      }
    }, 3_000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (running) summarizeTriggered.current = false;
  }, [running]);

  const handleSummarizeNow = useCallback(async () => {
    setProviderTurns((prev) => {
      const next = { ...prev };
      for (const label of Object.keys(next)) {
        next[label] = next[label].map((t) => t.streaming ? { ...t, streaming: false } : t);
      }
      return next;
    });
    setRunning(false);
    const results = collectResults(providerTurnsRef.current);
    if (results.filter((r) => r.status === "success").length >= 2) {
      setSummaryLoading(true);
      try {
        const content = await fetchSummary(lastPrompt.current, results, "combined");
        setSummary({ type: "combined", content });
        setExpandedCards((prev) => new Set([...prev, "__summary"]));
      } catch (err) { console.error(err); }
      setSummaryLoading(false);
    }
  }, []);

  const handleConsensus = useCallback(async () => {
    const results = collectResults(providerTurnsRef.current);
    if (results.filter((r) => r.status === "success").length < 2) return;
    setSummaryLoading(true);
    try {
      const content = await fetchSummary(lastPrompt.current, results, "consensus");
      setConsensus({ type: "consensus", content });
      setExpandedCards((prev) => new Set([...prev, "__consensus"]));
    } catch (err) { console.error(err); }
    setSummaryLoading(false);
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    for (const file of Array.from(files)) {
      if (file.type.startsWith("image/") || file.type === "application/pdf") {
        const reader = new FileReader();
        reader.onload = () => {
          const base64 = (reader.result as string).split(",")[1];
          setAttachments((prev) => [...prev, {
            type: file.type.startsWith("image/") ? "image" : "pdf",
            mimeType: file.type, data: base64, name: file.name,
          }]);
        };
        reader.readAsDataURL(file);
      } else if (file.type.startsWith("text/") || /\.(js|ts|py|json|csv|md|txt)$/i.test(file.name)) {
        const reader = new FileReader();
        reader.onload = () => {
          setAttachments((prev) => [...prev, {
            type: "text", mimeType: file.type || "text/plain", data: reader.result as string, name: file.name,
          }]);
        };
        reader.readAsText(file);
      } else if (file.name.endsWith(".docx") || file.name.endsWith(".xlsx") || file.name.endsWith(".xls")) {
        const reader = new FileReader();
        reader.onload = async () => {
          const base64 = (reader.result as string).split(",")[1];
          try {
            const res = await fetch("/api/parse-file", {
              method: "POST", headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ data: base64, mimeType: file.type, name: file.name }),
            });
            const result = await res.json();
            if (res.ok) setAttachments((prev) => [...prev, { type: "text", mimeType: file.type, data: result.text, name: file.name }]);
          } catch { /* ignore */ }
        };
        reader.readAsDataURL(file);
      }
    }
    e.target.value = "";
  };

  // Voice
  const [listening, setListening] = useState(false);
  const recognitionRef = useRef<unknown>(null);
  const toggleVoice = useCallback(() => {
    const SR = (window as unknown as Record<string, unknown>).SpeechRecognition
      || (window as unknown as Record<string, unknown>).webkitSpeechRecognition;
    if (!SR) return;
    if (listening && recognitionRef.current) {
      (recognitionRef.current as { stop: () => void }).stop();
      setListening(false);
      return;
    }
    const rec = new (SR as new () => {
      continuous: boolean; interimResults: boolean; lang: string;
      onresult: ((e: { results: { transcript: string }[][] }) => void) | null;
      onend: (() => void) | null; onerror: (() => void) | null;
      start: () => void; stop: () => void;
    })();
    rec.continuous = true; rec.interimResults = false; rec.lang = "en-US";
    rec.onresult = (e) => {
      let t = "";
      for (let i = 0; i < e.results.length; i++) t += e.results[i][0].transcript;
      setPrompt((prev) => prev + (prev ? " " : "") + t);
    };
    rec.onend = () => setListening(false);
    rec.onerror = () => setListening(false);
    recognitionRef.current = rec;
    rec.start();
    setListening(true);
  }, [listening]);

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
          setAttachments((prev) => [...prev, { type: "image", mimeType: file.type, data: base64, name: "pasted-image.png" }]);
        };
        reader.readAsDataURL(file);
      }
    }
  }, []);

  if (!modelsData) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-gray-950">
        <div className="animate-pulse text-gray-500">Loading AI Wrapper...</div>
      </div>
    );
  }

  const toggleCard = (key: string) => {
    setExpandedCards((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  };

  const presetSelect = (tier: string) => {
    const models = (Object.keys(modelsData.models) as ProviderName[]).flatMap((p) => {
      if (!modelsData.availableProviders.includes(p)) return [];
      if (tier === "heavy") {
        if (p === "grok") { const m = modelsData.models[p].find((m) => m.tier === "max"); return m ? [m.id] : []; }
        const m = modelsData.models[p].find((m) => m.tier === "flagship"); return m ? [m.id] : [];
      }
      const m = modelsData.models[p].find((m) => m.tier === tier); return m ? [m.id] : [];
    });
    const allSelected = models.length > 0 && models.every((id) => selectedModels.includes(id));
    setSelectedModels(allSelected ? [] : models);
  };

  return (
    <div className="fixed inset-0 flex flex-col bg-gray-950 text-gray-100 overflow-hidden">
      {/* Top nav */}
      <div className="flex items-center justify-between px-3 py-2.5 bg-[#0c0c0e] border-b border-gray-800/50 shrink-0">
        <div className="flex items-center gap-2">
          <h1 className="text-sm font-bold">AI Wrapper</h1>
          {location && <span className="text-[9px] text-green-500" title={`${location.lat.toFixed(4)}, ${location.lon.toFixed(4)}`}>&#x1F4CD;</span>}
        </div>
        <div className="flex gap-1">
          <button
            onClick={() => { if (view !== "history") loadChatsFromServer().then(setSavedChats); setView(view === "history" ? "chat" : "history"); }}
            className={`text-xs px-2.5 py-1.5 rounded-lg transition-colors ${view === "history" ? "bg-white/20 text-white" : "bg-white/5 text-gray-400"}`}
          >
            History
          </button>
          <button
            onClick={() => setView(view === "models" ? "chat" : "models")}
            className={`text-xs px-2.5 py-1.5 rounded-lg transition-colors ${view === "models" ? "bg-white/20 text-white" : "bg-white/5 text-gray-400"}`}
          >
            Models
          </button>
          <button
            onClick={() => { saveCurrentChat(); }}
            className="text-xs px-2.5 py-1.5 rounded-lg bg-white/5 text-gray-400"
          >
            Save
          </button>
          <button
            onClick={startNewChat}
            className="text-xs px-2.5 py-1.5 rounded-lg bg-white/5 text-gray-400"
          >
            New
          </button>
        </div>
      </div>

      {/* History view */}
      {view === "history" && (
        <div className="flex-1 overflow-y-auto p-4">
          <p className="text-xs text-gray-500 mb-3">Previous Chats</p>
          {savedChats.length === 0 && (
            <p className="text-gray-600 text-sm">No saved chats yet.</p>
          )}
          {savedChats.map((chat) => (
            <div key={chat.id}
              className={`flex items-center justify-between px-3 py-3 rounded-xl mb-1.5 transition-colors ${
                currentChatId === chat.id ? "bg-white/10" : "bg-gray-800/30"
              }`}>
              <div className="flex-1 min-w-0 mr-3" onClick={() => loadChat(chat)}>
                <p className="text-sm text-gray-200 truncate">{chat.title}</p>
                <p className="text-[10px] text-gray-500 mt-0.5">{new Date(chat.timestamp).toLocaleDateString()} {new Date(chat.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
              </div>
              <button onClick={() => deleteChat(chat.id)} className="text-gray-600 hover:text-red-400 text-sm px-2 shrink-0">×</button>
            </div>
          ))}
        </div>
      )}

      {/* Models view */}
      {view === "models" && (
        <div className="flex-1 overflow-y-auto p-4">
          {/* Presets */}
          <div className="flex gap-1.5 mb-2">
            {["flagship", "balanced", "fast", "heavy"].map((tier) => (
              <button key={tier} onClick={() => presetSelect(tier)}
                className="flex-1 text-xs px-2 py-2 rounded-lg bg-white/5 text-gray-400 hover:bg-white/10 font-medium capitalize">
                {tier}
              </button>
            ))}
          </div>

          {/* Provider models */}
          {(Object.keys(modelsData.models) as ProviderName[]).map((provider) => {
            const available = modelsData.availableProviders.includes(provider);
            const theme = THEMES[provider];
            return (
              <div key={provider} className="mb-4">
                <div className={`flex items-center gap-2 mb-2 ${!available ? "opacity-40" : ""}`}>
                  <span className="inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold" style={{ backgroundColor: theme.accent }}>
                    {theme.icon}
                  </span>
                  <span className="text-sm font-semibold" style={{ color: theme.accent }}>{theme.name}</span>
                  {!available && <span className="text-gray-600 text-[10px]">(no key)</span>}
                </div>
                {modelsData.models[provider].map((m) => (
                  <label key={m.id} className={`flex items-center gap-3 px-2 py-2.5 rounded-lg text-sm ${!available ? "opacity-30 pointer-events-none" : ""}`}>
                    <input type="checkbox" checked={selectedModels.includes(m.id)} onChange={() => toggleModel(m.id)} disabled={!available}
                      style={{ accentColor: theme.accent }} />
                    <span className="text-gray-300">{m.label}</span>
                    <span className="text-gray-600 text-[10px] ml-auto font-mono">{m.tier}</span>
                  </label>
                ))}
              </div>
            );
          })}
        </div>
      )}

      {/* Chat view */}
      {view === "chat" && (
        <div ref={scrollRef} className="flex-1 overflow-y-auto p-3 space-y-3 min-h-0">
          {activeProviders.length === 0 && !running && !summary && (
            <div className="flex items-center justify-center py-12">
              <p className="text-gray-600 text-sm text-center">Select models and enter a prompt</p>
            </div>
          )}

          {/* Waiting spinner */}
          {running && activeProviders.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <div className="relative w-10 h-10">
                <div className="absolute inset-0 rounded-full border-2 border-gray-700" />
                <div className="absolute inset-0 rounded-full border-2 border-t-[#d4a27a] border-r-[#10a37f] border-b-[#8ab4f8] border-l-[#f97316] animate-spin" />
              </div>
              <p className="text-gray-400 text-xs animate-pulse">Waiting for responses...</p>
            </div>
          )}

          {/* Still waiting + summarize button */}
          {(running || anyStreaming) && activeProviders.length > 0 && (
            <div className="flex items-center gap-2 px-1">
              <div className="w-3.5 h-3.5 border-2 border-t-[#d4a27a] border-r-[#10a37f] border-b-[#8ab4f8] border-l-[#f97316] rounded-full animate-spin shrink-0" />
              <span className="text-gray-400 text-xs">Waiting...</span>
              {allResults.current.length >= 2 && (
                <button onClick={handleSummarizeNow} className="bg-white/10 text-white text-xs px-2.5 py-1 rounded-lg ml-auto">
                  Summarize Now
                </button>
              )}
            </div>
          )}

          {/* Summary loading */}
          {summaryLoading && (
            <div className="flex items-center gap-2 px-1">
              <div className="w-3.5 h-3.5 border-2 border-[#d4a27a] border-t-transparent rounded-full animate-spin" />
              <span className="text-gray-400 text-xs">Generating summary...</span>
            </div>
          )}

          {/* Summary */}
          {summary && (
            <div className="rounded-xl overflow-hidden border border-gray-800/50">
              <button onClick={() => toggleCard("__summary")} className={`w-full flex items-center justify-between px-3 py-2.5 ${expandedCards.has("__summary") ? "bg-[#c08a5a]" : "bg-gray-800/50"}`}>
                <span className={`text-xs font-semibold ${expandedCards.has("__summary") ? "text-white" : "text-[#d4a27a]"}`}>Combined Summary</span>
                <span className="text-gray-500 text-xs">{expandedCards.has("__summary") ? "▼" : "▶"}</span>
              </button>
              {expandedCards.has("__summary") && (
                <div className="bg-[#faf6f1] px-3 py-2.5 max-h-[50vh] overflow-y-auto">
                  <div className={THEMES.claude.prose}>
                    <ReactMarkdown remarkPlugins={[remarkGfm]} components={{
                      code({ className, children, ...props }) {
                        if (className?.includes("language-")) return <pre className={THEMES.claude.codeBlock}><code {...props}>{children}</code></pre>;
                        return <code className={THEMES.claude.codeBorder} {...props}>{children}</code>;
                      },
                      pre({ children }) { return <>{children}</>; },
                    }}>{summary.content}</ReactMarkdown>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Consensus */}
          {consensus && (
            <div className="rounded-xl overflow-hidden border border-gray-800/50">
              <button onClick={() => toggleCard("__consensus")} className={`w-full flex items-center justify-between px-3 py-2.5 ${expandedCards.has("__consensus") ? "bg-[#8b6a3e]" : "bg-gray-800/50"}`}>
                <span className={`text-xs font-semibold ${expandedCards.has("__consensus") ? "text-white" : "text-[#d4a27a]"}`}>Consensus Analysis</span>
                <span className="text-gray-500 text-xs">{expandedCards.has("__consensus") ? "▼" : "▶"}</span>
              </button>
              {expandedCards.has("__consensus") && (
                <div className="bg-[#faf6f1] px-3 py-2.5 max-h-[50vh] overflow-y-auto">
                  <div className={THEMES.claude.prose}>
                    <ReactMarkdown remarkPlugins={[remarkGfm]} components={{
                      code({ className, children, ...props }) {
                        if (className?.includes("language-")) return <pre className={THEMES.claude.codeBlock}><code {...props}>{children}</code></pre>;
                        return <code className={THEMES.claude.codeBorder} {...props}>{children}</code>;
                      },
                      pre({ children }) { return <>{children}</>; },
                    }}>{consensus.content}</ReactMarkdown>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Compare button */}
          {!running && !anyStreaming && !consensus && !summaryLoading && allResults.current.length >= 2 && (
            <button onClick={handleConsensus} className="bg-white/10 text-white text-xs px-3 py-2 rounded-lg w-full">
              Compare &amp; Find Consensus
            </button>
          )}

          {/* Provider responses */}
          {activeProviders.map((label) => {
            const turns = providerTurns[label];
            const provider = turns.find((t) => t.provider)?.provider || "claude";
            const theme = THEMES[provider];
            const isExpanded = expandedCards.has(label);
            const lastAssistant = [...turns].reverse().find((t) => t.role === "assistant");
            const isStreaming = lastAssistant?.streaming;

            return (
              <div key={label} className="rounded-xl overflow-hidden border border-gray-800/50">
                <button onClick={() => toggleCard(label)}
                  className={`w-full flex items-center justify-between px-3 py-2.5 transition-colors ${isExpanded ? "" : "bg-gray-800/50"}`}
                  style={isExpanded ? { backgroundColor: theme.accent } : undefined}>
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center justify-center w-5 h-5 rounded-full text-[10px] font-bold" style={{ backgroundColor: theme.accent }}>
                      {theme.icon}
                    </span>
                    <span className={`text-xs font-medium ${isExpanded ? "text-white" : ""}`} style={!isExpanded ? { color: theme.accent } : undefined}>
                      {label}
                    </span>
                    {isStreaming && <span className="text-xs animate-pulse" style={{ color: theme.accent }}>streaming...</span>}
                  </div>
                  <div className="flex items-center gap-2">
                    {lastAssistant?.result && (
                      <span className="text-gray-500 text-[10px]">
                        {lastAssistant.result.latencyMs < 1000 ? `${lastAssistant.result.latencyMs}ms` : `${(lastAssistant.result.latencyMs / 1000).toFixed(1)}s`}
                      </span>
                    )}
                    <span className="text-gray-500 text-xs">{isExpanded ? "▼" : "▶"}</span>
                  </div>
                </button>
                {isExpanded && (
                  <div className={`${theme.bg} px-3 py-2.5 space-y-2 max-h-[50vh] overflow-y-auto`}>
                    {turns.map((turn, i) => {
                      if (turn.role === "user") return (
                        <div key={i} className="bg-white/10 rounded-xl px-3 py-2 ml-6">
                          <p className="text-sm text-gray-300">{turn.content}</p>
                        </div>
                      );
                      if (turn.result?.status === "error") return <p key={i} className="text-red-400 text-xs">{turn.result.error}</p>;
                      if (turn.result?.status === "timeout") return <p key={i} className="text-amber-400 text-xs">Timed out</p>;
                      return (
                        <div key={i} className={theme.prose}>
                          <ReactMarkdown remarkPlugins={[remarkGfm]} components={{
                            code({ className, children, ...props }) {
                              if (className?.includes("language-")) return <pre className={theme.codeBlock}><code {...props}>{children}</code></pre>;
                              return <code className={theme.codeBorder} {...props}>{children}</code>;
                            },
                            pre({ children }) { return <>{children}</>; },
                          }}>{turn.content}</ReactMarkdown>
                          {turn.streaming && <span className="inline-block w-1.5 h-4 animate-pulse rounded-sm ml-0.5" style={{ backgroundColor: theme.accent }} />}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Bottom input bar */}
      <div className="border-t border-gray-800/50 p-2.5 bg-[#0c0c0e] shrink-0" style={{ paddingBottom: "max(0.625rem, env(safe-area-inset-bottom))" }}>
        {showSystem && (
          <input type="text" placeholder="System prompt" value={systemPrompt} onChange={(e) => setSystemPrompt(e.target.value)}
            className="w-full bg-gray-800/50 text-gray-300 rounded-xl px-3 py-2 mb-2 text-sm focus:outline-none border border-gray-700/50" />
        )}

        {/* Attachment previews */}
        {attachments.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-2">
            {attachments.map((att, i) => (
              <div key={i} className="flex items-center gap-1 bg-gray-800/70 rounded-lg px-2 py-1 text-[10px] text-gray-300 border border-gray-700/50">
                {att.type === "image" ? <img src={`data:${att.mimeType};base64,${att.data}`} className="w-6 h-6 rounded object-cover" /> : <span>📄</span>}
                <span className="truncate max-w-[80px]">{att.name}</span>
                <button onClick={() => setAttachments((prev) => prev.filter((_, j) => j !== i))} className="text-gray-500 ml-0.5">×</button>
              </div>
            ))}
          </div>
        )}

        <div className="flex items-end gap-1.5">
          <input ref={fileInputRef} type="file" accept="image/*,application/pdf,.txt,.csv,.json,.md,.py,.js,.ts,.docx,.xlsx" multiple onChange={handleFileSelect} className="hidden" />
          <button onClick={() => fileInputRef.current?.click()} className="text-gray-400 p-2" title="Attach">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
            </svg>
          </button>
          <button onClick={toggleVoice} className={`p-2 ${listening ? "text-red-400 animate-pulse" : "text-gray-400"}`}>
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
            </svg>
          </button>
          <button onClick={() => setShowSystem(!showSystem)} className="text-gray-500 p-2 text-[10px]">{showSystem ? "Sys ✓" : "Sys"}</button>
          <textarea
            placeholder="Enter your prompt..."
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleRun(); } }}
            onPaste={handlePaste}
            rows={1}
            className="flex-1 bg-gray-800/50 text-gray-100 rounded-xl px-3 py-2.5 resize-none focus:outline-none border border-gray-700/50 text-sm min-w-0"
          />
          <button onClick={handleRun} disabled={running || !prompt.trim()}
            className="bg-white hover:bg-gray-200 disabled:opacity-30 text-black px-4 py-2.5 rounded-xl text-sm font-semibold">
            {running ? "..." : "Send"}
          </button>
        </div>
      </div>
    </div>
  );
}
