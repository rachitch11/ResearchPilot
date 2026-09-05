import { config } from "../config";
import { AiProviderError, type AiProvider } from "./ai";
import { GeminiProvider, isGeminiConfigured } from "./gemini";

export { AiProviderError } from "./ai";

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