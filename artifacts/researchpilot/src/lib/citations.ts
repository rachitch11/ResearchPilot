import type { ResearchCitation, ResearchRun } from '@workspace/api-client-react';

export function citationById(
  run: ResearchRun,
  citationId: string,
): ResearchCitation | undefined {
  return run.synthesis?.citations.find((citation) => citation.id === citationId);
}

export function isCollectedSourceUrl(run: ResearchRun, url: string): boolean {
  return (
    run.sources.some((source) => source.url === url) ||
    Boolean(run.evidence?.items.some((item) => item.sourceUrl === url))
  );
}

export function groundedCitation(
  run: ResearchRun,
  citationId: string,
): ResearchCitation | undefined {
  const citation = citationById(run, citationId);
  if (!citation || !isCollectedSourceUrl(run, citation.url)) {
    return undefined;
  }
  return citation;
}

export function sourceAnchorId(url: string): string {
  return `source-${encodeURIComponent(url)}`;
}
