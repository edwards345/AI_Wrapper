import { GoogleGenerativeAI, type Content } from "@google/generative-ai";
import type { ProviderClient, ChatParams, ProviderResult } from "./types.js";
import { friendlyError } from "./errors.js";

function buildContents(params: ChatParams): Content[] {
  const contents: Content[] = [];
  if (params.messages?.length) {
    for (const m of params.messages) {
      contents.push({
        role: m.role === "assistant" ? "model" : "user",
        parts: [{ text: m.content }],
      });
    }
  }
  contents.push({ role: "user", parts: [{ text: params.prompt }] });
  return contents;
}

export function createGeminiClient(apiKey: string): ProviderClient {
  const genAI = new GoogleGenerativeAI(apiKey);

  return {
    name: "gemini",

    async chat(params: ChatParams): Promise<ProviderResult> {
      const start = performance.now();

      try {
        const model = genAI.getGenerativeModel({
          model: params.model,
          systemInstruction: params.systemPrompt || undefined,
        });

        const result = await model.generateContent({
          contents: buildContents(params),
          generationConfig: {
            maxOutputTokens: params.maxTokens ?? 1024,
          },
        });

        const latencyMs = Math.round(performance.now() - start);
        const response = result.response;
        const content = response.text();
        const usage = response.usageMetadata;

        return {
          provider: "gemini",
          model: params.model,
          label: params.label,
          status: "success",
          content,
          latencyMs,
          inputTokens: usage?.promptTokenCount,
          outputTokens: usage?.candidatesTokenCount,
        };
      } catch (err) {
        const latencyMs = Math.round(performance.now() - start);
        return {
          provider: "gemini",
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
        const model = genAI.getGenerativeModel({
          model: params.model,
          systemInstruction: params.systemPrompt || undefined,
        });

        const result = await model.generateContentStream({
          contents: buildContents(params),
          generationConfig: {
            maxOutputTokens: params.maxTokens ?? 1024,
          },
        });

        let content = "";
        for await (const chunk of result.stream) {
          const text = chunk.text();
          if (text) {
            content += text;
            onToken(text);
          }
        }

        const latencyMs = Math.round(performance.now() - start);
        const response = await result.response;
        const usage = response.usageMetadata;

        return {
          provider: "gemini",
          model: params.model,
          label: params.label,
          status: "success",
          content,
          latencyMs,
          inputTokens: usage?.promptTokenCount,
          outputTokens: usage?.candidatesTokenCount,
        };
      } catch (err) {
        const latencyMs = Math.round(performance.now() - start);
        return {
          provider: "gemini",
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
