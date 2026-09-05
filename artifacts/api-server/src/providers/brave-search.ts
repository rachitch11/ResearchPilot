import { config } from "../config";
import {
  SearchProviderError,
  type SearchProvider,
  type SearchProviderResponse,
  type SearchRequest,
} from "./search";

interface BraveWebResult {
  title?: unknown;
  url?: unknown;
  description?: unknown;
  age?: unknown;
  page_age?: unknown;
  published_date?: unknown;
}

interface BraveResponse {
  web?: {
    results?: unknown;
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isBraveWebResult(value: unknown): value is BraveWebResult {
  return isRecord(value);
}

function readProviderMessage(body: unknown): string | undefined {
  if (!isRecord(body)) {
    return undefined;
  }

  for (const key of ["message", "error", "detail"]) {
    const value = body[key];
    if (typeof value === "string" && value.trim()) {
      return value.replace(/\s+/g, " ").trim().slice(0, 240);
    }
  }

  return undefined;
}

function normalizeResult(value: BraveWebResult): {
  title: string;
  url: string;
  snippet: string;
  publishedDate?: string;
} | undefined {
  if (typeof value.title !== "string" || typeof value.url !== "string") {
    return undefined;
  }

  let url: URL;
  try {
    url = new URL(value.url);
    if (url.protocol !== "http:" && url.protocol !== "https:") {
      return undefined;
    }
  } catch {
    return undefined;
  }

  const publishedDate = [value.published_date, value.page_age, value.age].find(
    (candidate): candidate is string =>
      typeof candidate === "string" && candidate.trim().length > 0,
  );

  return {
    title: value.title.trim().slice(0, 500),
    url: url.toString(),
    snippet:
      typeof value.description === "string"
        ? value.description.replace(/\s+/g, " ").trim().slice(0, 2000)
        : "",
    ...(publishedDate ? { publishedDate: publishedDate.trim().slice(0, 120) } : {}),
  };
}

export class BraveSearchProvider implements SearchProvider {
  public readonly name = "brave";

  public async search(
    input: SearchRequest,
  ): Promise<SearchProviderResponse> {
    const apiKey = process.env.SEARCH_API_KEY?.trim();
    if (!apiKey) {
      throw new SearchProviderError(
        "The Brave Search provider is not configured.",
        "not_configured",
      );
    }

    const controller = new AbortController();
    const timeout = setTimeout(
      () => controller.abort(),
      config.searchRequestTimeoutMs,
    );

    try {
      const url = new URL("https://api.search.brave.com/res/v1/web/search");
      url.searchParams.set("q", input.query);
      url.searchParams.set("count", String(input.count));

      const response = await fetch(url, {
        headers: {
          Accept: "application/json",
          "X-Subscription-Token": apiKey,
        },
        signal: controller.signal,
      });

      const body = (await response.json().catch(() => undefined)) as unknown;
      if (!response.ok) {
        const providerMessage =
          readProviderMessage(body) ?? response.statusText ?? "Unknown provider error";
        throw new SearchProviderError(
          `Brave Search returned HTTP ${response.status}: ${providerMessage}`,
          "request_failed",
        );
      }

      if (!isRecord(body) || !isRecord(body.web) || !Array.isArray(body.web.results)) {
        throw new SearchProviderError(
          "Brave Search returned an invalid response.",
          "invalid_response",
        );
      }

      const results = body.web.results
        .filter(isBraveWebResult)
        .map(normalizeResult)
        .filter(
          (
            result,
          ): result is NonNullable<ReturnType<typeof normalizeResult>> =>
            result !== undefined,
        );

      return {
        provider: this.name,
        query: input.query,
        results,
      };
    } catch (error) {
      if (error instanceof SearchProviderError) {
        throw error;
      }

      throw new SearchProviderError(
        error instanceof Error && error.name === "AbortError"
          ? "Brave Search request timed out."
          : "Brave Search request could not be completed.",
        "request_failed",
      );
    } finally {
      clearTimeout(timeout);
    }
  }
}

export function isSearchConfigured(): boolean {
  return Boolean(process.env.SEARCH_API_KEY?.trim());
}