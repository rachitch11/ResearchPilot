import { config } from "../config";
import {
  AiProviderError,
  type AiProvider,
  type GenerateTextInput,
  type GenerateTextResult,
} from "./ai";

interface GeminiResponse {
  candidates?: Array<{
    content?: {
      parts?: Array<{
        text?: unknown;
      }>;
    };
  }>;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function readText(response: unknown): string | undefined {
  if (!isRecord(response) || !Array.isArray(response.candidates)) {
    return undefined;
  }

  const parts = response.candidates[0];
  if (!isRecord(parts) || !isRecord(parts.content)) {
    return undefined;
  }

  if (!Array.isArray(parts.content.parts)) {
    return undefined;
  }

  const text = parts.content.parts
    .filter(isRecord)
    .map((part) => part.text)
    .filter((part): part is string => typeof part === "string")
    .join("");

  return text || undefined;
}

async function readProviderError(response: Response): Promise<string> {
  try {
    const body = (await response.json()) as unknown;
    if (isRecord(body) && isRecord(body.error)) {
      const message = body.error.message;
      if (typeof message === "string") {
        return message.replace(/\s+/g, " ").slice(0, 300);
      }
    }
  } catch {
    // Keep the provider error generic when the response is not JSON.
  }

  return response.statusText || "Unknown provider error";
}

export class GeminiProvider implements AiProvider {
  public readonly name = "gemini";
  public readonly model: string;

  public constructor(model = config.geminiModel) {
    this.model = model;
  }

  public async generateText(
    input: GenerateTextInput,
  ): Promise<GenerateTextResult> {
    const apiKey = process.env.GEMINI_API_KEY?.trim();
    if (!apiKey) {
      throw new AiProviderError(
        "The Gemini provider is not configured.",
        "not_configured",
      );
    }

    const controller = new AbortController();
    const timeout = setTimeout(
      () => controller.abort(),
      config.aiRequestTimeoutMs,
    );

    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(this.model)}:generateContent`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-goog-api-key": apiKey,
          },
          body: JSON.stringify({
            contents: [
              {
                role: "user",
                parts: [{ text: input.prompt }],
              },
            ],
            generationConfig: {
              maxOutputTokens: input.maxOutputTokens ?? 8192,
              ...(input.responseMimeType
                ? { responseMimeType: input.responseMimeType }
                : {}),
            },
          }),
          signal: controller.signal,
        },
      );

      if (!response.ok) {
        const providerMessage = await readProviderError(response);
        throw new AiProviderError(
          `Gemini returned HTTP ${response.status}: ${providerMessage}`,
          "request_failed",
        );
      }

      const body = (await response.json()) as GeminiResponse;
      const text = readText(body);
      if (!text) {
        throw new AiProviderError(
          "Gemini returned no text content.",
          "invalid_response",
        );
      }

      return {
        text,
        provider: this.name,
        model: this.model,
      };
    } catch (error) {
      if (error instanceof AiProviderError) {
        throw error;
      }

      const message =
        error instanceof Error && error.name === "AbortError"
          ? "Gemini request timed out."
          : "Gemini request could not be completed.";
      throw new AiProviderError(message, "request_failed");
    } finally {
      clearTimeout(timeout);
    }
  }
}

export function isGeminiConfigured(): boolean {
  return Boolean(process.env.GEMINI_API_KEY?.trim());
}