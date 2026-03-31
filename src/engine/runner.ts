import type { ProviderClient, ProviderResult, ChatParams } from "../providers/types.js";

const DEFAULT_TIMEOUT_MS = 30_000;

interface RunParams {
  prompt: string;
  systemPrompt?: string;
  maxTokens?: number;
  timeoutMs?: number;
}

interface ModelSelection {
  client: ProviderClient;
  model: string;
  label: string;
}

function withTimeout(
  promise: Promise<ProviderResult>,
  timeoutMs: number,
  selection: ModelSelection
): Promise<ProviderResult> {
  return Promise.race([
    promise,
    new Promise<ProviderResult>((resolve) => {
      setTimeout(() => {
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

  const promises = selections.map((sel) => {
    const chatParams: ChatParams = {
      model: sel.model,
      label: sel.label,
      prompt: params.prompt,
      systemPrompt: params.systemPrompt,
      maxTokens: params.maxTokens,
    };

    return withTimeout(sel.client.chat(chatParams), timeoutMs, sel);
  });

  const settled = await Promise.allSettled(promises);

  return settled.map((result, i) => {
    if (result.status === "fulfilled") {
      return result.value;
    }
    // Should not happen since providers catch internally, but just in case
    return {
      provider: selections[i].client.name,
      model: selections[i].model,
      label: selections[i].label,
      status: "error" as const,
      content: "",
      latencyMs: 0,
      error: result.reason instanceof Error ? result.reason.message : String(result.reason),
    };
  });
}
