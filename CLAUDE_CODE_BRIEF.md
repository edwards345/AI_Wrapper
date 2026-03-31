# AI Wrapper — Claude Code Project Brief
> Multi-LLM prompt runner with consensus synthesis
> Target: Ubuntu 24.04 (Early 2013 MacBook Pro) → Web app

---

## Project Overview

Build "AI Wrapper" — a tool that sends a single prompt to any combination of Claude, ChatGPT, Gemini, and Grok simultaneously, displays each response in parallel, and optionally generates:
- A **combined summary** of all responses
- A **consensus/voted summary** — synthesized from the points all models agreed upon

**Phase 1:** CLI application (Node.js + TypeScript)
**Phase 2:** Web app (React + Express backend — same core logic, new shell)

---

## Tech Stack

### Phase 1 — CLI
- **Runtime:** Node.js 20+
- **Language:** TypeScript
- **CLI framework:** `commander` for argument parsing
- **Terminal UI:** `ink` (React for CLIs) OR `blessed` for pane layout
- **Spinner/loading:** `ora`
- **Color output:** `chalk`
- **Config/env:** `dotenv` + a local `~/.aiwrapper/config.json`
- **HTTP:** Native `fetch` (Node 18+)

### Phase 2 — Web App (add later, same backend)
- **Frontend:** React + Vite
- **Backend:** Express.js (wrap the same API client code)
- **Styling:** Tailwind CSS
- **Deploy target:** localhost initially, then any VPS

---

## Project Structure

```
ai-wrapper/
├── src/
│   ├── cli/
│   │   ├── index.ts          # CLI entry point (commander setup)
│   │   └── display.ts        # Terminal rendering (ink or chalk panels)
│   ├── providers/
│   │   ├── types.ts          # Shared interfaces (ModelConfig, Response, etc.)
│   │   ├── anthropic.ts      # Claude API client
│   │   ├── openai.ts         # ChatGPT API client
│   │   ├── gemini.ts         # Gemini API client
│   │   └── xai.ts            # Grok API client
│   ├── engine/
│   │   ├── runner.ts         # Promise.allSettled parallel runner
│   │   ├── summarizer.ts     # Summary + consensus logic (calls Claude)
│   │   └── models.ts         # Central model registry (all current models)
│   ├── config/
│   │   ├── loader.ts         # Load ~/.aiwrapper/config.json + .env
│   │   └── schema.ts         # Zod schema for config validation
│   └── web/                  # Phase 2 (scaffold now, build later)
│       ├── server.ts         # Express API server
│       └── client/           # React frontend (Vite project)
├── .env.example
├── package.json
├── tsconfig.json
└── README.md
```

---

## Provider Configuration

### API Keys (store in `~/.aiwrapper/.env` or `~/.aiwrapper/config.json`)
```
ANTHROPIC_API_KEY=
OPENAI_API_KEY=
GEMINI_API_KEY=
XAI_API_KEY=
```

### Model Registry — `src/engine/models.ts`

Keep this file as the single source of truth. Update it as new models release.

```typescript
export const MODELS = {
  claude: [
    { id: "claude-opus-4-6",    label: "Claude Opus 4.6",       tier: "flagship" },
    { id: "claude-sonnet-4-6",  label: "Claude Sonnet 4.6",     tier: "balanced" },
    { id: "claude-haiku-4-5",   label: "Claude Haiku 4.5",      tier: "fast"     },
  ],
  openai: [
    { id: "gpt-5.4",            label: "GPT-5.4",               tier: "flagship" },
    { id: "gpt-5.4-mini",       label: "GPT-5.4 Mini",          tier: "balanced" },
    { id: "gpt-5.4-nano",       label: "GPT-5.4 Nano",          tier: "fast"     },
    { id: "gpt-4.1",            label: "GPT-4.1",               tier: "coding"   },
    { id: "gpt-4.1-mini",       label: "GPT-4.1 Mini",          tier: "fast"     },
    { id: "gpt-4o",             label: "GPT-4o",                tier: "legacy"   },
    { id: "o3",                 label: "o3 (Reasoning)",        tier: "reasoning"},
    { id: "o3-pro",             label: "o3 Pro (Reasoning)",    tier: "reasoning"},
    { id: "o4-mini",            label: "o4-mini (Reasoning)",   tier: "reasoning"},
  ],
  gemini: [
    { id: "gemini-3.1-pro-preview",        label: "Gemini 3.1 Pro Preview",    tier: "flagship"  },
    { id: "gemini-3.1-flash-lite-preview", label: "Gemini 3.1 Flash-Lite",     tier: "fast"      },
    { id: "gemini-3-flash-preview",        label: "Gemini 3 Flash Preview",    tier: "balanced"  },
    { id: "gemini-2.5-pro",                label: "Gemini 2.5 Pro",            tier: "stable"    },
    { id: "gemini-2.5-flash",              label: "Gemini 2.5 Flash",          tier: "stable"    },
    { id: "gemini-2.5-flash-lite",         label: "Gemini 2.5 Flash-Lite",     tier: "budget"    },
  ],
  grok: [
    { id: "grok-4",             label: "Grok 4",                tier: "flagship" },
    { id: "grok-4-heavy",       label: "Grok 4 Heavy",          tier: "max"      },
    { id: "grok-4-fast",        label: "Grok 4 Fast",           tier: "balanced" },
    { id: "grok-3",             label: "Grok 3",                tier: "stable"   },
    { id: "grok-3-mini",        label: "Grok 3 Mini",           tier: "fast"     },
    { id: "grok-code-fast-1",   label: "Grok Code Fast",        tier: "coding"   },
  ],
} as const;
```

> **Note:** Model lists move fast. The `grok-4.1` series and `gpt-5.4` reflect the state of the APIs as of late March 2026. Add a `--list-models` flag that can optionally fetch live model lists from each provider's `/models` endpoint.

---

## Core Features

### 1. Prompt Runner (`engine/runner.ts`)
- Accept: prompt string, array of selected models, optional system prompt
- Fan out: `Promise.allSettled()` — never let one provider failure block others
- Each call: track start time, end time, token counts (if available), error state
- Return: `ProviderResult[]` with status, content, latency, model info

```typescript
interface ProviderResult {
  provider: "claude" | "openai" | "gemini" | "grok";
  model: string;
  label: string;
  status: "success" | "error" | "timeout";
  content: string;
  latencyMs: number;
  inputTokens?: number;
  outputTokens?: number;
  error?: string;
}
```

### 2. Summarizer (`engine/summarizer.ts`)
Two modes, both powered by a single Claude call:

**Mode A — Combined Summary:**
```
System: You are summarizing multiple AI responses to the same prompt.
User: The original prompt was: {prompt}

Here are {N} model responses:
[CLAUDE SONNET 4.6]: {content}
[GPT-5.4]: {content}
...

Provide a comprehensive synthesis of all responses.
```

**Mode B — Consensus / "Most Voted" Summary:**
```
System: You are analyzing multiple AI responses to identify consensus.
User: The original prompt was: {prompt}

Here are {N} model responses:
...

Identify:
1. Points ALL models agreed on
2. Points MOST (majority) agreed on
3. Points that were unique to one model or controversial
4. A final "consensus answer" based only on the agreed-upon points.
Format as structured JSON.
```
Parse the JSON and render it in a readable format.

### 3. Display (`cli/display.ts`)
- Show a live spinner per provider while waiting
- When each response arrives, print it in a labeled panel/block
- Color-code by provider (e.g., purple=Claude, green=OpenAI, blue=Gemini, orange=Grok)
- Show latency next to each response header
- After all responses: optionally show summary/consensus block

### 4. Configuration (`config/`)
On first run, prompt for API keys and save to `~/.aiwrapper/config.json`.
Support a `--config` flag to re-run setup.

**Default model presets:**
- `--preset fast` — use cheapest/fastest model per provider
- `--preset flagship` — use best model per provider
- `--preset all` — use all models from selected providers

---

## CLI Interface Design

```bash
# Basic: run all providers with their default (flagship) model
aiwrapper "What is the best way to learn guitar?"

# Specify providers
aiwrapper --providers claude,openai,gemini "Explain quantum entanglement"

# Specify exact models
aiwrapper --models claude-sonnet-4-6,gpt-5.4,gemini-2.5-flash "Your prompt"

# With summary
aiwrapper --summarize "Compare monoliths vs microservices"

# With consensus mode
aiwrapper --consensus "What causes inflation?"

# Both
aiwrapper --summarize --consensus "Best practices for REST APIs"

# Interactive mode (prompts you for input in a loop)
aiwrapper --interactive

# List all available models
aiwrapper --list-models

# System prompt
aiwrapper --system "You are a senior software engineer" "Review this code..."

# Save output to file
aiwrapper --output results.md "Explain neural networks"

# Preset
aiwrapper --preset fast "Quick question: what year was Python created?"
```

---

## Implementation Order

### Sprint 1 — Core Foundation
1. `npm init`, TypeScript config, `package.json` scripts
2. `.env` loading and config file schema
3. `models.ts` registry
4. Individual provider clients (one at a time, test each):
   - `anthropic.ts` using `@anthropic-ai/sdk`
   - `openai.ts` using `openai` npm package
   - `gemini.ts` using `@google/generative-ai`
   - `xai.ts` using OpenAI-compatible client pointed at `https://api.x.ai/v1`
5. `runner.ts` — parallel Promise.allSettled

### Sprint 2 — CLI & Display
6. `commander` CLI setup
7. `display.ts` — chalk-based output with color coding and latency display
8. `--list-models` flag
9. `--output` flag (save to markdown file)

### Sprint 3 — Intelligence Layer
10. `summarizer.ts` — combined summary mode
11. `summarizer.ts` — consensus/voting mode
12. Interactive mode (`--interactive`)

### Sprint 4 — Polish
13. `--preset` system
14. Streaming responses (show tokens as they arrive — nice for large models)
15. Config wizard on first run
16. Error handling and timeout logic (30s default per provider)

### Sprint 5 — Web App (Phase 2)
17. Express server wrapping runner + summarizer
18. REST endpoints: `POST /run`, `POST /summarize`, `GET /models`
19. React + Vite frontend (Tailwind, side-by-side card layout)
20. SSE (Server-Sent Events) for real-time streaming in the browser
21. Model selector checkboxes, summary toggles, response history

---

## Key Implementation Notes

### xAI (Grok) is OpenAI-Compatible
Grok uses an OpenAI-compatible API. Use the OpenAI SDK with a custom base URL:
```typescript
import OpenAI from "openai";
const grok = new OpenAI({
  apiKey: process.env.XAI_API_KEY,
  baseURL: "https://api.x.ai/v1",
});
```

### Streaming Strategy
For Phase 1, use non-streaming (simpler). For Phase 2 (web), implement streaming:
- Claude: `stream: true` in SDK
- OpenAI: `stream: true`
- Gemini: `generateContentStream()`
- Grok: same as OpenAI streaming

### Consensus Algorithm
Don't try to do embeddings or cosine similarity — it's overkill. The meta-prompt approach (described above) works great and is accurate. Pass all responses back to Claude Sonnet 4.6 and have it do the analysis. This is cheap and fast.

### Error Resilience
- Each provider call wrapped in try/catch
- 30-second timeout per provider using `Promise.race` + `AbortController`
- If a provider errors, show its error in the panel but continue with others
- Always attempt summary even if some providers failed

### Performance on Old Hardware
The 2013 MacBook Pro with Ubuntu will handle this fine — the bottleneck is always network I/O to the APIs, not local CPU. Node.js async is perfectly suited to this.

---

## Packages to Install

```bash
npm install \
  @anthropic-ai/sdk \
  openai \
  @google/generative-ai \
  commander \
  chalk \
  ora \
  dotenv \
  zod

npm install -D \
  typescript \
  @types/node \
  ts-node \
  tsx \
  nodemon
```

---

## `package.json` Scripts

```json
{
  "scripts": {
    "dev": "tsx watch src/cli/index.ts",
    "build": "tsc",
    "start": "node dist/cli/index.js",
    "lint": "tsc --noEmit"
  },
  "bin": {
    "aiwrapper": "./dist/cli/index.js"
  }
}
```

After `npm run build` and `npm link`, you can run `aiwrapper` globally from anywhere on the machine.

---

## Web App Phase 2 — High Level Plan

When you're ready to move to the browser:

**Backend (Express):**
```
POST /api/run      → runs prompt, returns ProviderResult[]
POST /api/summary  → takes ProviderResult[], returns summary
GET  /api/models   → returns MODELS registry
```

**Frontend (React + Tailwind):**
- Model selector sidebar (checkboxes grouped by provider, with tier labels)
- Prompt input + system prompt toggle
- Response cards (2-up or 4-up grid, expandable)
- Summary/Consensus tab at the bottom
- History panel (last N sessions stored in localStorage)
- Export button (downloads markdown with all responses)

---

## First Command for Claude Code

Once you're ready to start, open Claude Code in your project folder and begin with:

```
Initialize a new TypeScript Node.js project for "AI Wrapper" — a multi-LLM prompt tool.
Follow the structure in CLAUDE_CODE_BRIEF.md exactly.
Start with Sprint 1: set up tsconfig, package.json, dotenv config loading, 
the models registry, and then implement the Anthropic provider client first 
(anthropic.ts) with a simple test that calls Claude Sonnet 4.6.
```

---

## Notes on API Key Access

You'll need accounts and API keys for each:
- **Claude:** https://console.anthropic.com
- **OpenAI:** https://platform.openai.com
- **Gemini:** https://aistudio.google.com/app/apikey  (free tier available)
- **Grok/xAI:** https://console.x.ai

All four offer pay-as-you-go. For light testing, the combined cost of running 4 models on a few test prompts is a few cents.
