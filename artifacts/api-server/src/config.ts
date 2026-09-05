const DEFAULTS = {
  maxResearchPerHour: 3,
  maxSearchesPerResearch: 8,
  maxSourcesPerResearch: 12,
  maxResearchTimeSeconds: 120,
  aiProvider: "gemini",
  geminiModel: "gemini-3.6-flash",
  aiRequestTimeoutMs: 30_000,
  searchProvider: "brave",
  searchRequestTimeoutMs: 15_000,
  maxResultsPerQuery: 5,
  webpageRequestTimeoutMs: 15_000,
  maxPageBytes: 2_000_000,
  requestBodyLimit: "32kb",
} as const;

function readPositiveInteger(
  name: string,
  fallback: number,
  maximum = Number.MAX_SAFE_INTEGER,
): number {
  const rawValue = process.env[name];

  if (rawValue === undefined || rawValue.trim() === "") {
    return fallback;
  }

  const value = Number(rawValue);
  if (!Number.isInteger(value) || value < 1 || value > maximum) {
    throw new Error(
      `${name} must be a whole number between 1 and ${maximum}. Received "${rawValue}".`,
    );
  }

  return value;
}

export const config = {
  environment: process.env.NODE_ENV ?? "development",
  logLevel: process.env.LOG_LEVEL ?? "info",
  corsOrigin: process.env.CORS_ORIGIN ?? "*",
  aiProvider: process.env.AI_PROVIDER ?? DEFAULTS.aiProvider,
  geminiModel: process.env.GEMINI_MODEL ?? DEFAULTS.geminiModel,
  aiRequestTimeoutMs: readPositiveInteger(
    "AI_REQUEST_TIMEOUT_MS",
    DEFAULTS.aiRequestTimeoutMs,
  ),
  searchProvider: process.env.SEARCH_PROVIDER ?? DEFAULTS.searchProvider,
  searchRequestTimeoutMs: readPositiveInteger(
    "SEARCH_REQUEST_TIMEOUT_MS",
    DEFAULTS.searchRequestTimeoutMs,
    60_000,
  ),
  maxResultsPerQuery: readPositiveInteger(
    "MAX_RESULTS_PER_QUERY",
    DEFAULTS.maxResultsPerQuery,
    20,
  ),
  webpageRequestTimeoutMs: readPositiveInteger(
    "WEBPAGE_REQUEST_TIMEOUT_MS",
    DEFAULTS.webpageRequestTimeoutMs,
    60_000,
  ),
  maxPageBytes: readPositiveInteger(
    "MAX_PAGE_BYTES",
    DEFAULTS.maxPageBytes,
    10_000_000,
  ),
  requestBodyLimit: process.env.REQUEST_BODY_LIMIT ?? DEFAULTS.requestBodyLimit,
  maxResearchPerHour: readPositiveInteger(
    "MAX_RESEARCH_PER_HOUR",
    DEFAULTS.maxResearchPerHour,
  ),
  maxSearchesPerResearch: readPositiveInteger(
    "MAX_SEARCHES_PER_RESEARCH",
    DEFAULTS.maxSearchesPerResearch,
  ),
  maxSourcesPerResearch: readPositiveInteger(
    "MAX_SOURCES_PER_RESEARCH",
    DEFAULTS.maxSourcesPerResearch,
  ),
  maxResearchTimeSeconds: readPositiveInteger(
    "MAX_RESEARCH_TIME",
    DEFAULTS.maxResearchTimeSeconds,
  ),
} as const;