import { config } from "../config";

const MAX_REDIRECTS = 3;
const BLOCKED_HOSTNAMES = new Set([
  "localhost",
  "localhost.localdomain",
  "metadata.google.internal",
  "metadata",
]);

export interface WebpageDocument {
  title: string;
  url: string;
  domain: string;
  publicationDate?: string;
  cleanText: string;
}

export class WebpageReaderError extends Error {
  public readonly code:
    | "invalid_url"
    | "request_failed"
    | "too_large"
    | "empty_content";

  public constructor(
    message: string,
    code: WebpageReaderError["code"],
  ) {
    super(message);
    this.name = "WebpageReaderError";
    this.code = code;
  }
}

function isPrivateIpv4(hostname: string): boolean {
  const parts = hostname.split(".").map(Number);
  if (
    parts.length !== 4 ||
    parts.some((part) => !Number.isInteger(part) || part < 0 || part > 255)
  ) {
    return false;
  }

  const [first, second] = parts;
  return (
    first === 0 ||
    first === 10 ||
    first === 127 ||
    (first === 169 && second === 254) ||
    (first === 172 && second >= 16 && second <= 31) ||
    (first === 192 && second === 168)
  );
}

function isBlockedHostname(hostname: string): boolean {
  const normalized = hostname.toLowerCase().replace(/\.$/, "");
  return (
    BLOCKED_HOSTNAMES.has(normalized) ||
    normalized.endsWith(".local") ||
    normalized.endsWith(".localhost") ||
    isPrivateIpv4(normalized) ||
    normalized === "::1" ||
    normalized.startsWith("fc") ||
    normalized.startsWith("fd") ||
    normalized.startsWith("fe80:")
  );
}

function parseTarget(rawUrl: string): URL {
  let target: URL;
  try {
    target = new URL(rawUrl);
  } catch {
    throw new WebpageReaderError("The URL is invalid.", "invalid_url");
  }

  if (target.protocol !== "http:" && target.protocol !== "https:") {
    throw new WebpageReaderError(
      "Only HTTP and HTTPS URLs are supported.",
      "invalid_url",
    );
  }

  if (isBlockedHostname(target.hostname)) {
    throw new WebpageReaderError(
      "This URL is not allowed.",
      "invalid_url",
    );
  }

  target.hash = "";
  return target;
}

function decodeEntities(value: string): string {
  return value
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'");
}

function extractTitle(html: string): string {
  const match = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  return match
    ? decodeEntities(match[1].replace(/<[^>]+>/g, " ")).replace(/\s+/g, " ").trim()
    : "";
}

function extractPublicationDate(html: string): string | undefined {
  const patterns = [
    /<meta[^>]+(?:property|name)=["'](?:article:published_time|date|datePublished|pubdate)["'][^>]+content=["']([^"']+)["']/i,
    /<time[^>]+datetime=["']([^"']+)["']/i,
  ];

  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match?.[1]?.trim()) {
      return match[1].trim().slice(0, 120);
    }
  }

  return undefined;
}

function extractCleanText(html: string): string {
  const withoutUnsafeContent = html
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, " ")
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, " ")
    .replace(/<noscript\b[^>]*>[\s\S]*?<\/noscript>/gi, " ")
    .replace(/<!--[\s\S]*?-->/g, " ");
  const text = withoutUnsafeContent
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return decodeEntities(text);
}

async function readBody(
  response: Response,
  target: URL,
): Promise<string> {
  const contentLength = response.headers.get("content-length");
  if (contentLength && Number(contentLength) > config.maxPageBytes) {
    throw new WebpageReaderError(
      `The page exceeds the ${config.maxPageBytes}-byte limit.`,
      "too_large",
    );
  }

  if (!response.body) {
    return response.text();
  }

  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let totalBytes = 0;

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) {
        break;
      }

      totalBytes += value.byteLength;
      if (totalBytes > config.maxPageBytes) {
        await reader.cancel();
        throw new WebpageReaderError(
          `The page exceeds the ${config.maxPageBytes}-byte limit.`,
          "too_large",
        );
      }
      chunks.push(value);
    }
  } catch (error) {
    if (error instanceof WebpageReaderError) {
      throw error;
    }
    throw new WebpageReaderError(
      `The page body from ${target.hostname} could not be read.`,
      "request_failed",
    );
  }

  const body = new Uint8Array(totalBytes);
  let offset = 0;
  for (const chunk of chunks) {
    body.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return new TextDecoder().decode(body);
}

async function fetchPage(rawUrl: string): Promise<{ html: string; url: URL }> {
  let target = parseTarget(rawUrl);
  const controller = new AbortController();
  const timeout = setTimeout(
    () => controller.abort(),
    config.webpageRequestTimeoutMs,
  );

  try {
    for (let redirectCount = 0; redirectCount <= MAX_REDIRECTS; redirectCount += 1) {
      const response = await fetch(target, {
        headers: {
          Accept: "text/html,application/xhtml+xml",
          "User-Agent": "ResearchPilot/1.0 (+webpage-reader)",
        },
        redirect: "manual",
        signal: controller.signal,
      });

      if (response.status >= 300 && response.status < 400) {
        const location = response.headers.get("location");
        if (!location || redirectCount === MAX_REDIRECTS) {
          throw new WebpageReaderError(
            "The page returned too many redirects or an invalid redirect.",
            "request_failed",
          );
        }
        target = parseTarget(new URL(location, target).toString());
        continue;
      }

      if (!response.ok) {
        throw new WebpageReaderError(
          `The page returned HTTP ${response.status}.`,
          "request_failed",
        );
      }

      const contentType = response.headers.get("content-type") ?? "";
      if (
        contentType &&
        !contentType.includes("text/html") &&
        !contentType.includes("application/xhtml+xml")
      ) {
        throw new WebpageReaderError(
          "The URL did not return an HTML page.",
          "request_failed",
        );
      }

      return { html: await readBody(response, target), url: target };
    }
  } catch (error) {
    if (error instanceof WebpageReaderError) {
      throw error;
    }
    throw new WebpageReaderError(
      error instanceof Error && error.name === "AbortError"
        ? "The webpage request timed out."
        : "The webpage could not be retrieved.",
      "request_failed",
    );
  } finally {
    clearTimeout(timeout);
  }

  throw new WebpageReaderError(
    "The webpage could not be retrieved.",
    "request_failed",
  );
}

export async function readWebpage(rawUrl: string): Promise<WebpageDocument> {
  const { html, url } = await fetchPage(rawUrl);
  const cleanText = extractCleanText(html);
  if (!cleanText) {
    throw new WebpageReaderError(
      "The webpage did not contain readable text.",
      "empty_content",
    );
  }

  return {
    title: extractTitle(html) || url.hostname,
    url: url.toString(),
    domain: url.hostname.replace(/^www\./, ""),
    ...(extractPublicationDate(html)
      ? { publicationDate: extractPublicationDate(html) }
      : {}),
    cleanText,
  };
}