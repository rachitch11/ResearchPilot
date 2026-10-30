import { Link } from 'wouter';
import { SiteHeader } from '@/components/layout/site-header';
import { buttonVariants } from '@/components/ui/button';

export default function NotFound() {
  return (
    <div className="research-page min-h-[100dvh] text-foreground">
      <SiteHeader />
      <main className="mx-auto flex min-h-[60vh] w-full max-w-[640px] flex-col items-start justify-center px-6">
        <p className="font-mono-custom text-[10px] uppercase tracking-[0.16em] text-secondary">404</p>
        <h1 className="mt-3 text-3xl tracking-[-0.04em] text-primary">Page not found</h1>
        <p className="mt-3 text-sm text-muted-foreground">
          That route is not part of the ResearchPilot workspace.
        </p>
        <Link href="/" className={`${buttonVariants()} mt-6`} data-testid="link-back-home">
          Back to research
        </Link>
      </main>
    </div>
  );
}
