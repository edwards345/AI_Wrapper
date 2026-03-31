import { z } from "zod";

export const configSchema = z.object({
  anthropicApiKey: z.string().optional(),
  openaiApiKey: z.string().optional(),
  geminiApiKey: z.string().optional(),
  xaiApiKey: z.string().optional(),
  defaultProviders: z.array(z.enum(["claude", "openai", "gemini", "grok"])).optional(),
  defaultPreset: z.enum(["fast", "balanced", "flagship", "all"]).optional(),
});

export type AppConfig = z.infer<typeof configSchema>;
