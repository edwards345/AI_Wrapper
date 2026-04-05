import type { ModelsResponse, ProviderResult, ChatMessage } from "./types";

export async function fetchModels(): Promise<ModelsResponse> {
  const res = await fetch("/api/models");
  return res.json();
}

export interface RunOptions {
  prompt: string;
  systemPrompt?: string;
  messages?: ChatMessage[];
  models?: string[];
  providers?: string[];
  preset?: string;
  onStreamStart?: (label: string, provider: string) => void;
  onStreamToken?: (label: string, token: string) => void;
  onStreamEnd?: (result: ProviderResult) => void;
  onResult?: (result: ProviderResult) => void;
  onDone?: (results: ProviderResult[]) => void;
  onError?: (error: string) => void;
}

export function runPrompt(options: RunOptions): () => void {
  const controller = new AbortController();

  const body: Record<string, unknown> = {
    prompt: options.prompt,
    stream: true,
  };
  if (options.systemPrompt) body.systemPrompt = options.systemPrompt;
  if (options.messages?.length) body.messages = options.messages;
  if (options.models?.length) body.models = options.models;
  if (options.providers?.length) body.providers = options.providers;
  if (options.preset) body.preset = options.preset;

  fetch("/api/run", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal: controller.signal,
  }).then(async (res) => {
    if (!res.ok || !res.body) {
      const err = await res.json().catch(() => ({ error: "Request failed" }));
      options.onError?.(err.error || "Request failed");
      return;
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() || "";

      let eventType = "";
      for (const line of lines) {
        if (line.startsWith("event: ")) {
          eventType = line.slice(7).trim();
        } else if (line.startsWith("data: ") && eventType) {
          try {
            const data = JSON.parse(line.slice(6));
            switch (eventType) {
              case "stream-start":
                options.onStreamStart?.(data.label, data.provider);
                break;
              case "stream-token":
                options.onStreamToken?.(data.label, data.token);
                break;
              case "stream-end":
                options.onStreamEnd?.(data as ProviderResult);
                break;
              case "result":
                options.onResult?.(data as ProviderResult);
                break;
              case "done":
                options.onDone?.(data.results as ProviderResult[]);
                break;
              case "error":
                options.onError?.(data.error);
                break;
            }
          } catch {
            // skip malformed JSON
          }
          eventType = "";
        }
        // blank lines don't reset eventType — only data lines do
      }
    }
  }).catch((err) => {
    if (err.name !== "AbortError") {
      options.onError?.(err.message);
    }
  });

  return () => controller.abort();
}

export async function fetchSummary(
  prompt: string,
  results: ProviderResult[],
  mode: "combined" | "consensus"
): Promise<string> {
  const res = await fetch("/api/summary", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prompt, results, mode }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error);
  return data.content;
}
