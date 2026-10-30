const MAX_PASSAGE_CHARS = 600;

export function normalizeWhitespace(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

export function normalizeForMatch(value: string): string {
  return normalizeWhitespace(value).toLowerCase();
}

export function truncateText(value: string, maxChars: number): string {
  const normalized = normalizeWhitespace(value);
  if (normalized.length <= maxChars) {
    return normalized;
  }
  return `${normalized.slice(0, maxChars).trim()}…`;
}

export function passageOccursInSource(passage: string, sourceText: string): boolean {
  const needle = normalizeForMatch(passage);
  if (needle.length < 24) {
    return false;
  }
  return normalizeForMatch(sourceText).includes(needle);
}

export function clipPassage(passage: string): string {
  return truncateText(passage, MAX_PASSAGE_CHARS);
}

export async function mapWithConcurrency<T, R>(
  items: T[],
  limit: number,
  mapper: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  const results = new Array<R>(items.length);
  let nextIndex = 0;

  async function worker(): Promise<void> {
    while (nextIndex < items.length) {
      const current = nextIndex;
      nextIndex += 1;
      results[current] = await mapper(items[current], current);
    }
  }

  const workers = Array.from({ length: Math.min(limit, items.length) }, () =>
    worker(),
  );
  await Promise.all(workers);
  return results;
}
