import {
  ResearchProgressEventStage,
  type ResearchProgressEvent,
} from '@workspace/api-client-react';

export const STAGE_LABELS: Record<string, string> = {
  [ResearchProgressEventStage.understanding_question]: 'Understanding the question',
  [ResearchProgressEventStage.creating_plan]: 'Creating a research plan',
  [ResearchProgressEventStage.searching]: 'Searching the web',
  [ResearchProgressEventStage.classifying_sources]: 'Classifying sources',
  [ResearchProgressEventStage.reading_sources]: 'Reading sources',
  [ResearchProgressEventStage.extracting_evidence]: 'Extracting evidence',
  [ResearchProgressEventStage.analyzing_claims]: 'Analyzing claims',
  [ResearchProgressEventStage.synthesizing]: 'Writing the report',
  [ResearchProgressEventStage.completed]: 'Completed',
  [ResearchProgressEventStage.failed]: 'Stopped',
};

export function latestProgress(events: ResearchProgressEvent[]): ResearchProgressEvent | undefined {
  return events.at(-1);
}

export function stageLabel(stage: string): string {
  return STAGE_LABELS[stage] ?? stage.replaceAll('_', ' ');
}
