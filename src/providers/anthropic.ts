import Anthropic from "@anthropic-ai/sdk";
import type { ProviderClient, ChatParams, ProviderResult } from "./types.js";

export function createAnthropicClient(apiKey: string): ProviderClient {
  const client = new Anthropic({ apiKey });

  return {
    name: "claude",

    async chat(params: ChatParams): Promise<ProviderResult> {
      const start = performance.now();

      try {
        const message = await client.messages.create({
          model: params.model,
          max_tokens: params.maxTokens ?? 1024,
          system: params.systemPrompt ?? "",
          messages: [{ role: "user", content: params.prompt }],
        });

        const latencyMs = Math.round(performance.now() - start);
        const content = message.content
          .filter((block) => block.type === "text")
          .map((block) => block.text)
          .join("\n");

        return {
          provider: "claude",
          model: params.model,
          label: params.label,
          status: "success",
          content,
          latencyMs,
          inputTokens: message.usage.input_tokens,
          outputTokens: message.usage.output_tokens,
        };
      } catch (err) {
        const latencyMs = Math.round(performance.now() - start);
        return {
          provider: "claude",
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
