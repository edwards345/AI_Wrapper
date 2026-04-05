import OpenAI from "openai";
import type { ProviderClient, ChatParams, ProviderResult } from "./types.js";
import { friendlyError } from "./errors.js";

export function createXAIClient(apiKey: string): ProviderClient {
  const client = new OpenAI({
    apiKey,
    baseURL: "https://api.x.ai/v1",
  });

  function buildMessages(params: ChatParams): OpenAI.Chat.Completions.ChatCompletionMessageParam[] {
    const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [];
    if (params.systemPrompt) {
      messages.push({ role: "system", content: params.systemPrompt });
    }
    if (params.messages?.length) {
      for (const m of params.messages) {
        messages.push({ role: m.role, content: m.content });
      }
    }
    messages.push({ role: "user", content: params.prompt });
    return messages;
  }

  return {
    name: "grok",

    async chat(params: ChatParams): Promise<ProviderResult> {
      const start = performance.now();

      try {
        const response = await client.chat.completions.create({
          model: params.model,
          messages: buildMessages(params),
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
          error: friendlyError(err),
        };
      }
    },

    async chatStream(params: ChatParams, onToken: (token: string) => void): Promise<ProviderResult> {
      const start = performance.now();

      try {
        const stream = await client.chat.completions.create({
          model: params.model,
          messages: buildMessages(params),
          max_tokens: params.maxTokens ?? 1024,
          stream: true,
        });

        let content = "";
        const IDLE_TIMEOUT_MS = 15_000;

        // xAI may not send [DONE], so use an idle timeout to detect end-of-stream
        await new Promise<void>((resolve, reject) => {
          let idleTimer = setTimeout(resolve, IDLE_TIMEOUT_MS);

          const iter = stream[Symbol.asyncIterator]();

          function pull() {
            iter.next().then(({ done, value }) => {
              if (done) { clearTimeout(idleTimer); resolve(); return; }
              clearTimeout(idleTimer);
              const delta = value.choices[0]?.delta?.content;
              if (delta) {
                content += delta;
                onToken(delta);
              }
              idleTimer = setTimeout(resolve, IDLE_TIMEOUT_MS);
              pull();
            }).catch((err) => { clearTimeout(idleTimer); reject(err); });
          }

          pull();
        });

        const latencyMs = Math.round(performance.now() - start);

        return {
          provider: "grok",
          model: params.model,
          label: params.label,
          status: "success",
          content,
          latencyMs,
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
          error: friendlyError(err),
        };
      }
    },
  };
}
