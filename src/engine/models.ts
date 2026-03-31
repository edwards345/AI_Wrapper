export type ProviderName = "claude" | "openai" | "gemini" | "grok";

export interface ModelDef {
  id: string;
  label: string;
  tier: string;
}

export const MODELS: Record<ProviderName, ModelDef[]> = {
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

export function getModelsByTier(provider: ProviderName, tier: string): ModelDef[] {
  return MODELS[provider].filter((m) => m.tier === tier);
}

export function findModel(modelId: string): { provider: ProviderName; model: ModelDef } | undefined {
  for (const [provider, models] of Object.entries(MODELS)) {
    const model = models.find((m) => m.id === modelId);
    if (model) return { provider: provider as ProviderName, model };
  }
  return undefined;
}
