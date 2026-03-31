import { GoogleGenerativeAI } from "@google/generative-ai";
import type { ProviderClient, ChatParams, ProviderResult } from "./types.js";

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
          contents: [{ role: "user", parts: [{ text: params.prompt }] }],
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
          error: err instanceof Error ? err.message : String(err),
        };
      }
    },
  };
}
