import type { ResearchRun } from '@workspace/api-client-react';
import { CitedText } from '@/components/research/cited-text';
import { groundedCitation, sourceAnchorId } from '@/lib/citations';

interface ReportViewProps {
  run: ResearchRun;
}

export function ReportView({ run }: ReportViewProps) {
  const report = run.synthesis;
  if (!report) {
    return (
      <p className="text-sm text-muted-foreground" data-testid="empty-report">
        No report was generated for this run.
      </p>
    );
  }

  const evidenceById = new Map((run.evidence?.items ?? []).map((item) => [item.id, item]));

  return (
    <article className="space-y-8" data-testid="report-view">
      <section>
        <h3 className="text-lg font-semibold text-primary">Executive summary</h3>
        <div className="mt-3">
          <CitedText statement={report.executiveSummary} run={run} />
        </div>
      </section>

      {report.keyFindings.length > 0 ? (
        <section>
          <h3 className="text-lg font-semibold text-primary">Key findings</h3>
          <ul className="mt-3 space-y-4">
            {report.keyFindings.map((finding, index) => (
              <li key={`${finding.text}-${index}`}>
                <CitedText statement={finding} run={run} />
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {run.plan ? (
        <section>
          <h3 className="text-lg font-semibold text-primary">Research questions</h3>
          <p className="mt-2 text-sm text-muted-foreground">{run.plan.objective}</p>
          <ul className="mt-3 list-disc space-y-2 pl-5 text-sm">
            {run.plan.subQuestions.map((item) => (
              <li key={item.id}>
                <span className="font-medium text-primary">{item.question}</span>
                <span className="block text-muted-foreground">{item.rationale}</span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {report.findingsByQuestion.map((group) => (
        <section key={group.subQuestionId}>
          <h3 className="text-lg font-semibold text-primary">{group.question}</h3>
          <ul className="mt-3 space-y-4">
            {group.findings.map((finding, index) => (
              <li key={`${group.subQuestionId}-${index}`}>
                <CitedText statement={finding} run={run} />
              </li>
            ))}
          </ul>
        </section>
      ))}

      {report.supportingEvidenceIds.length > 0 ? (
        <section>
          <h3 className="text-lg font-semibold text-primary">Supporting evidence</h3>
          <ul className="mt-3 space-y-2 text-sm">
            {report.supportingEvidenceIds.map((id) => {
              const item = evidenceById.get(id);
              return item ? (
                <li key={id}>
                  {item.claim}{' '}
                  <a className="text-secondary" href={`#${sourceAnchorId(item.sourceUrl)}`}>
                    {item.sourceDomain}
                  </a>
                </li>
              ) : null;
            })}
          </ul>
        </section>
      ) : null}

      {report.unresolvedConflicts.length > 0 || report.contradictingEvidenceIds.length > 0 ? (
        <section>
          <h3 className="text-lg font-semibold text-primary">Conflicts</h3>
          <ul className="mt-3 space-y-4">
            {report.unresolvedConflicts.map((item, index) => (
              <li key={`conflict-${index}`}>
                <CitedText statement={item} run={run} />
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {report.limitations.length > 0 || report.evidenceGaps.length > 0 ? (
        <section>
          <h3 className="text-lg font-semibold text-primary">Limitations</h3>
          <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-muted-foreground">
            {[...report.limitations, ...report.evidenceGaps].map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </section>
      ) : null}

      <section>
        <h3 className="text-lg font-semibold text-primary">Conclusion</h3>
        <div className="mt-3">
          <CitedText statement={report.conclusion} run={run} />
        </div>
      </section>

      <section>
        <h3 className="text-lg font-semibold text-primary">Sources</h3>
        <ol className="mt-3 space-y-2 text-sm">
          {report.citations.map((citation) => {
            const grounded = groundedCitation(run, citation.id);
            if (!grounded) {
              return null;
            }
            return (
              <li key={citation.id}>
                <a href={`#${sourceAnchorId(grounded.url)}`} className="font-medium text-primary hover:underline">
                  [{grounded.id}] {grounded.title}
                </a>
                <span className="text-muted-foreground"> — {grounded.domain}</span>
              </li>
            );
          })}
        </ol>
      </section>
    </article>
  );
}
