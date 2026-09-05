import { config } from "../config";
import { getSearchProvider, type SearchProvider } from "../providers";
import type {
  SearchProviderResult,
  SearchProviderResponse,
} from "../providers/search";

export interface SearchIntent {
  query: string;
  purpose?: string;
}

export interface NormalizedSearchResult extends SearchProviderResult {
  domain: string;
  sourceQuery: string;
  purpose?: string;
}

export interface SearchServiceResponse {
  provider: string;
  queries: SearchIntent[];
  results: NormalizedSearchResult[];
  totalResults: number;
  deduplicatedResults: number;
}

export class SearchServiceError extends Error {
  public constructor(message: string) {
    super(message);
    this.name = "SearchServiceError";
  }
}

function normalizeUrl(value: string): string {
  const url = new URL(value);
  url.hash = "";
  return url.toString().replace(/\/$/, "");
}

function getDomain(value: string): string {
  return new URL(value).hostname.replace(/^www\./, "");
}

function deduplicateResults(
  responses: SearchProviderResponse[],
  intents: SearchIntent[],
): NormalizedSearchResult[] {
  const seenUrls = new Set<string>();
  const results: NormalizedSearchResult[] = [];

  for (const response of responses) {
    const intent = intents.find((candidate) => candidate.query === response.query);
    for (const result of response.results) {
      let normalizedUrl: string;
      try {
        normalizedUrl = normalizeUrl(result.url);
      } catch {
        continue;
      }

      if (seenUrls.has(normalizedUrl)) {
        continue;
      }

      seenUrls.add(normalizedUrl);
      results.push({
        ...result,
        url: normalizedUrl,
        domain: getDomain(normalizedUrl),
        sourceQuery: response.query,
        ...(intent?.purpose ? { purpose: intent.purpose } : {}),
      });
    }
  }

  return results;
}

export async function searchWeb(
  intents: SearchIntent[],
  maxResults = config.maxResultsPerQuery,
  provider: SearchProvider = getSearchProvider(),
): Promise<SearchServiceResponse> {
  const trimmedIntents = intents
    .map((intent) => ({
      query: intent.query.trim(),
      ...(intent.purpose?.trim() ? { purpose: intent.purpose.trim() } : {}),
    }))
    .filter((intent) => intent.query.length > 0);

  if (trimmedIntents.length < 1 || trimmedIntents.length > config.maxSearchesPerResearch) {
    throw new SearchServiceError(
      `Search requires between 1 and ${config.maxSearchesPerResearch} queries.`,
    );
  }

  if (!Number.isInteger(maxResults) || maxResults < 1 || maxResults > 20) {
    throw new SearchServiceError("maxResults must be a whole number between 1 and 20.");
  }

  const uniqueIntents = trimmedIntents.filter(
    (intent, index, values) =>
      values.findIndex((candidate) => candidate.query === intent.query) === index,
  );
  const responses = await Promise.all(
    uniqueIntents.map((intent) =>
      provider.search({
        query: intent.query,
        count: maxResults,
      }),
    ),
  );
  const results = deduplicateResults(responses, uniqueIntents).slice(
    0,
    config.maxSourcesPerResearch,
  );

  return {
    provider: provider.name,
    queries: uniqueIntents,
    results,
    totalResults: responses.reduce(
      (total, response) => total + response.results.length,
      0,
    ),
    deduplicatedResults: results.length,
  };
}