import OpenAI from "openai";
import type { ProviderClient, ChatParams, ProviderResult } from "./types.js";

export function createXAIClient(apiKey: string): ProviderClient {
  const client = new OpenAI({
    apiKey,
    baseURL: "https://api.x.ai/v1",
  });

  return {
    name: "grok",

    async chat(params: ChatParams): Promise<ProviderResult> {
      const start = performance.now();

      try {
        const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [];

        if (params.systemPrompt) {
          messages.push({ role: "system", content: params.systemPrompt });
        }
        messages.push({ role: "user", content: params.prompt });

        const response = await client.chat.completions.create({
          model: params.model,
          messages,
          max_tokens: params.maxTokens ?? 1024,
        });

        const latencyMs = Math.round(performance.now() - start);
        const content = response.choices[0]?.message?.content ?? "";

        return {
          provider: "grok",
          model: params.model,
          label: params.label,
          status: "success",
          content,
          latencyMs,
          inputTokens: response.usage?.prompt_tokens,
          outputTokens: response.usage?.completion_tokens,
        };
      } catch (err) {
        const latencyMs = Math.round(performance.now() - start);
        return {
          provider: "grok",
          model: params.model,
          label: params.label,
          status: "error",
          content: "",
          latencyMs,
          error: err instanceof Error ? err.message : String(err),
        };
      }
    },
  };
}
