import type { ProviderClient, ProviderResult, ChatParams, ChatMessage } from "../providers/types.js";
import type { ProviderName } from "./models.js";

const DEFAULT_TIMEOUT_MS = 120_000;

export interface RunParams {
  prompt: string;
  systemPrompt?: string;
  messages?: ChatMessage[];
  maxTokens?: number;
  timeoutMs?: number;
  stream?: boolean;
  onResult?: (result: ProviderResult) => void;
  onStreamStart?: (label: string, provider: ProviderName) => void;
  onStreamToken?: (label: string, token: string) => void;
  onStreamEnd?: (result: ProviderResult) => void;
}

export interface ModelSelection {
  client: ProviderClient;
  model: string;
  label: string;
}

function withTimeout(
  promise: Promise<ProviderResult>,
  timeoutMs: number,
  selection: ModelSelection
): Promise<ProviderResult> {
  let timer: NodeJS.Timeout;
  return Promise.race([
    promise.then((result) => { clearTimeout(timer); return result; }),
    new Promise<ProviderResult>((resolve) => {
      timer = setTimeout(() => {
        resolve({
          provider: selection.client.name,
          model: selection.model,
          label: selection.label,
          status: "timeout",
          content: "",
          latencyMs: timeoutMs,
          error: `Timed out after ${timeoutMs}ms`,
        });
      }, timeoutMs);
    }),
  ]);
}

export async function runAll(
  selections: ModelSelection[],
  params: RunParams
): Promise<ProviderResult[]> {
  const timeoutMs = params.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const useStream = params.stream ?? false;

  // Non-streaming: fire all at once, report as each finishes
  if (!useStream) {
    const results: ProviderResult[] = [];

    const promises = selections.map(async (sel) => {
      const chatParams: ChatParams = {
        model: sel.model,
        label: sel.label,
        prompt: params.prompt,
        systemPrompt: params.systemPrompt,
        messages: params.messages,
        maxTokens: params.maxTokens,
      };

      let result: ProviderResult;
      try {
        result = await withTimeout(sel.client.chat(chatParams), timeoutMs, sel);
      } catch (err) {
        result = {
          provider: sel.client.name,
          model: sel.model,
          label: sel.label,
          status: "error" as const,
          content: "",
          latencyMs: 0,
          error: err instanceof Error ? err.message : String(err),
        };
      }

      results.push(result);
      params.onResult?.(result);
      return result;
    });

    await Promise.allSettled(promises);
    return results;
  }

  // Streaming: fire callbacks in real-time as tokens arrive from all providers in parallel

  const allResults: ProviderResult[] = [];
  const started = new Set<string>();

  const promises = selections.map(async (sel) => {
    const chatParams: ChatParams = {
      model: sel.model,
      label: sel.label,
      prompt: params.prompt,
      systemPrompt: params.systemPrompt,
      messages: params.messages,
      maxTokens: params.maxTokens,
    };

    let result: ProviderResult;
    let timedOut = false;

    const streamFn = sel.client.chatStream;
    if (streamFn) {
      try {
        const streamPromise = streamFn.call(sel.client, chatParams, (token: string) => {
          if (timedOut) return; // ignore tokens after timeout
          if (!started.has(sel.label)) {
            started.add(sel.label);
            params.onStreamStart?.(sel.label, sel.client.name);
          }
          params.onStreamToken?.(sel.label, token);
        });

        result = await withTimeout(streamPromise, timeoutMs, sel);
        if (result.status === "timeout") timedOut = true;
      } catch (err) {
        result = {
          provider: sel.client.name,
          model: sel.model,
          label: sel.label,
          status: "error" as const,
          content: "",
          latencyMs: 0,
          error: err instanceof Error ? err.message : String(err),
        };
      }
    } else {
      // Fallback to non-streaming
      try {
        result = await withTimeout(sel.client.chat(chatParams), timeoutMs, sel);
      } catch (err) {
        result = {
          provider: sel.client.name,
          model: sel.model,
          label: sel.label,
          status: "error" as const,
          content: "",
          latencyMs: 0,
          error: err instanceof Error ? err.message : String(err),
        };
      }
    }

    if (started.has(sel.label)) {
      params.onStreamEnd?.(result);
    } else {
      params.onResult?.(result);
    }

    allResults.push(result);
    return result;
  });

  await Promise.allSettled(promises);
  return allResults;
}
