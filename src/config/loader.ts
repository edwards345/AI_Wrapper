import { config as loadDotenv } from "dotenv";
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { homedir } from "node:os";
import { configSchema, type AppConfig } from "./schema.js";

const CONFIG_DIR = join(homedir(), ".aiwrapper");
const CONFIG_FILE = join(CONFIG_DIR, "config.json");
const ENV_FILE = join(CONFIG_DIR, ".env");

export function loadConfig(): AppConfig {
  // Load .env from ~/.aiwrapper/.env if it exists
  if (existsSync(ENV_FILE)) {
    loadDotenv({ path: ENV_FILE, quiet: true });
  }

  // Also load .env from project root (for development)
  loadDotenv({ quiet: true });

  // Build config from environment variables
  const envConfig: AppConfig = {
    anthropicApiKey: process.env.ANTHROPIC_API_KEY || undefined,
    openaiApiKey: process.env.OPENAI_API_KEY || undefined,
    geminiApiKey: process.env.GEMINI_API_KEY || undefined,
    xaiApiKey: process.env.XAI_API_KEY || undefined,
  };

  // Merge with config.json if it exists
  if (existsSync(CONFIG_FILE)) {
    try {
      const fileConfig = JSON.parse(readFileSync(CONFIG_FILE, "utf-8"));
      const parsed = configSchema.parse(fileConfig);
      return {
        ...parsed,
        // Env vars take precedence over config file
        anthropicApiKey: envConfig.anthropicApiKey || parsed.anthropicApiKey,
        openaiApiKey: envConfig.openaiApiKey || parsed.openaiApiKey,
        geminiApiKey: envConfig.geminiApiKey || parsed.geminiApiKey,
        xaiApiKey: envConfig.xaiApiKey || parsed.xaiApiKey,
      };
    } catch {
      console.warn("Warning: Failed to parse ~/.aiwrapper/config.json, using env vars only.");
    }
  }

  return configSchema.parse(envConfig);
}
