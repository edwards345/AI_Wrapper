export type ProviderName = "claude" | "openai" | "gemini" | "grok";

export interface ModelDef {
  id: string;
  label: string;
  tier: string;
}

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

export interface ModelsResponse {
  models: Record<ProviderName, ModelDef[]>;
  availableProviders: ProviderName[];
}
