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

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export interface SavedChat {
  id: string;
  title: string;
  timestamp: number;
  messages: ChatMessage[];
  selectedModels: string[];
  systemPrompt?: string;
}

export interface ModelsResponse {
  models: Record<ProviderName, ModelDef[]>;
  availableProviders: ProviderName[];
}
