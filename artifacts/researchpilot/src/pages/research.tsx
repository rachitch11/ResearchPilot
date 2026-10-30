import { useParams } from 'wouter';
import { SiteHeader } from '@/components/layout/site-header';
import { ProgressList } from '@/components/research/progress-list';
import { QuestionForm } from '@/components/research/question-form';
import { ReportView } from '@/components/research/report-view';
import { SourceList } from '@/components/research/source-list';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { describeApiError } from '@/lib/api-errors';
import { useResearchRunner } from '@/hooks/use-research-runner';

export default function ResearchPage() {
  const params = useParams<{ researchId: string }>();
  const researchId = params.researchId ?? '';
  const { start, isRunning, mutationError, run, queryError, isLoadingRun } =
    useResearchRunner(researchId);

  const error = mutationError
    ? describeApiError(mutationError)
    : queryError
      ? describeApiError(queryError)
      : undefined;

  const retryQuestion = run?.question;

  return (
    <div className="research-page min-h-[100dvh] text-foreground">
      <SiteHeader />
      <main className="mx-auto w-full max-w-[1240px] px-6 py-10 lg:px-10">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="font-mono-custom text-[10px] uppercase tracking-[0.16em] text-secondary">
              Investigation
            </p>
            <h1 className="mt-2 max-w-[46rem] text-3xl tracking-[-0.04em] text-primary sm:text-4xl">
              {run?.question ?? (isLoadingRun ? 'Loading research…' : 'Research run')}
            </h1>
            {run ? (
              <div className="mt-3 flex flex-wrap gap-2">
                <Badge data-testid="badge-research-status">{run.status.replaceAll('_', ' ')}</Badge>
                <Badge variant="outline">{run.researchId}</Badge>
              </div>
            ) : null}
          </div>
        </div>

        {error ? (
          <Alert className="mt-6" data-testid="alert-research-error">
            <AlertTitle>{error.title}</AlertTitle>
            <AlertDescription className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <span>{error.message}</span>
              {retryQuestion ? (
                <Button
                  type="button"
                  variant="outline"
                  disabled={isRunning}
                  onClick={() => start(retryQuestion)}
                  data-testid="button-retry-research"
                >
                  Try again
                </Button>
              ) : null}
            </AlertDescription>
          </Alert>
        ) : null}

        {run?.status === 'completed_with_partial_results' ? (
          <Alert className="mt-6" data-testid="alert-partial-results">
            <AlertTitle>Partial results</AlertTitle>
            <AlertDescription>
              Some sources failed. The report uses the evidence that could be collected.
            </AlertDescription>
          </Alert>
        ) : null}

        <div className="mt-8 grid gap-10 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.2fr)]">
          <div className="space-y-6">
            {isLoadingRun && !run ? (
              <p className="text-sm text-muted-foreground" data-testid="status-loading-run">
                Loading this research run from the API…
              </p>
            ) : (
              <ProgressList events={run?.progress ?? []} pending={isRunning} />
            )}
            {run?.errors.length ? (
              <div className="rounded-2xl border border-border bg-card p-4" data-testid="list-run-errors">
                <h2 className="text-sm font-semibold text-primary">Run notes</h2>
                <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
                  {run.errors.map((item) => (
                    <li key={`${item.stage}-${item.message}`}>
                      {item.stage}: {item.message}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
            <section className="rounded-2xl border border-border bg-card p-5">
              <h2 className="text-sm font-semibold text-primary">Start another investigation</h2>
              <div className="mt-3">
                <QuestionForm disabled={isRunning} onSubmit={start} submitLabel="Run again" />
              </div>
            </section>
          </div>
          <div className="space-y-10">
            <section>
              <h2 className="text-xl font-semibold text-primary">Report</h2>
              <div className="mt-4">
                {run ? <ReportView run={run} /> : <p className="text-sm text-muted-foreground">The report appears when the API returns a synthesis.</p>}
              </div>
            </section>
            <section>
              <h2 className="text-xl font-semibold text-primary">Sources</h2>
              <div className="mt-4">{run ? <SourceList run={run} /> : null}</div>
            </section>
          </div>
        </div>
      </main>
    </div>
  );
}
