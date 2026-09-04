import { type FormEvent, type ReactNode, useRef, useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  Activity,
  ArrowRight,
  ArrowUpRight,
  BookOpen,
  Check,
  ChevronDown,
  CircleDashed,
  Command,
  Database,
  FileSearch,
  Layers3,
  ShieldCheck,
} from 'lucide-react';
import { useHealthCheck } from '@workspace/api-client-react';
import { ErrorBoundary } from '@/components/error-boundary';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import NotFound from '@/pages/not-found';
import {
  Route,
  Switch,
  useLocation,
  Router as WouterRouter,
} from 'wouter';

const queryClient = new QueryClient();

function Home() {
  const questionRef = useRef<HTMLTextAreaElement>(null);
  const [question, setQuestion] = useState('');
  const [submittedQuestion, setSubmittedQuestion] = useState('');
  const [notice, setNotice] = useState('');
  const health = useHealthCheck();

  const handleStart = () => {
    questionRef.current?.focus();
    document.getElementById('investigation-start')?.scrollIntoView({
      behavior: 'smooth',
      block: 'center',
    });
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmedQuestion = question.trim();
    if (!trimmedQuestion) {
      setNotice('Add a question first. A good investigation starts with a clear edge.');
      questionRef.current?.focus();
      return;
    }
    setSubmittedQuestion(trimmedQuestion);
    setNotice('Your investigation seed is saved in this workspace. Research tools arrive next.');
  };

  const healthLabel = health.isSuccess
    ? 'System nominal'
    : health.isError
      ? 'Status unavailable'
      : 'Checking system';

  return (
    <main className="research-page min-h-[100dvh] overflow-hidden text-foreground">
      <header className="relative z-10 mx-auto flex w-full max-w-[1240px] items-center justify-between px-6 py-6 lg:px-10">
        <a
          href="/"
          aria-label="ResearchPilot home"
          data-testid="link-brand-home"
          className="group flex items-center gap-3"
        >
          <span className="relative grid h-9 w-9 place-items-center rounded-[11px] bg-primary text-primary-foreground shadow-[0_8px_18px_hsl(204_40%_18%_/_0.16)] transition-transform duration-300 group-hover:-rotate-6">
            <span className="absolute h-4 w-4 rounded-full border border-secondary" />
            <span className="h-1.5 w-1.5 rounded-full bg-secondary" />
          </span>
          <span className="text-[15px] font-semibold tracking-[-0.02em]">ResearchPilot</span>
        </a>

        <nav className="hidden items-center gap-8 text-[13px] font-medium text-muted-foreground md:flex" aria-label="Main navigation">
          <a href="#method" data-testid="link-method" className="transition-colors hover:text-foreground">The method</a>
          <a href="#principles" data-testid="link-principles" className="transition-colors hover:text-foreground">Principles</a>
          <button
            type="button"
            onClick={() => setNotice('Sign in will be available when accounts open.')}
            data-testid="button-sign-in"
            className="flex items-center gap-1.5 rounded-full border border-border bg-card/60 px-4 py-2 text-foreground transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:bg-card"
          >
            Sign in
            <ArrowUpRight size={13} strokeWidth={1.8} />
          </button>
        </nav>
        <button
          type="button"
          onClick={handleStart}
          data-testid="button-mobile-start"
          className="rounded-full border border-border bg-card px-3.5 py-2 text-xs font-semibold md:hidden"
        >
          Start
        </button>
      </header>

      <section className="relative z-0 mx-auto grid w-full max-w-[1240px] items-center gap-14 px-6 pb-20 pt-12 lg:grid-cols-[minmax(0,1fr)_minmax(420px,0.85fr)] lg:gap-24 lg:px-10 lg:pb-32 lg:pt-20">
        <div className="page-reveal max-w-[650px]">
          <div className="mb-7 flex items-center gap-3 text-[10px] font-bold uppercase tracking-[0.2em] text-secondary">
            <span className="h-px w-8 bg-secondary" />
            A research workspace for the curious
          </div>
          <h1 className="max-w-[650px] text-[clamp(3.8rem,8vw,7.4rem)] leading-[0.86] tracking-[-0.07em] text-primary">
            Find the signal
            <span className="font-display block pt-2 text-[1.08em] font-normal italic text-accent">inside the noise.</span>
          </h1>
          <p className="mt-9 max-w-[510px] text-[17px] leading-7 text-muted-foreground">
            ResearchPilot turns complex questions into a trail you can follow:
            sources surfaced, claims separated, and conclusions you can stand behind.
          </p>
          <div className="mt-9 flex flex-wrap items-center gap-4">
            <button
              type="button"
              onClick={handleStart}
              data-testid="button-start-investigation"
              className="group inline-flex items-center gap-3 rounded-full bg-primary px-5 py-3.5 text-sm font-semibold text-primary-foreground shadow-[0_12px_24px_hsl(204_40%_18%_/_0.18)] transition-all duration-300 hover:-translate-y-1 hover:bg-[hsl(204_40%_24%)] hover:shadow-[0_16px_28px_hsl(204_40%_18%_/_0.22)]"
            >
              Start an investigation
              <span className="grid h-6 w-6 place-items-center rounded-full bg-secondary text-secondary-foreground transition-transform duration-300 group-hover:translate-x-1">
                <ArrowRight size={14} />
              </span>
            </button>
            <a
              href="#method"
              data-testid="link-see-method"
              className="group inline-flex items-center gap-2 px-1 py-3 text-sm font-semibold text-primary"
            >
              See the method
              <ChevronDown size={15} className="transition-transform duration-300 group-hover:translate-y-1" />
            </a>
          </div>
          <div className="mt-12 flex items-center gap-3 text-xs text-muted-foreground" data-testid="status-system">
            <span className={`relative flex h-2.5 w-2.5 ${health.isSuccess ? 'signal-pulse' : ''}`}>
              <span className={`absolute inline-flex h-full w-full rounded-full opacity-50 ${health.isError ? 'bg-accent' : 'bg-secondary'}`} />
              <span className={`relative inline-flex h-2.5 w-2.5 rounded-full ${health.isError ? 'bg-accent' : 'bg-secondary'}`} />
            </span>
            <span>{healthLabel}</span>
            <span className="text-border">/</span>
            <span className="font-mono-custom text-[10px] uppercase tracking-[0.12em]">Phase 0 workspace</span>
          </div>
        </div>

        <div className="page-reveal reveal-delay-2 relative mx-auto w-full max-w-[500px] lg:ml-auto">
          <div className="absolute -right-10 -top-12 h-36 w-36 rounded-full border border-secondary/20 lg:-right-16 lg:-top-16" />
          <div className="absolute -bottom-10 -left-10 h-24 w-24 rounded-full border border-accent/30" />
          <div className="relative overflow-hidden rounded-[24px] border border-primary/10 bg-primary p-3 shadow-[0_28px_60px_hsl(204_40%_18%_/_0.18)]">
            <div className="signal-grid relative min-h-[475px] overflow-hidden rounded-[16px] border border-primary-foreground/10 bg-[hsl(204_40%_18%)] p-5 text-primary-foreground sm:p-7">
              <div className="signal-scan absolute left-0 right-0 top-0 h-px bg-secondary shadow-[0_0_24px_hsl(164_46%_42%_/_0.8)]" />
              <div className="relative flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <span className="grid h-8 w-8 place-items-center rounded-lg border border-primary-foreground/15 bg-primary-foreground/10">
                    <FileSearch size={15} className="text-secondary" />
                  </span>
                  <div>
                    <p className="font-mono-custom text-[9px] uppercase tracking-[0.16em] text-primary-foreground/50">ResearchPilot</p>
                    <p className="mt-0.5 text-sm font-semibold">New investigation</p>
                  </div>
                </div>
                <span className="font-mono-custom text-[9px] uppercase tracking-[0.14em] text-secondary">Ready</span>
              </div>
              <div className="relative mt-16">
                <p className="font-mono-custom text-[10px] uppercase tracking-[0.18em] text-primary-foreground/40">01 / Frame the question</p>
                <h2 className="mt-4 max-w-[360px] text-[clamp(2rem,5vw,3.25rem)] leading-[0.98] tracking-[-0.05em]">
                  Begin with a question worth tracing.
                </h2>
              </div>
              <form id="investigation-start" onSubmit={handleSubmit} className="relative mt-10">
                <label htmlFor="research-question" className="sr-only">Your research question</label>
                <textarea
                  ref={questionRef}
                  id="research-question"
                  value={question}
                  onChange={(event) => setQuestion(event.target.value)}
                  data-testid="input-research-question"
                  placeholder="What are you trying to understand?"
                  rows={3}
                  className="w-full resize-none rounded-xl border border-primary-foreground/15 bg-primary-foreground/[0.08] px-4 py-4 text-sm leading-6 text-primary-foreground placeholder:text-primary-foreground/40 transition-colors focus:border-secondary focus:bg-primary-foreground/[0.12] focus:outline-none"
                />
                <button
                  type="submit"
                  data-testid="button-submit-question"
                  className="mt-3 flex w-full items-center justify-between rounded-xl bg-secondary px-4 py-3 text-sm font-semibold text-secondary-foreground transition-all duration-300 hover:bg-[hsl(164_46%_50%)] active:scale-[0.99]"
                >
                  {submittedQuestion ? 'Question captured' : 'Open a workspace'}
                  {submittedQuestion ? <Check size={17} /> : <ArrowUpRight size={17} />}
                </button>
                {notice && (
                  <p role="status" data-testid="status-investigation" className="mt-3 text-xs leading-5 text-primary-foreground/65">
                    {notice}
                  </p>
                )}
              </form>
              <div className="absolute bottom-7 left-7 right-7 flex items-center justify-between border-t border-primary-foreground/10 pt-4 text-[10px] text-primary-foreground/40">
                <span className="font-mono-custom uppercase tracking-[0.14em]">Private by default</span>
                <span className="flex items-center gap-1.5"><ShieldCheck size={13} /> Evidence first</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="method" className="relative z-10 border-y border-border/80 bg-card/45">
        <div className="mx-auto grid w-full max-w-[1240px] gap-12 px-6 py-20 lg:grid-cols-[0.8fr_1.2fr] lg:gap-24 lg:px-10 lg:py-28">
          <div className="page-reveal reveal-delay-1">
            <p className="font-mono-custom text-[10px] font-bold uppercase tracking-[0.2em] text-secondary">A considered starting point</p>
            <h2 className="mt-5 max-w-[420px] text-4xl leading-[0.98] tracking-[-0.05em] text-primary sm:text-5xl">
              Less answering. More understanding.
            </h2>
            <p className="mt-6 max-w-[390px] text-sm leading-6 text-muted-foreground">
              Good research is not a single response. It is the visible movement from
              uncertainty to a conclusion with its footing intact.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <article className="page-reveal reveal-delay-2 group rounded-2xl border border-border bg-background p-6 transition-all duration-300 hover:-translate-y-1 hover:border-secondary/50 hover:shadow-[0_16px_28px_hsl(204_40%_18%_/_0.08)] sm:col-span-2 sm:flex sm:items-start sm:justify-between sm:gap-8">
              <div className="flex gap-4">
                <span className="font-mono-custom pt-1 text-xs text-accent">01</span>
                <div>
                  <h3 className="text-lg font-semibold tracking-[-0.03em] text-primary">Name the edges</h3>
                  <p className="mt-2 max-w-[440px] text-sm leading-6 text-muted-foreground">Turn a broad curiosity into a question with a useful boundary.</p>
                </div>
              </div>
              <CircleDashed size={30} strokeWidth={1.3} className="mt-5 text-secondary transition-transform duration-500 group-hover:rotate-90 sm:mt-0" />
            </article>
            <article className="page-reveal reveal-delay-3 group rounded-2xl border border-border bg-background p-6 transition-all duration-300 hover:-translate-y-1 hover:border-secondary/50 hover:shadow-[0_16px_28px_hsl(204_40%_18%_/_0.08)]">
              <span className="font-mono-custom text-xs text-accent">02</span>
              <h3 className="mt-7 text-lg font-semibold tracking-[-0.03em] text-primary">Follow the trail</h3>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">Keep the sources and reasoning close, not hidden behind a confident answer.</p>
            </article>
            <article className="page-reveal reveal-delay-4 group rounded-2xl border border-border bg-primary p-6 text-primary-foreground transition-all duration-300 hover:-translate-y-1 hover:bg-[hsl(204_40%_23%)] hover:shadow-[0_16px_28px_hsl(204_40%_18%_/_0.16)]">
              <span className="font-mono-custom text-xs text-secondary">03</span>
              <h3 className="mt-7 text-lg font-semibold tracking-[-0.03em]">Keep the signal</h3>
              <p className="mt-2 text-sm leading-6 text-primary-foreground/60">Arrive at what matters, with the context to explain why it matters.</p>
            </article>
          </div>
        </div>
      </section>

      <section id="principles" className="relative z-10 mx-auto w-full max-w-[1240px] px-6 py-20 lg:px-10 lg:py-28">
        <div className="grid items-start gap-14 lg:grid-cols-[1fr_1.2fr] lg:gap-24">
          <div className="page-reveal">
            <p className="font-mono-custom text-[10px] font-bold uppercase tracking-[0.2em] text-secondary">The ResearchPilot point of view</p>
            <h2 className="mt-5 max-w-[480px] text-4xl leading-[0.98] tracking-[-0.05em] text-primary sm:text-6xl">
              Trust is a design decision.
            </h2>
            <p className="mt-6 max-w-[430px] text-sm leading-6 text-muted-foreground">
              Every part of the workspace is shaped around a simple idea:
              the path to an answer should be as useful as the answer itself.
            </p>
          </div>
          <div className="grid gap-0 border-t border-border">
            <div className="group flex gap-6 border-b border-border py-6 transition-colors hover:bg-accent/5 sm:gap-10">
              <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-secondary/15 text-secondary"><Database size={18} /></div>
              <div><h3 className="font-semibold text-primary">Evidence stays visible</h3><p className="mt-1.5 text-sm leading-6 text-muted-foreground">Sources, claims, and open questions have a place in the room.</p></div>
            </div>
            <div className="group flex gap-6 border-b border-border py-6 transition-colors hover:bg-accent/5 sm:gap-10">
              <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-accent/15 text-accent"><Layers3 size={18} /></div>
              <div><h3 className="font-semibold text-primary">Complexity gets structure</h3><p className="mt-1.5 text-sm leading-6 text-muted-foreground">Breakthroughs often come from seeing how ideas connect, not just collecting more of them.</p></div>
            </div>
            <div className="group flex gap-6 border-b border-border py-6 transition-colors hover:bg-accent/5 sm:gap-10">
              <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary text-primary-foreground"><BookOpen size={18} /></div>
              <div><h3 className="font-semibold text-primary">Your thinking remains yours</h3><p className="mt-1.5 text-sm leading-6 text-muted-foreground">The tool supports judgment; it does not pretend to replace it.</p></div>
            </div>
          </div>
        </div>
      </section>

      <footer className="relative z-10 border-t border-border bg-primary text-primary-foreground">
        <div className="mx-auto flex w-full max-w-[1240px] flex-col gap-8 px-6 py-10 sm:flex-row sm:items-end sm:justify-between lg:px-10">
          <div>
            <div className="flex items-center gap-3">
              <span className="grid h-8 w-8 place-items-center rounded-lg border border-primary-foreground/20"><Activity size={15} className="text-secondary" /></span>
              <span className="text-sm font-semibold">ResearchPilot</span>
            </div>
            <p className="mt-4 max-w-[310px] text-xs leading-5 text-primary-foreground/55">A quieter way to work through questions that deserve more than a quick answer.</p>
          </div>
          <div className="flex items-center gap-3 text-[10px] uppercase tracking-[0.16em] text-primary-foreground/45">
            <Command size={13} />
            <span>Built for the long question</span>
          </div>
        </div>
      </footer>
    </main>
  );
}

function Router() {
  return (
    // Keep a shared shell (sidebar, navbar) outside the boundary so it
    // survives a page crash.
    <RoutedErrorBoundary>
      <Switch>
        <Route path="/" component={Home} />
        <Route component={NotFound} />
      </Switch>
    </RoutedErrorBoundary>
  );
}

function RoutedErrorBoundary({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  return <ErrorBoundary resetKey={location}>{children}</ErrorBoundary>;
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
