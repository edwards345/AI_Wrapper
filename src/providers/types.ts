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
  chatStream?(params: ChatParams, onToken: (token: string) => void): Promise<ProviderResult>;
}

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export interface Attachment {
  type: "image" | "pdf";
  mimeType: string;
  data: string; // base64
  name?: string;
}

export interface ChatParams {
  model: string;
  label: string;
  prompt: string;
  systemPrompt?: string;
  maxTokens?: number;
  messages?: ChatMessage[];
  attachments?: Attachment[];
}
