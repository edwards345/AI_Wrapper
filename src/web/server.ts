import express from "express";
import cors from "cors";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { loadConfig } from "../config/loader.js";
import { MODELS, findModel, type ProviderName } from "../engine/models.js";
import { runAll, type ModelSelection, type RunParams } from "../engine/runner.js";
import { combinedSummary, consensusSummary } from "../engine/summarizer.js";
import { createAnthropicClient } from "../providers/anthropic.js";
import { createOpenAIClient } from "../providers/openai.js";
import { createGeminiClient } from "../providers/gemini.js";
import { createXAIClient } from "../providers/xai.js";
import type { ProviderClient } from "../providers/types.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

const app = express();
app.use(cors());
app.use(express.json());

// Serve static frontend in production
app.use(express.static(join(__dirname, "client", "dist")));

const config = loadConfig();

function buildClients() {
  return {
    claude: config.anthropicApiKey ? createAnthropicClient(config.anthropicApiKey) : null,
    openai: config.openaiApiKey ? createOpenAIClient(config.openaiApiKey) : null,
    gemini: config.geminiApiKey ? createGeminiClient(config.geminiApiKey) : null,
    grok: config.xaiApiKey ? createXAIClient(config.xaiApiKey) : null,
  } as Record<ProviderName, ProviderClient | null>;
}

const clients = buildClients();

function getAvailableProviders(): ProviderName[] {
  return (Object.keys(clients) as ProviderName[]).filter((p) => clients[p] !== null);
}

// GET /api/models — return model registry and available providers
app.get("/api/models", (_req, res) => {
  res.json({
    models: MODELS,
    availableProviders: getAvailableProviders(),
  });
});

// POST /api/run — run prompt with SSE streaming
app.post("/api/run", (req, res) => {
  const { prompt, systemPrompt, models: modelIds, providers, preset, maxTokens, stream } = req.body;

  if (!prompt) {
    res.status(400).json({ error: "prompt is required" });
    return;
  }

  // Build selections
  const selections: (ModelSelection & { provider: ProviderName })[] = [];

  if (modelIds && Array.isArray(modelIds)) {
    for (const id of modelIds) {
      const found = findModel(id);
      if (!found) {
        res.status(400).json({ error: `Unknown model: ${id}` });
        return;
      }
      const client = clients[found.provider];
      if (!client) {
        res.status(400).json({ error: `No API key for ${found.provider}` });
        return;
      }
      selections.push({ client, model: found.model.id, label: found.model.label, provider: found.provider });
    }
  } else {
    const providerNames: ProviderName[] = providers && Array.isArray(providers)
      ? providers
      : getAvailableProviders();

    const tier = preset || "fast";

    for (const provider of providerNames) {
      const client2 = clients[provider];
      if (!client2) continue;
      const model = MODELS[provider].find((m) => m.tier === tier) ?? MODELS[provider][0];
      selections.push({ client: client2, model: model.id, label: model.label, provider });
    }
  }

  if (selections.length === 0) {
    res.status(400).json({ error: "No providers available" });
    return;
  }

  // SSE streaming mode
  if (stream !== false) {
    res.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    });

    const sendEvent = (event: string, data: unknown) => {
      res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
    };

    runAll(selections, {
      prompt,
      systemPrompt,
      maxTokens: maxTokens ?? 2048,
      stream: true,
      onStreamStart: (label, provider) => {
        sendEvent("stream-start", { label, provider });
      },
      onStreamToken: (label, token) => {
        sendEvent("stream-token", { label, token });
      },
      onStreamEnd: (result) => {
        sendEvent("stream-end", result);
      },
      onResult: (result) => {
        // For non-streaming results (errors, timeouts)
        sendEvent("result", result);
      },
    }).then((results) => {
      sendEvent("done", { results });
      res.end();
    }).catch((err) => {
      sendEvent("error", { error: err instanceof Error ? err.message : String(err) });
      res.end();
    });

    return;
  }

  // Non-streaming mode
  runAll(selections, {
    prompt,
    systemPrompt,
    maxTokens: maxTokens ?? 2048,
  }).then((results) => {
    res.json({ results });
  }).catch((err) => {
    res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
  });
});

// POST /api/summary — generate summary or consensus
app.post("/api/summary", async (req, res) => {
  const { prompt, results, mode } = req.body;

  if (!config.anthropicApiKey) {
    res.status(400).json({ error: "ANTHROPIC_API_KEY required for summaries" });
    return;
  }

  if (!results || !Array.isArray(results)) {
    res.status(400).json({ error: "results array is required" });
    return;
  }

  try {
    let content: string;
    if (mode === "consensus") {
      content = await consensusSummary(config.anthropicApiKey, prompt, results);
    } else {
      content = await combinedSummary(config.anthropicApiKey, prompt, results);
    }
    res.json({ content });
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
  }
});

// SPA fallback
app.get("/{*path}", (_req, res) => {
  res.sendFile(join(__dirname, "client", "dist", "index.html"));
});

const PORT = parseInt(process.env.PORT ?? "3456", 10);
app.listen(PORT, () => {
  console.log(`AI Wrapper server running at http://localhost:${PORT}`);
  console.log(`Providers: ${getAvailableProviders().join(", ") || "none"}`);
});
