import type { CitedStatement, ResearchRun } from '@workspace/api-client-react';
import { groundedCitation, sourceAnchorId } from '@/lib/citations';

interface CitedTextProps {
  statement: CitedStatement;
  run: ResearchRun;
}

export function CitedText({ statement, run }: CitedTextProps) {
  return (
    <div className="space-y-2">
      <p className="text-sm leading-6 text-foreground">
        {statement.text}
        {statement.citationIds.map((citationId) => {
          const citation = groundedCitation(run, citationId);
          if (!citation) {
            return null;
          }
          return (
            <a
              key={citationId}
              href={`#${sourceAnchorId(citation.url)}`}
              className="ml-1 text-[11px] font-semibold text-secondary align-super"
              data-testid="link-citation"
              title={citation.title}
            >
              [{citation.id}]
            </a>
          );
        })}
      </p>
      <p className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
        {statement.kind === 'fact' ? 'Sourced fact' : 'Interpretation'}
      </p>
    </div>
  );
}
