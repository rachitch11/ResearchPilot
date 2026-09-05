export interface SearchRequest {
  query: string;
  count: number;
}

export interface SearchProviderResult {
  title: string;
  url: string;
  snippet: string;
  publishedDate?: string;
}

export interface SearchProviderResponse {
  provider: string;
  query: string;
  results: SearchProviderResult[];
}

export interface SearchProvider {
  readonly name: string;
  search(input: SearchRequest): Promise<SearchProviderResponse>;
}

export class SearchProviderError extends Error {
  public readonly code: "not_configured" | "request_failed" | "invalid_response";

  public constructor(
    message: string,
    code: SearchProviderError["code"],
  ) {
    super(message);
    this.name = "SearchProviderError";
    this.code = code;
  }
}