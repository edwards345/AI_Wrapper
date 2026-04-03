import chalk from "chalk";
import ora, { type Ora } from "ora";
import type { ProviderResult } from "../providers/types.js";
import type { ProviderName, ModelDef } from "../engine/models.js";
import { MODELS } from "../engine/models.js";

const PROVIDER_COLORS: Record<ProviderName, typeof chalk> = {
  claude: chalk.magenta,
  openai: chalk.green,
  gemini: chalk.blue,
  grok: chalk.yellow,
};

const PROVIDER_LABELS: Record<ProviderName, string> = {
  claude: "Claude",
  openai: "OpenAI",
  gemini: "Gemini",
  grok: "Grok",
};

export interface ProgressSpinner {
  spinner: Ora;
  pending: Set<string>;
}

export function createProgressSpinner(labels: string[]): ProgressSpinner {
  const pending = new Set(labels);
  const spinner = ora({
    text: formatPending(pending),
  }).start();
  return { spinner, pending };
}

export function pauseSpinner(progress: ProgressSpinner): void {
  if (progress.spinner.isSpinning) {
    progress.spinner.stop();
  }
}

export function resumeSpinner(progress: ProgressSpinner): void {
  if (progress.pending.size > 0 && !progress.spinner.isSpinning) {
    progress.spinner.text = formatPending(progress.pending);
    progress.spinner.start();
  }
}

export function markDoneAndPrint(progress: ProgressSpinner, result: ProviderResult): void {
  progress.pending.delete(result.label);
  progress.spinner.stop();
  printResult(result);

  if (progress.pending.size > 0) {
    progress.spinner.text = formatPending(progress.pending);
    progress.spinner.start();
  }
}

export function markPending(progress: ProgressSpinner, label: string): void {
  progress.pending.delete(label);
  if (progress.pending.size > 0) {
    progress.spinner.text = formatPending(progress.pending);
  } else {
    progress.spinner.stop();
  }
}

export function stopProgress(progress: ProgressSpinner): void {
  if (progress.spinner.isSpinning) {
    progress.spinner.stop();
  }
}

function formatPending(pending: Set<string>): string {
  return chalk.dim(`Waiting for: ${[...pending].join(", ")}`);
}

// --- Streaming display ---

export function printStreamHeader(label: string, model: string, provider: ProviderName): void {
  const color = PROVIDER_COLORS[provider];
  const divider = color("─".repeat(60));
  console.log(divider);
  console.log(color(`  ${label}`) + chalk.dim(` (${model})`));
  console.log(divider);
  console.log("");
}

export function writeStreamToken(token: string): void {
  process.stdout.write(token);
}

export function printStreamFooter(r: ProviderResult): void {
  // Newline after streamed content
  console.log("\n");
  console.log(
    chalk.dim(`  ${formatLatency(r.latencyMs)}`) +
    (r.inputTokens !== undefined
      ? chalk.dim(` · ${r.inputTokens} in / ${r.outputTokens ?? "?"} out`)
      : "")
  );
  console.log("");
}

// --- Non-streaming display ---

export function printResult(r: ProviderResult): void {
  const color = PROVIDER_COLORS[r.provider];
  const divider = color("─".repeat(60));

  console.log(divider);
  console.log(
    color(`  ${r.label}`) +
      chalk.dim(` (${r.model})`) +
      chalk.dim(` — `) +
      formatLatency(r.latencyMs)
  );
  console.log(divider);

  if (r.status === "success") {
    if (r.inputTokens !== undefined || r.outputTokens !== undefined) {
      console.log(
        chalk.dim(`  Tokens: ${r.inputTokens ?? "?"} in / ${r.outputTokens ?? "?"} out`)
      );
    }
    console.log("");
    console.log(indent(r.content));
  } else if (r.status === "timeout") {
    console.log(chalk.red(`  Timed out after ${r.latencyMs}ms`));
  } else {
    console.log(chalk.red(`  Error: ${r.error}`));
  }

  console.log("");
}

export function printModelList(): void {
  for (const [provider, models] of Object.entries(MODELS)) {
    const color = PROVIDER_COLORS[provider as ProviderName];
    const label = PROVIDER_LABELS[provider as ProviderName];

    console.log(color(`\n  ${label}`));
    console.log(color(`  ${"─".repeat(40)}`));

    for (const m of models as readonly ModelDef[]) {
      console.log(
        `    ${chalk.white(m.id.padEnd(35))} ${chalk.dim(m.tier)}`
      );
    }
  }
  console.log("");
}

export function printSummary(label: string, content: string): void {
  const divider = chalk.cyan("═".repeat(60));
  console.log(divider);
  console.log(chalk.cyan.bold(`  ${label}`));
  console.log(divider);
  console.log("");
  console.log(indent(content));
  console.log("");
}

export function resultsToMarkdown(prompt: string, results: ProviderResult[]): string {
  const lines: string[] = [];
  lines.push(`# AI Wrapper Results`);
  lines.push(`\n**Prompt:** ${prompt}\n`);
  lines.push(`**Date:** ${new Date().toISOString()}\n`);
  lines.push(`---\n`);

  for (const r of results) {
    lines.push(`## ${r.label} (${r.model})`);
    lines.push(`- **Status:** ${r.status}`);
    lines.push(`- **Latency:** ${r.latencyMs}ms`);
    if (r.inputTokens !== undefined) {
      lines.push(`- **Tokens:** ${r.inputTokens} in / ${r.outputTokens ?? "?"} out`);
    }
    lines.push("");
    if (r.status === "success") {
      lines.push(r.content);
    } else {
      lines.push(`> Error: ${r.error}`);
    }
    lines.push("\n---\n");
  }

  return lines.join("\n");
}

function formatLatency(ms: number): string {
  if (ms < 1000) return chalk.green(`${ms}ms`);
  if (ms < 5000) return chalk.yellow(`${(ms / 1000).toFixed(1)}s`);
  return chalk.red(`${(ms / 1000).toFixed(1)}s`);
}

function indent(text: string, spaces = 2): string {
  const pad = " ".repeat(spaces);
  return text
    .split("\n")
    .map((line) => pad + line)
    .join("\n");
}
