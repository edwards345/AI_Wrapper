import Anthropic from "@anthropic-ai/sdk";
import type { ProviderClient, ChatParams, ProviderResult } from "./types.js";
import { friendlyError } from "./errors.js";

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
          error: friendlyError(err),
        };
      }
    },

    async chatStream(params: ChatParams, onToken: (token: string) => void): Promise<ProviderResult> {
      const start = performance.now();

      try {
        const stream = client.messages.stream({
          model: params.model,
          max_tokens: params.maxTokens ?? 1024,
          system: params.systemPrompt ?? "",
          messages: [{ role: "user", content: params.prompt }],
        });

        let content = "";
        for await (const event of stream) {
          if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
            content += event.delta.text;
            onToken(event.delta.text);
          }
        }

        const finalMessage = await stream.finalMessage();
        const latencyMs = Math.round(performance.now() - start);

        return {
          provider: "claude",
          model: params.model,
          label: params.label,
          status: "success",
          content,
          latencyMs,
          inputTokens: finalMessage.usage.input_tokens,
          outputTokens: finalMessage.usage.output_tokens,
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
          error: friendlyError(err),
        };
      }
    },
  };
}
