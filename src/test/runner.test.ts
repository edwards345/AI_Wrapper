import { loadConfig } from "../config/loader.js";
import { createAnthropicClient } from "../providers/anthropic.js";
import { createOpenAIClient } from "../providers/openai.js";
import { createGeminiClient } from "../providers/gemini.js";
import { createXAIClient } from "../providers/xai.js";
import { runAll } from "../engine/runner.js";
import { MODELS } from "../engine/models.js";
import type { ProviderClient } from "../providers/types.js";

async function main() {
  const config = loadConfig();

  // Build selections from whichever API keys are available
  const selections: { client: ProviderClient; model: string; label: string }[] = [];

  if (config.anthropicApiKey) {
    const client = createAnthropicClient(config.anthropicApiKey);
    selections.push({ client, model: "claude-sonnet-4-6", label: "Claude Sonnet 4.6" });
  }
  if (config.openaiApiKey) {
    const client = createOpenAIClient(config.openaiApiKey);
    const m = MODELS.openai[0];
    selections.push({ client, model: m.id, label: m.label });
  }
  if (config.geminiApiKey) {
    const client = createGeminiClient(config.geminiApiKey);
    selections.push({ client, model: "gemini-2.5-flash", label: "Gemini 2.5 Flash" });
  }
  if (config.xaiApiKey) {
    const client = createXAIClient(config.xaiApiKey);
    const m = MODELS.grok[0];
    selections.push({ client, model: m.id, label: m.label });
  }

  if (selections.length === 0) {
    console.error("No API keys configured. Add at least one to .env");
    process.exit(1);
  }

  console.log(`Running prompt across ${selections.length} provider(s)...\n`);

  const results = await runAll(selections, {
    prompt: "In one sentence, what makes a great software engineer?",
    maxTokens: 2048,
  });

  for (const r of results) {
    console.log(`--- ${r.label} (${r.model}) ---`);
    console.log(`Status:  ${r.status}`);
    console.log(`Latency: ${r.latencyMs}ms`);
    if (r.status === "success") {
      console.log(`Tokens:  ${r.inputTokens ?? "?"} in / ${r.outputTokens ?? "?"} out`);
      console.log(`\n${r.content}\n`);
    } else {
      console.log(`Error:   ${r.error}\n`);
    }
  }
}

main();
