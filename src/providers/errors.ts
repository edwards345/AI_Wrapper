export function friendlyError(err: unknown): string {
  const msg = err instanceof Error ? err.message : String(err);

  // Rate limits
  if (msg.includes("429") || msg.toLowerCase().includes("rate limit") || msg.toLowerCase().includes("quota")) {
    return "Rate limit or quota exceeded. Check your plan and billing.";
  }

  // Auth errors
  if (msg.includes("401") || msg.includes("403") || msg.toLowerCase().includes("api key") || msg.toLowerCase().includes("unauthorized")) {
    return "Authentication failed. Check your API key.";
  }

  // Network errors
  if (msg.includes("ECONNREFUSED") || msg.includes("ENOTFOUND") || msg.includes("fetch failed")) {
    return "Network error. Check your internet connection.";
  }

  // Timeout (already handled by runner, but just in case)
  if (msg.toLowerCase().includes("timeout") || msg.includes("ETIMEDOUT")) {
    return "Request timed out.";
  }

  // Model not found
  if (msg.includes("404") || msg.toLowerCase().includes("not found") || msg.toLowerCase().includes("does not exist")) {
    return "Model not found. It may have been deprecated or renamed.";
  }

  // Credits depleted
  if (msg.toLowerCase().includes("credits") || msg.toLowerCase().includes("depleted") || msg.toLowerCase().includes("billing")) {
    return "Credits depleted. Add funds to your account.";
  }

  // Truncate very long error messages
  if (msg.length > 200) {
    return msg.slice(0, 200) + "...";
  }

  return msg;
}
