export const SOURCE_TYPES = [
  "Government",
  "Academic",
  "International Organization",
  "Company",
  "Financial Institution",
  "News",
  "Industry Publication",
  "Blog",
  "Unknown",
] as const;

export const SOURCE_QUALITIES = ["High", "Medium", "Low", "Unknown"] as const;

export type SourceType = (typeof SOURCE_TYPES)[number];
export type SourceQuality = (typeof SOURCE_QUALITIES)[number];

export interface SourceClassificationInput {
  url: string;
  title?: string;
}

export interface SourceClassification {
  url: string;
  domain: string;
  title?: string;
  sourceType: SourceType;
  quality: SourceQuality;
  signals: string[];
}

export class SourceClassifierError extends Error {
  public constructor(message: string) {
    super(message);
    this.name = "SourceClassifierError";
  }
}

function parseUrl(rawUrl: string): { url: string; domain: string } {
  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    throw new SourceClassifierError("The source URL is invalid.");
  }

  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new SourceClassifierError(
      "Only HTTP and HTTPS source URLs are supported.",
    );
  }

  parsed.hash = "";
  return {
    url: parsed.toString(),
    domain: parsed.hostname.toLowerCase().replace(/^www\./, ""),
  };
}

function matchesDomain(domain: string, values: string[]): boolean {
  return values.some(
    (value) => domain === value || domain.endsWith(`.${value}`),
  );
}

function classifyDomain(domain: string): {
  sourceType: SourceType;
  quality: SourceQuality;
  signals: string[];
} {
  if (
    domain.endsWith(".gov") ||
    domain.includes(".gov.") ||
    domain.endsWith(".gouv.fr") ||
    domain.endsWith(".go.jp")
  ) {
    return {
      sourceType: "Government",
      quality: "High",
      signals: ["The domain matches a government web namespace."],
    };
  }

  if (
    domain.endsWith(".edu") ||
    matchesDomain(domain, [
      "ac.uk",
      "ac.in",
      "edu.au",
      "arxiv.org",
      "pubmed.ncbi.nlm.nih.gov",
    ])
  ) {
    return {
      sourceType: "Academic",
      quality: "High",
      signals: ["The domain matches an academic or research namespace."],
    };
  }

  if (
    matchesDomain(domain, [
      "un.org",
      "who.int",
      "worldbank.org",
      "imf.org",
      "oecd.org",
      "iea.org",
      "europa.eu",
    ])
  ) {
    return {
      sourceType: "International Organization",
      quality: "High",
      signals: ["The domain matches a recognized international organization."],
    };
  }

  if (
    matchesDomain(domain, [
      "reuters.com",
      "apnews.com",
      "bbc.com",
      "nytimes.com",
      "ft.com",
      "economist.com",
      "theguardian.com",
      "cnn.com",
    ])
  ) {
    return {
      sourceType: "News",
      quality: "Medium",
      signals: [
        "The domain matches a known news publisher.",
        "Publisher reputation does not replace article-level verification.",
      ],
    };
  }

  if (
    matchesDomain(domain, [
      "sec.gov",
      "rbi.org.in",
      "federalreserve.gov",
      "ecb.europa.eu",
      "jpmorgan.com",
      "goldmansachs.com",
      "morganstanley.com",
    ]) ||
    domain.endsWith(".bank")
  ) {
    return {
      sourceType: "Financial Institution",
      quality: "High",
      signals: ["The domain matches a financial institution or regulator."],
    };
  }

  if (
    matchesDomain(domain, [
      "mckinsey.com",
      "gartner.com",
      "forrester.com",
      "idc.com",
      "techcrunch.com",
      "wired.com",
    ])
  ) {
    return {
      sourceType: "Industry Publication",
      quality: "Medium",
      signals: [
        "The domain matches an industry publication or research publisher.",
        "Methodology and commercial incentives should be checked.",
      ],
    };
  }

  if (
    matchesDomain(domain, [
      "medium.com",
      "substack.com",
      "wordpress.com",
      "blogspot.com",
      "dev.to",
    ]) ||
    domain.startsWith("blog.")
  ) {
    return {
      sourceType: "Blog",
      quality: "Low",
      signals: [
        "The domain or hostname matches a blog or user-publishing platform.",
        "Author credentials and supporting evidence should be checked.",
      ],
    };
  }

  if (domain.split(".").length >= 2) {
    return {
      sourceType: "Company",
      quality: "Medium",
      signals: [
        "The source appears to be a first-party organization domain.",
        "Company sources may reflect organizational interests.",
      ],
    };
  }

  return {
    sourceType: "Unknown",
    quality: "Unknown",
    signals: ["No reliable domain classification rule matched."],
  };
}

export function classifySource(
  input: SourceClassificationInput,
): SourceClassification {
  const { url, domain } = parseUrl(input.url);
  const classification = classifyDomain(domain);
  const title = input.title?.trim().slice(0, 500);

  return {
    url,
    domain,
    ...(title ? { title } : {}),
    ...classification,
  };
}

export function classifySources(
  inputs: SourceClassificationInput[],
): SourceClassification[] {
  if (inputs.length < 1 || inputs.length > 20) {
    throw new SourceClassifierError(
      "Source classification requires between 1 and 20 sources.",
    );
  }

  return inputs.map(classifySource);
}