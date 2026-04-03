import type { ProviderClient, ProviderResult, ChatParams, ChatMessage } from "../providers/types.js";
import type { ProviderName } from "./models.js";

const DEFAULT_TIMEOUT_MS = 60_000;

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

  // Streaming: collect tokens per provider, display sequentially
  // Each provider streams into a buffer. When done, it resolves.
  // We use a queue to display streams one at a time in arrival order.

  interface StreamJob {
    selection: ModelSelection;
    result: Promise<ProviderResult>;
    tokens: string[];
    firstTokenTime: number | null;
  }

  const jobs: StreamJob[] = [];
  const finishedQueue: ProviderResult[] = [];
  let displayResolve: (() => void) | null = null;

  for (const sel of selections) {
    const chatParams: ChatParams = {
      model: sel.model,
      label: sel.label,
      prompt: params.prompt,
      systemPrompt: params.systemPrompt,
      maxTokens: params.maxTokens,
    };

    const job: StreamJob = {
      selection: sel,
      tokens: [],
      firstTokenTime: null,
      result: null as unknown as Promise<ProviderResult>,
    };

    const streamFn = sel.client.chatStream;
    if (streamFn) {
      job.result = withTimeout(
        streamFn.call(sel.client, chatParams, (token: string) => {
          if (job.firstTokenTime === null) job.firstTokenTime = performance.now();
          job.tokens.push(token);
        }),
        timeoutMs,
        sel
      ).catch((err) => ({
        provider: sel.client.name,
        model: sel.model,
        label: sel.label,
        status: "error" as const,
        content: "",
        latencyMs: 0,
        error: err instanceof Error ? err.message : String(err),
      }));
    } else {
      // Fallback to non-streaming
      job.result = withTimeout(sel.client.chat(chatParams), timeoutMs, sel).catch((err) => ({
        provider: sel.client.name,
        model: sel.model,
        label: sel.label,
        status: "error" as const,
        content: "",
        latencyMs: 0,
        error: err instanceof Error ? err.message : String(err),
      }));
    }

    // When this provider finishes, push to queue and signal
    job.result.then((result) => {
      finishedQueue.push(result);
      if (displayResolve) displayResolve();
    });

    jobs.push(job);
  }

  // Display results one at a time as they finish
  const allResults: ProviderResult[] = [];
  let displayed = 0;

  while (displayed < selections.length) {
    // Wait for next result if queue is empty
    if (finishedQueue.length === displayed) {
      await new Promise<void>((resolve) => { displayResolve = resolve; });
    }

    const result = finishedQueue[displayed];
    displayed++;

    // Find the job to get its tokens
    const job = jobs.find((j) => j.selection.label === result.label);

    if (result.status === "success" && job && job.tokens.length > 0) {
      // Notify stream start, replay tokens, then end
      params.onStreamStart?.(result.label, result.provider);
      for (const token of job.tokens) {
        params.onStreamToken?.(result.label, token);
      }
      params.onStreamEnd?.(result);
    } else {
      // Non-streaming fallback or error
      params.onResult?.(result);
    }

    allResults.push(result);
  }

  return allResults;
}
