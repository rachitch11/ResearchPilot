import { config } from "../config";
import { AiProviderError, type AiProvider } from "./ai";
import { GeminiProvider, isGeminiConfigured } from "./gemini";
import { BraveSearchProvider, isSearchConfigured } from "./brave-search";
import { SearchProviderError, type SearchProvider } from "./search";

export { AiProviderError } from "./ai";
export { SearchProviderError } from "./search";
export type { SearchProvider } from "./search";

export function getAiProvider(): AiProvider {
  if (config.aiProvider !== "gemini") {
    throw new AiProviderError(
      `Unsupported AI provider "${config.aiProvider}".`,
      "request_failed",
    );
  }

  if (!isGeminiConfigured()) {
    throw new AiProviderError(
      "The Gemini provider is not configured.",
      "not_configured",
    );
  }

  return new GeminiProvider();
}

export function getAiProviderStatus(): {
  provider: string;
  model: string;
  configured: boolean;
} {
  return {
    provider: config.aiProvider,
    model: config.geminiModel,
    configured: config.aiProvider === "gemini" && isGeminiConfigured(),
  };
}

export function getSearchProvider(): SearchProvider {
  if (config.searchProvider !== "brave") {
    throw new SearchProviderError(
      `Unsupported search provider "${config.searchProvider}".`,
      "request_failed",
    );
  }

  if (!isSearchConfigured()) {
    throw new SearchProviderError(
      "The Brave Search provider is not configured.",
      "not_configured",
    );
  }

  return new BraveSearchProvider();
}

export function getSearchProviderStatus(): {
  provider: string;
  configured: boolean;
} {
  return {
    provider: config.searchProvider,
    configured: config.searchProvider === "brave" && isSearchConfigured(),
  };
}