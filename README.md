# AI Wrapper

Multi-LLM prompt runner with consensus synthesis. Send one prompt to Claude, ChatGPT, Gemini, and Grok simultaneously, compare responses side-by-side, and optionally generate a combined summary or consensus analysis.

## Features

- **4 providers** — Anthropic (Claude), OpenAI (GPT), Google (Gemini), xAI (Grok)
- **24 models** — from budget/fast to flagship, including reasoning models
- **Parallel execution** — all providers run simultaneously via `Promise.allSettled`
- **Color-coded output** — purple (Claude), green (OpenAI), blue (Gemini), yellow (Grok)
- **Presets** — `flagship`, `balanced`, or `fast` to auto-select models per provider
- **Markdown export** — save results to a file with `--output`
- **Graceful failures** — one provider error never blocks the others

## Requirements

- Node.js 20+
- API keys for one or more providers

## Installation

```bash
git clone https://github.com/edwards345/AI_Wrapper.git
cd AI_Wrapper
npm install
```

## API Key Setup

Create a `.env` file in the project root (or at `~/.aiwrapper/.env`):

```
ANTHROPIC_API_KEY=sk-ant-...
OPENAI_API_KEY=sk-proj-...
GEMINI_API_KEY=AI...
XAI_API_KEY=xai-...
```

You only need keys for the providers you want to use. Get them from:
- **Claude:** https://console.anthropic.com
- **OpenAI:** https://platform.openai.com
- **Gemini:** https://aistudio.google.com/app/apikey
- **Grok/xAI:** https://console.x.ai

## Usage

```bash
# Run with all configured providers (flagship models by default)
npx tsx src/cli/index.ts "What is the best way to learn guitar?"

# Pick specific providers
npx tsx src/cli/index.ts --providers claude,openai "Explain quantum entanglement"

# Pick exact models
npx tsx src/cli/index.ts --models claude-sonnet-4-6,gpt-5.4-nano "Your prompt"

# Use fast/cheap models
npx tsx src/cli/index.ts --preset fast "Quick question: what year was Python created?"

# Add a system prompt
npx tsx src/cli/index.ts --system "You are a senior software engineer" "Review this approach..."

# Save results to markdown
npx tsx src/cli/index.ts --output results.md "Compare monoliths vs microservices"

# Set a custom timeout (default 30s)
npx tsx src/cli/index.ts --timeout 15000 "Explain recursion"

# List all available models
npx tsx src/cli/index.ts --list-models
```

### Build and run globally

```bash
npm run build
npm link
aiwrapper "Your prompt here"
```

## Available Models

| Provider | Model | Tier |
|----------|-------|------|
| Claude | claude-opus-4-6 | flagship |
| Claude | claude-sonnet-4-6 | balanced |
| Claude | claude-haiku-4-5 | fast |
| OpenAI | gpt-5.4 | flagship |
| OpenAI | gpt-5.4-mini | balanced |
| OpenAI | gpt-5.4-nano | fast |
| OpenAI | gpt-4.1 | coding |
| OpenAI | gpt-4.1-mini | fast |
| OpenAI | gpt-4o | legacy |
| OpenAI | o3 / o3-pro / o4-mini | reasoning |
| Gemini | gemini-3.1-pro-preview | flagship |
| Gemini | gemini-3-flash-preview | balanced |
| Gemini | gemini-2.5-pro | stable |
| Gemini | gemini-2.5-flash | stable |
| Grok | grok-4 | flagship |
| Grok | grok-4-fast | balanced |
| Grok | grok-3-mini | fast |
| Grok | grok-code-fast-1 | coding |

Run `--list-models` for the full list.

## Project Structure

```
src/
├── cli/
│   ├── index.ts          # CLI entry point (commander)
│   └── display.ts        # Color-coded terminal rendering
├── providers/
│   ├── types.ts          # Shared interfaces
│   ├── anthropic.ts      # Claude API client
│   ├── openai.ts         # ChatGPT API client
│   ├── gemini.ts         # Gemini API client
│   └── xai.ts            # Grok API client
├── engine/
│   ├── runner.ts         # Parallel Promise.allSettled runner
│   └── models.ts         # Model registry
├── config/
│   ├── loader.ts         # .env + config.json loading
│   └── schema.ts         # Zod config validation
└── test/
    ├── anthropic.test.ts # Single-provider test
    └── runner.test.ts    # Multi-provider test
```

## Roadmap

- [x] Sprint 1 — Core foundation (providers, runner, config)
- [x] Sprint 2 — CLI & display (commander, chalk, markdown export)
- [ ] Sprint 3 — Intelligence layer (summarizer, consensus, interactive mode)
- [ ] Sprint 4 — Polish (streaming, config wizard, presets)
- [ ] Sprint 5 — Web app (Express + React + Tailwind)

## License

MIT
