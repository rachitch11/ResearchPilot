import type { ResearchProgressEvent } from '@workspace/api-client-react';
import { Check, CircleDashed, X } from 'lucide-react';
import { stageLabel } from '@/lib/progress';

interface ProgressListProps {
  events: ResearchProgressEvent[];
  pending?: boolean;
}

export function ProgressList({ events, pending = false }: ProgressListProps) {
  if (pending && events.length === 0) {
    return (
      <div
        role="status"
        aria-live="polite"
        className="rounded-2xl border border-border bg-card p-5"
        data-testid="status-research-pending"
      >
        <p className="text-sm font-semibold text-primary">Research is running</p>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          Waiting for the backend pipeline. Stage markers appear only after the API returns them — they are not simulated here.
        </p>
      </div>
    );
  }

  if (events.length === 0) {
    return null;
  }

  return (
    <ol className="space-y-2" data-testid="list-research-progress" aria-label="Research progress">
      {events.map((event, index) => {
        const failed = event.status === 'failed';
        const done = event.status === 'completed';
        return (
          <li
            key={`${event.stage}-${event.status}-${index}`}
            className="flex items-start gap-3 rounded-xl border border-border bg-card px-4 py-3"
          >
            <span className="mt-0.5 text-secondary" aria-hidden="true">
              {failed ? <X size={16} /> : done ? <Check size={16} /> : <CircleDashed size={16} />}
            </span>
            <div>
              <p className="text-sm font-medium text-primary">{stageLabel(event.stage)}</p>
              <p className="text-xs capitalize text-muted-foreground">{event.status}</p>
              {event.detail ? (
                <p className="mt-1 text-sm text-muted-foreground">{event.detail}</p>
              ) : null}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
