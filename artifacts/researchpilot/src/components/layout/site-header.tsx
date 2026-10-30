import { useHealthCheck } from '@workspace/api-client-react';
import { Link } from 'wouter';

export function SiteHeader() {
  const health = useHealthCheck();
  const healthLabel = health.isSuccess
    ? 'API connected'
    : health.isError
      ? 'API unavailable'
      : 'Checking API';

  return (
    <header className="relative z-10 border-b border-border/80 bg-background/80 backdrop-blur">
      <div className="mx-auto flex w-full max-w-[1240px] items-center justify-between px-6 py-4 lg:px-10">
        <Link
          href="/"
          aria-label="ResearchPilot home"
          data-testid="link-brand-home"
          className="group flex items-center gap-3"
        >
          <span className="relative grid h-9 w-9 place-items-center rounded-[11px] bg-primary text-primary-foreground">
            <span className="absolute h-4 w-4 rounded-full border border-secondary" />
            <span className="h-1.5 w-1.5 rounded-full bg-secondary" />
          </span>
          <span className="text-[15px] font-semibold tracking-[-0.02em]">ResearchPilot</span>
        </Link>
        <nav className="flex shrink-0 items-center gap-3 text-[13px] font-medium text-muted-foreground sm:gap-5" aria-label="Main">
          <Link href="/" className="hidden transition-colors hover:text-foreground sm:inline" data-testid="link-new-research">
            New research
          </Link>
          <span className="flex items-center gap-2 text-xs" data-testid="status-api">
            <span
              className={`h-2 w-2 rounded-full ${health.isSuccess ? 'bg-secondary' : health.isError ? 'bg-accent' : 'bg-muted-foreground'}`}
            />
            {healthLabel}
          </span>
        </nav>
      </div>
    </header>
  );
}
