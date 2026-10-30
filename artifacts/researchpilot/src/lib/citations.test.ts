import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { ResearchRun } from '@workspace/api-client-react';
import { groundedCitation } from './citations';

const run = {
  researchId: 'rp_test',
  status: 'completed',
  question: 'Example?',
  progress: [],
  sources: [
    {
      url: 'https://www.iea.org/reports/global-ev-outlook',
      domain: 'iea.org',
      sourceType: 'International Organization',
      quality: 'High',
      readStatus: 'read',
    },
  ],
  evidence: {
    question: 'Example?',
    items: [
      {
        id: 'e1',
        claim: '14 million',
        passage: 'global electric car sales reached 14 million vehicles in 2023 worldwide.',
        summary: 'IEA figure',
        sourceUrl: 'https://www.iea.org/reports/global-ev-outlook',
        sourceTitle: 'Global EV Outlook',
        sourceDomain: 'iea.org',
        subQuestionId: 'q1',
        confidence: 'high',
      },
    ],
    skippedSources: [],
    provider: 'mock',
    model: 'mock',
  },
  synthesis: {
    question: 'Example?',
    executiveSummary: { text: 'Summary', citationIds: ['cite1'], kind: 'fact' },
    keyFindings: [],
    findingsByQuestion: [],
    supportingEvidenceIds: ['e1'],
    contradictingEvidenceIds: [],
    agreement: [],
    unresolvedConflicts: [],
    evidenceGaps: [],
    limitations: [],
    conclusion: { text: 'Conclusion', citationIds: ['cite1'], kind: 'interpretation' },
    citations: [
      {
        id: 'cite1',
        evidenceId: 'e1',
        url: 'https://www.iea.org/reports/global-ev-outlook',
        title: 'Global EV Outlook',
        domain: 'iea.org',
      },
      {
        id: 'cite-fake',
        evidenceId: 'e1',
        url: 'https://invented.example/not-real',
        title: 'Invented',
        domain: 'invented.example',
      },
    ],
    provider: 'mock',
    model: 'mock',
  },
  errors: [],
  metadata: {
    durationMs: 1,
    aiCalls: 0,
    sourcesAttempted: 1,
    sourcesRead: 1,
    evidenceCount: 1,
    provider: 'mock',
    model: 'mock',
  },
} as ResearchRun;

test('accepts citations that match collected sources', () => {
  assert.equal(
    groundedCitation(run, 'cite1')?.url,
    'https://www.iea.org/reports/global-ev-outlook',
  );
});

test('rejects citations that were not collected', () => {
  assert.equal(groundedCitation(run, 'cite-fake'), undefined);
});
