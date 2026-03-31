import type { ProviderName } from "../engine/models.js";

export interface ProviderResult {
  provider: ProviderName;
  model: string;
  label: string;
  status: "success" | "error" | "timeout";
  content: string;
  latencyMs: number;
  inputTokens?: number;
  outputTokens?: number;
  error?: string;
}

export interface ProviderClient {
  name: ProviderName;
  chat(params: ChatParams): Promise<ProviderResult>;
}

export interface ChatParams {
  model: string;
  label: string;
  prompt: string;
  systemPrompt?: string;
  maxTokens?: number;
}
