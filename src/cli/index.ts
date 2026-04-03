#!/usr/bin/env node

import { Command } from "commander";
import { writeFileSync } from "node:fs";
import { loadConfig } from "../config/loader.js";
import { MODELS, findModel, type ProviderName } from "../engine/models.js";
import { runAll } from "../engine/runner.js";
import { createAnthropicClient } from "../providers/anthropic.js";
import { createOpenAIClient } from "../providers/openai.js";
import { createGeminiClient } from "../providers/gemini.js";
import { createXAIClient } from "../providers/xai.js";
import type { ProviderClient } from "../providers/types.js";
import {
  createSpinners,
  stopAllSpinners,
  printResults,
  printModelList,
  printSummary,
  resultsToMarkdown,
} from "./display.js";

const TIER_PRESETS: Record<string, string> = {
  flagship: "flagship",
  balanced: "balanced",
  fast: "fast",
};

const program = new Command()
  .name("aiwrapper")
  .description("Multi-LLM prompt runner — send one prompt to Claude, GPT, Gemini, and Grok")
  .version("0.1.0")
  .argument("[prompt]", "The prompt to send to all selected models")
  .option("-p, --providers <list>", "Comma-separated providers: claude,openai,gemini,grok")
  .option("-m, --models <list>", "Comma-separated model IDs")
  .option("-s, --system <prompt>", "System prompt")
  .option("--summarize", "Generate a combined summary of all responses")
  .option("--consensus", "Generate a consensus/voted summary")
  .option("--preset <tier>", "Model preset: flagship, balanced, fast")
  .option("--list-models", "List all available models")
  .option("-o, --output <file>", "Save results to a markdown file")
  .option("--timeout <ms>", "Timeout per provider in milliseconds", "30000");

program.parse();

const opts = program.opts();

async function main(): Promise<void> {
  // Handle --list-models
  if (opts.listModels) {
    printModelList();
    return;
  }

  const prompt = program.args[0];
  if (!prompt) {
    program.help();
    return;
  }

  const config = loadConfig();

  // Build provider clients from available keys
  const clients: Record<ProviderName, ProviderClient | null> = {
    claude: config.anthropicApiKey ? createAnthropicClient(config.anthropicApiKey) : null,
    openai: config.openaiApiKey ? createOpenAIClient(config.openaiApiKey) : null,
    gemini: config.geminiApiKey ? createGeminiClient(config.geminiApiKey) : null,
    grok: config.xaiApiKey ? createXAIClient(config.xaiApiKey) : null,
  };

  // Determine which models to run
  let selections: { client: ProviderClient; model: string; label: string; provider: ProviderName }[] = [];

  if (opts.models) {
    // Explicit model IDs
    const modelIds = (opts.models as string).split(",").map((s: string) => s.trim());
    for (const id of modelIds) {
      const found = findModel(id);
      if (!found) {
        console.error(`Unknown model: ${id}. Use --list-models to see available models.`);
        process.exit(1);
      }
      const client = clients[found.provider];
      if (!client) {
        console.error(
          `No API key for ${found.provider}. Set it in .env or ~/.aiwrapper/.env`
        );
        process.exit(1);
      }
      selections.push({
        client,
        model: found.model.id,
        label: found.model.label,
        provider: found.provider,
      });
    }
  } else {
    // Determine providers
    let providerNames: ProviderName[];
    if (opts.providers) {
      providerNames = (opts.providers as string).split(",").map((s: string) => s.trim()) as ProviderName[];
    } else {
      // Use all providers that have keys configured
      providerNames = (Object.keys(clients) as ProviderName[]).filter((p) => clients[p] !== null);
    }

    // Determine tier
    const tier = TIER_PRESETS[opts.preset as string] ?? "flagship";

    for (const provider of providerNames) {
      const client = clients[provider];
      if (!client) {
        console.error(`No API key for ${provider}. Skipping.`);
        continue;
      }
      // Pick the first model matching the tier, or fall back to the first model
      const model =
        MODELS[provider].find((m) => m.tier === tier) ?? MODELS[provider][0];
      selections.push({ client, model: model.id, label: model.label, provider });
    }
  }

  if (selections.length === 0) {
    console.error("No providers available. Add API keys to .env or ~/.aiwrapper/.env");
    process.exit(1);
  }

  // Show spinners and run
  const spinners = createSpinners(
    selections.map((s) => ({ provider: s.provider, label: s.label }))
  );

  const results = await runAll(selections, {
    prompt,
    systemPrompt: opts.system as string | undefined,
    maxTokens: 2048,
    timeoutMs: parseInt(opts.timeout as string, 10),
  });

  stopAllSpinners(spinners);
  printResults(results);

  // Save to file if requested
  if (opts.output) {
    const md = resultsToMarkdown(prompt, results);
    writeFileSync(opts.output as string, md, "utf-8");
    console.log(`Results saved to ${opts.output}`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
