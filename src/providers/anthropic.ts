import Anthropic from "@anthropic-ai/sdk";
import type { ProviderClient, ChatParams, ProviderResult } from "./types.js";
import { friendlyError } from "./errors.js";

function buildMessages(params: ChatParams): Anthropic.MessageParam[] {
  const msgs: Anthropic.MessageParam[] = [];

  if (params.messages?.length) {
    for (const m of params.messages) {
      msgs.push({ role: m.role, content: m.content });
    }
  }

  // Build the current user message with optional attachments
  const content: Anthropic.ContentBlockParam[] = [];

  if (params.attachments?.length) {
    for (const att of params.attachments) {
      if (att.type === "image") {
        content.push({
          type: "image",
          source: { type: "base64", media_type: att.mimeType as "image/jpeg" | "image/png" | "image/gif" | "image/webp", data: att.data },
        });
      } else if (att.type === "pdf") {
        content.push({
          type: "document",
          source: { type: "base64", media_type: "application/pdf", data: att.data },
        });
      } else if (att.type === "text") {
        content.push({ type: "text", text: `[File: ${att.name}]\n${att.data}` });
      }
    }
  }

  content.push({ type: "text", text: params.prompt });
  msgs.push({ role: "user", content });

  return msgs;
}

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
          messages: buildMessages(params),
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
          messages: buildMessages(params),
        });

        let content = "";
        let inputTokens: number | undefined;
        let outputTokens: number | undefined;

        for await (const event of stream) {
          if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
            content += event.delta.text;
            onToken(event.delta.text);
          }
          if (event.type === "message_delta" && event.usage) {
            outputTokens = event.usage.output_tokens;
          }
          if (event.type === "message_start" && event.message?.usage) {
            inputTokens = event.message.usage.input_tokens;
          }
        }

        const latencyMs = Math.round(performance.now() - start);

        return {
          provider: "claude",
          model: params.model,
          label: params.label,
          status: "success",
          content,
          latencyMs,
          inputTokens,
          outputTokens,
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
