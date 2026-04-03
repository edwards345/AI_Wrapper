#!/usr/bin/env node

import { Command } from "commander";
import { createInterface } from "node:readline/promises";
import { writeFileSync } from "node:fs";
import { loadConfig } from "../config/loader.js";
import { runConfigWizard, needsSetup } from "../config/wizard.js";
import { MODELS, findModel, type ProviderName } from "../engine/models.js";
import { runAll } from "../engine/runner.js";
import { combinedSummary, consensusSummary } from "../engine/summarizer.js";
import { createAnthropicClient } from "../providers/anthropic.js";
import { createOpenAIClient } from "../providers/openai.js";
import { createGeminiClient } from "../providers/gemini.js";
import { createXAIClient } from "../providers/xai.js";
import type { ProviderClient, ProviderResult } from "../providers/types.js";
import {
  createProgressSpinner,
  pauseSpinner,
  resumeSpinner,
  markDoneAndPrint,
  markPending,
  printStreamHeader,
  writeStreamToken,
  printStreamFooter,
  printResult,
  printModelList,
  printSummary,
  resultsToMarkdown,
} from "./display.js";
import chalk from "chalk";
import ora from "ora";

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
  .option("--preset <tier>", "Model preset: flagship, balanced, fast", "fast")
  .option("--list-models", "List all available models")
  .option("-i, --interactive", "Interactive mode — prompt loop")
  .option("-o, --output <file>", "Save results to a markdown file")
  .option("--no-stream", "Disable streaming (wait for full response)")
  .option("--config", "Re-run API key setup wizard")
  .option("--timeout <ms>", "Timeout per provider in milliseconds", "60000");

program.parse();

const opts = program.opts();

interface Selection {
  client: ProviderClient;
  model: string;
  label: string;
  provider: ProviderName;
}

function buildClients(config: ReturnType<typeof loadConfig>) {
  return {
    claude: config.anthropicApiKey ? createAnthropicClient(config.anthropicApiKey) : null,
    openai: config.openaiApiKey ? createOpenAIClient(config.openaiApiKey) : null,
    gemini: config.geminiApiKey ? createGeminiClient(config.geminiApiKey) : null,
    grok: config.xaiApiKey ? createXAIClient(config.xaiApiKey) : null,
  } as Record<ProviderName, ProviderClient | null>;
}

function buildSelections(clients: Record<ProviderName, ProviderClient | null>): Selection[] {
  const selections: Selection[] = [];

  if (opts.models) {
    const modelIds = (opts.models as string).split(",").map((s: string) => s.trim());
    for (const id of modelIds) {
      const found = findModel(id);
      if (!found) {
        console.error(`Unknown model: ${id}. Use --list-models to see available models.`);
        process.exit(1);
      }
      const client = clients[found.provider];
      if (!client) {
        console.error(`No API key for ${found.provider}. Set it in .env or ~/.aiwrapper/.env`);
        process.exit(1);
      }
      selections.push({ client, model: found.model.id, label: found.model.label, provider: found.provider });
    }
  } else {
    let providerNames: ProviderName[];
    if (opts.providers) {
      providerNames = (opts.providers as string).split(",").map((s: string) => s.trim()) as ProviderName[];
    } else {
      providerNames = (Object.keys(clients) as ProviderName[]).filter((p) => clients[p] !== null);
    }

    const tier = TIER_PRESETS[opts.preset as string] ?? "flagship";

    for (const provider of providerNames) {
      const client = clients[provider];
      if (!client) {
        console.error(`No API key for ${provider}. Skipping.`);
        continue;
      }
      const model = MODELS[provider].find((m) => m.tier === tier) ?? MODELS[provider][0];
      selections.push({ client, model: model.id, label: model.label, provider });
    }
  }

  return selections;
}

async function runPrompt(
  prompt: string,
  selections: Selection[],
  config: ReturnType<typeof loadConfig>
): Promise<ProviderResult[]> {
  const progress = createProgressSpinner(selections.map((s) => s.label));
  const useStream = opts.stream !== false;

  // Build a lookup from label to selection info
  const selMap = new Map(selections.map((s) => [s.label, s]));

  const results = await runAll(selections, {
    prompt,
    systemPrompt: opts.system as string | undefined,
    maxTokens: 2048,
    timeoutMs: parseInt(opts.timeout as string, 10),
    stream: useStream,

    // Non-streaming callback
    onResult: (result) => {
      markDoneAndPrint(progress, result);
    },

    // Streaming callbacks
    onStreamStart: (label, provider) => {
      pauseSpinner(progress);
      markPending(progress, label);
      const sel = selMap.get(label)!;
      printStreamHeader(label, sel.model, provider);
    },
    onStreamToken: (_label, token) => {
      writeStreamToken(token);
    },
    onStreamEnd: (result) => {
      printStreamFooter(result);
      resumeSpinner(progress);
    },
  });

  // Combined summary
  if (opts.summarize && config.anthropicApiKey) {
    const spinner = ora(chalk.cyan("Generating combined summary...")).start();
    try {
      const summary = await combinedSummary(config.anthropicApiKey, prompt, results);
      spinner.stop();
      printSummary("Combined Summary", summary);
    } catch (err) {
      spinner.stop();
      console.error(chalk.red(`Summary error: ${err instanceof Error ? err.message : err}`));
    }
  }

  // Consensus summary
  if (opts.consensus && config.anthropicApiKey) {
    const spinner = ora(chalk.cyan("Analyzing consensus...")).start();
    try {
      const consensus = await consensusSummary(config.anthropicApiKey, prompt, results);
      spinner.stop();
      printSummary("Consensus Analysis", consensus);
    } catch (err) {
      spinner.stop();
      console.error(chalk.red(`Consensus error: ${err instanceof Error ? err.message : err}`));
    }
  }

  if ((opts.summarize || opts.consensus) && !config.anthropicApiKey) {
    console.error(chalk.red("Summarize/consensus requires ANTHROPIC_API_KEY to be set."));
  }

  return results;
}

async function interactiveMode(
  selections: Selection[],
  config: ReturnType<typeof loadConfig>
): Promise<void> {
  const rl = createInterface({ input: process.stdin, output: process.stdout });

  console.log(chalk.cyan.bold("\n  AI Wrapper — Interactive Mode"));
  console.log(chalk.dim(`  ${selections.length} provider(s) active. Type "exit" or Ctrl+C to quit.\n`));

  while (true) {
    const prompt = await rl.question(chalk.cyan("? "));

    if (!prompt.trim()) continue;
    if (prompt.trim().toLowerCase() === "exit") break;

    await runPrompt(prompt, selections, config);
  }

  rl.close();
}

async function main(): Promise<void> {
  if (opts.listModels) {
    printModelList();
    return;
  }

  // Config wizard
  if (opts.config) {
    await runConfigWizard();
    return;
  }

  // First-run setup
  if (needsSetup() && !program.args[0] && !opts.interactive) {
    console.log(chalk.yellow("\n  No API keys found. Let's set them up.\n"));
    await runConfigWizard();
    return;
  }

  const config = loadConfig();
  const clients = buildClients(config);
  const selections = buildSelections(clients);

  if (selections.length === 0) {
    console.error("No providers available. Add API keys to .env or ~/.aiwrapper/.env");
    process.exit(1);
  }

  // Interactive mode
  if (opts.interactive) {
    await interactiveMode(selections, config);
    return;
  }

  const prompt = program.args[0];
  if (!prompt) {
    program.help();
    return;
  }

  const results = await runPrompt(prompt, selections, config);

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
