import type { EvidenceItem, ResearchRun } from '@workspace/api-client-react';
import { Badge } from '@/components/ui/badge';
import { sourceAnchorId } from '@/lib/citations';

interface SourceListProps {
  run: ResearchRun;
}

export function SourceList({ run }: SourceListProps) {
  if (run.sources.length === 0) {
    return (
      <p className="text-sm text-muted-foreground" data-testid="empty-sources">
        No sources were collected for this run.
      </p>
    );
  }

  const evidenceByUrl = new Map<string, EvidenceItem[]>();
  for (const item of run.evidence?.items ?? []) {
    const current = evidenceByUrl.get(item.sourceUrl) ?? [];
    current.push(item);
    evidenceByUrl.set(item.sourceUrl, current);
  }

  return (
    <div className="space-y-4" data-testid="list-sources">
      {run.sources.map((source) => {
        const evidence = evidenceByUrl.get(source.url) ?? [];
        const publicationDate = evidence.find((item) => item.publicationDate)?.publicationDate;
        return (
          <article
            key={source.url}
            id={sourceAnchorId(source.url)}
            className="scroll-mt-24 rounded-2xl border border-border bg-card p-5"
            data-testid="card-source"
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h3 className="text-base font-semibold text-primary">{source.title || source.domain}</h3>
                <p className="mt-1 font-mono-custom text-[11px] uppercase tracking-[0.12em] text-muted-foreground">
                  {source.domain}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Badge variant="outline">{source.sourceType}</Badge>
                <Badge variant="secondary">{source.quality} quality</Badge>
                <Badge variant={source.readStatus === 'read' ? 'default' : 'destructive'}>
                  {source.readStatus}
                </Badge>
              </div>
            </div>
            {publicationDate ? (
              <p className="mt-2 text-xs text-muted-foreground">Published {publicationDate}</p>
            ) : null}
            <a
              href={source.url}
              target="_blank"
              rel="noreferrer"
              className="mt-3 inline-flex text-sm font-medium text-primary underline-offset-4 hover:underline"
              data-testid="link-open-source"
            >
              Open source
            </a>
            {source.error ? (
              <p className="mt-2 text-sm text-destructive">{source.error}</p>
            ) : null}
            {evidence.length > 0 ? (
              <div className="mt-4 space-y-3 border-t border-border pt-4">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                  Extracted evidence
                </p>
                {evidence.map((item) => (
                  <figure key={item.id} className="rounded-xl bg-background p-3">
                    <blockquote className="text-sm leading-6 text-foreground">“{item.passage}”</blockquote>
                    <figcaption className="mt-2 text-xs text-muted-foreground">
                      Exact passage from the source. Summary: {item.summary}
                    </figcaption>
                  </figure>
                ))}
              </div>
            ) : null}
          </article>
        );
      })}
    </div>
  );
}
