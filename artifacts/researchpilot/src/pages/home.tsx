import { Link } from 'wouter';
import { SiteHeader } from '@/components/layout/site-header';
import { ProgressList } from '@/components/research/progress-list';
import { QuestionForm } from '@/components/research/question-form';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { describeApiError } from '@/lib/api-errors';
import { listResearchHistory } from '@/lib/research-history';
import { useResearchRunner } from '@/hooks/use-research-runner';
import { useMemo } from 'react';

export default function HomePage() {
  const { start, isRunning, mutationError } = useResearchRunner();
  const history = useMemo(() => listResearchHistory(), [isRunning, mutationError]);
  const error = mutationError ? describeApiError(mutationError) : undefined;

  return (
    <div className="research-page min-h-[100dvh] text-foreground">
      <SiteHeader />
      <main className="mx-auto w-full max-w-[1240px] px-6 py-12 lg:px-10 lg:py-16">
        <div className="grid gap-12 lg:grid-cols-[minmax(0,1fr)_20rem]">
          <section className="max-w-[640px]">
            <p className="font-mono-custom text-[10px] font-bold uppercase tracking-[0.2em] text-secondary">
              Research workspace
            </p>
            <h1 className="mt-4 max-w-[16ch] text-5xl leading-[0.92] tracking-[-0.05em] text-primary sm:text-6xl">
              Ask a question you can trace.
            </h1>
            <p className="mt-6 max-w-[520px] text-sm leading-6 text-muted-foreground">
              ResearchPilot plans, searches, reads, and synthesizes a cited report. Progress comes from the API after the run finishes; stages are not invented in the browser.
            </p>
            <div className="mt-8 rounded-2xl border border-border bg-card p-5">
              <QuestionForm disabled={isRunning} onSubmit={start} />
            </div>
            {error ? (
              <Alert className="mt-4" data-testid="alert-research-error">
                <AlertTitle>{error.title}</AlertTitle>
                <AlertDescription>{error.message}</AlertDescription>
              </Alert>
            ) : null}
            <div className="mt-6">
              <ProgressList events={[]} pending={isRunning} />
            </div>
          </section>
          <aside>
            <h2 className="text-sm font-semibold text-primary">Recent investigations</h2>
            {history.length === 0 ? (
              <p className="mt-3 text-sm text-muted-foreground" data-testid="empty-history">
                Completed runs from this browser will appear here.
              </p>
            ) : (
              <ul className="mt-3 space-y-2">
                {history.map((item) => (
                  <li key={item.researchId}>
                    <Link
                      href={`/research/${item.researchId}`}
                      className="block rounded-xl border border-border bg-card px-4 py-3 text-sm hover:border-secondary/50"
                      data-testid="link-history-item"
                    >
                      <span className="line-clamp-2 font-medium text-primary">{item.question}</span>
                      <span className="mt-1 block text-xs text-muted-foreground">{item.status}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </aside>
        </div>
      </main>
    </div>
  );
}
