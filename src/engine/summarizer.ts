import Anthropic from "@anthropic-ai/sdk";
import type { ProviderResult } from "../providers/types.js";

function formatResponses(results: ProviderResult[]): string {
  return results
    .filter((r) => r.status === "success")
    .map((r) => `[${r.label.toUpperCase()}]:\n${r.content}`)
    .join("\n\n");
}

export async function generateSummary(
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
    max_tokens: 4096,
    system: `You are synthesizing responses from multiple AI models into a single, authoritative summary.

Your summary should follow these principles:
- Give the MOST weight and prominence to points that multiple AIs agreed on. These represent the strongest, most reliable information. Lead with these.
- Give LESS weight to points mentioned by only one or two AIs. Include them briefly but don't emphasize them.
- When AIs DISAGREE on something, explicitly flag it with a note like "⚠️ Note: The AI models disagreed on this point..." and briefly present both sides so the reader knows to be careful.
- Be comprehensive but concise. Don't repeat yourself.
- Write in a natural, readable style — not as a meta-analysis of "Model A said X, Model B said Y." Instead, present the synthesized answer as if you're the definitive source, with disagreements noted inline.
- Use markdown formatting (headers, bullets, bold) for readability.`,
    messages: [
      {
        role: "user",
        content: `The original prompt was: ${prompt}\n\nHere are ${successful.length} AI model responses:\n\n${formatResponses(successful)}\n\nProvide a weighted summary following the principles above.`,
      },
    ],
  });

  return message.content
    .filter((block) => block.type === "text")
    .map((block) => block.text)
    .join("\n");
}

// Keep old exports for backward compatibility
export const combinedSummary = generateSummary;
export const consensusSummary = generateSummary;
