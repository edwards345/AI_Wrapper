import Anthropic from "@anthropic-ai/sdk";
import type { ProviderResult } from "../providers/types.js";

function formatResponses(results: ProviderResult[]): string {
  return results
    .filter((r) => r.status === "success")
    .map((r) => `[${r.label.toUpperCase()}]:\n${r.content}`)
    .join("\n\n");
}

export async function combinedSummary(
  apiKey: string,
  prompt: string,
  results: ProviderResult[]
): Promise<string> {
  const successful = results.filter((r) => r.status === "success");
  if (successful.length === 0) return "No successful responses to summarize.";
  if (successful.length === 1) return successful[0].content;

  const client = new Anthropic({ apiKey });

  const message = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 2048,
    system: "You are summarizing multiple AI responses to the same prompt. Provide a comprehensive synthesis that captures the best insights from all responses. Be concise but thorough.",
    messages: [
      {
        role: "user",
        content: `The original prompt was: ${prompt}\n\nHere are ${successful.length} model responses:\n\n${formatResponses(successful)}\n\nProvide a comprehensive synthesis of all responses.`,
      },
    ],
  });

  return message.content
    .filter((block) => block.type === "text")
    .map((block) => block.text)
    .join("\n");
}

export async function consensusSummary(
  apiKey: string,
  prompt: string,
  results: ProviderResult[]
): Promise<string> {
  const successful = results.filter((r) => r.status === "success");
  if (successful.length === 0) return "No successful responses to analyze.";
  if (successful.length === 1) return successful[0].content;

  const client = new Anthropic({ apiKey });

  const message = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 2048,
    system: "You are analyzing multiple AI responses to identify consensus. Be structured and precise.",
    messages: [
      {
        role: "user",
        content: `The original prompt was: ${prompt}\n\nHere are ${successful.length} model responses:\n\n${formatResponses(successful)}\n\nIdentify:\n1. Points ALL models agreed on\n2. Points MOST (majority) agreed on\n3. Points that were unique to one model or controversial\n4. A final "consensus answer" based only on the agreed-upon points\n\nFormat your response with clear headers for each section.`,
      },
    ],
  });

  return message.content
    .filter((block) => block.type === "text")
    .map((block) => block.text)
    .join("\n");
}
