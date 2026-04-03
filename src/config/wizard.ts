import { createInterface } from "node:readline/promises";
import { mkdirSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { homedir } from "node:os";
import chalk from "chalk";

const CONFIG_DIR = join(homedir(), ".aiwrapper");
const ENV_FILE = join(CONFIG_DIR, ".env");

interface KeyEntry {
  envVar: string;
  label: string;
  url: string;
}

const KEYS: KeyEntry[] = [
  { envVar: "ANTHROPIC_API_KEY", label: "Anthropic (Claude)", url: "https://console.anthropic.com" },
  { envVar: "OPENAI_API_KEY", label: "OpenAI (GPT)", url: "https://platform.openai.com" },
  { envVar: "GEMINI_API_KEY", label: "Google (Gemini)", url: "https://aistudio.google.com/app/apikey" },
  { envVar: "XAI_API_KEY", label: "xAI (Grok)", url: "https://console.x.ai" },
];

export async function runConfigWizard(): Promise<void> {
  const rl = createInterface({ input: process.stdin, output: process.stdout });

  console.log(chalk.cyan.bold("\n  AI Wrapper — Configuration\n"));
  console.log(chalk.dim("  Enter your API keys below. Press Enter to skip any provider.\n"));

  const entries: string[] = [];

  for (const key of KEYS) {
    const prompt = chalk.white(`  ${key.label}`) + chalk.dim(` (${key.url})\n`) + chalk.cyan("  Key: ");
    const value = await rl.question(prompt);

    if (value.trim()) {
      entries.push(`${key.envVar}=${value.trim()}`);
      console.log(chalk.green("  Saved.\n"));
    } else {
      console.log(chalk.dim("  Skipped.\n"));
    }
  }

  rl.close();

  if (entries.length === 0) {
    console.log(chalk.yellow("  No keys entered. Run aiwrapper --config to try again.\n"));
    return;
  }

  // Write to ~/.aiwrapper/.env
  mkdirSync(CONFIG_DIR, { recursive: true });
  writeFileSync(ENV_FILE, entries.join("\n") + "\n", "utf-8");

  console.log(chalk.green.bold(`  Saved ${entries.length} key(s) to ${ENV_FILE}\n`));
}

export function needsSetup(): boolean {
  return !existsSync(ENV_FILE);
}
