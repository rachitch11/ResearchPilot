import { type FormEvent, useId, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';

interface QuestionFormProps {
  disabled?: boolean;
  initialQuestion?: string;
  submitLabel?: string;
  onSubmit: (question: string) => void;
}

export function QuestionForm({
  disabled = false,
  initialQuestion = '',
  submitLabel = 'Start research',
  onSubmit,
}: QuestionFormProps) {
  const fieldId = useId();
  const [question, setQuestion] = useState(initialQuestion);
  const [localError, setLocalError] = useState('');

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmed = question.trim();
    if (trimmed.length < 5) {
      setLocalError('Enter a research question of at least 5 characters.');
      return;
    }
    setLocalError('');
    onSubmit(trimmed);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3" aria-busy={disabled}>
      <label htmlFor={fieldId} className="text-sm font-medium text-primary">
        Research question
      </label>
      <Textarea
        id={fieldId}
        value={question}
        disabled={disabled}
        onChange={(event) => setQuestion(event.target.value)}
        placeholder="Compare the EV markets of India, the United States, and Germany."
        rows={4}
        maxLength={2000}
        data-testid="input-research-question"
        className="resize-none"
      />
      {localError ? (
        <p role="alert" className="text-sm text-destructive" data-testid="error-question">
          {localError}
        </p>
      ) : (
        <p className="text-xs text-muted-foreground">Questions are sent to the ResearchPilot API. Provider keys stay on the server.</p>
      )}
      <Button type="submit" disabled={disabled} data-testid="button-submit-question">
        {disabled ? 'Research running…' : submitLabel}
      </Button>
    </form>
  );
}
