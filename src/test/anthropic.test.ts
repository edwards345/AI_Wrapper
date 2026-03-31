import { loadConfig } from "../config/loader.js";
import { createAnthropicClient } from "../providers/anthropic.js";

async function main() {
  const config = loadConfig();

  if (!config.anthropicApiKey) {
    console.error("ANTHROPIC_API_KEY not set. Add it to .env or ~/.aiwrapper/.env");
    process.exit(1);
  }

  const client = createAnthropicClient(config.anthropicApiKey);

  console.log("Testing Anthropic provider with Claude Sonnet 4.6...\n");

  const result = await client.chat({
    model: "claude-sonnet-4-6",
    label: "Claude Sonnet 4.6",
    prompt: "In one sentence, what is the meaning of life?",
    maxTokens: 256,
  });

  if (result.status === "success") {
    console.log(`Status:   ${result.status}`);
    console.log(`Model:    ${result.model}`);
    console.log(`Latency:  ${result.latencyMs}ms`);
    console.log(`Tokens:   ${result.inputTokens} in / ${result.outputTokens} out`);
    console.log(`\nResponse:\n${result.content}`);
  } else {
    console.error(`Error: ${result.error}`);
    process.exit(1);
  }
}

main();
