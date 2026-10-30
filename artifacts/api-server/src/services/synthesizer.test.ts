import assert from "node:assert/strict";
import { test } from "node:test";
import type { AiProvider, GenerateTextResult } from "../providers/ai";
import type { ClaimAnalysis, EvidenceItem } from "@workspace/api-zod";
import { synthesizeResearch } from "./synthesizer";

const evidence: EvidenceItem[] = [
  {
    id: "e1",
    claim: "Global EV sales reached 14 million in 2023.",
    passage:
      "The agency reported that global electric car sales reached 14 million vehicles in 2023.",
    summary: "IEA 14 million figure",
    sourceUrl: "https://www.iea.org/reports/global-ev-outlook",
    sourceTitle: "Global EV Outlook",
    sourceDomain: "iea.org",
    subQuestionId: "q1",
    confidence: "high",
  },
];

const analysis: ClaimAnalysis = {
  question: "How large is the global EV market today?",
  claims: [
    {
      id: "c1",
      statement: "Global EV sales reached 14 million in 2023.",
      evidenceIds: ["e1"],
      support: "insufficient",
    },
  ],
  conflicts: [],
  agreement: [],
  unresolvedConflicts: [],
  provider: "mock",
  model: "mock-model",
};

function mockProvider(text: string): AiProvider {
  return {
    name: "mock",
    model: "mock-model",
    async generateText(): Promise<GenerateTextResult> {
      return { text, provider: "mock", model: "mock-model" };
    },
  };
}

test("replaces model citations with grounded evidence citations", async () => {
  const result = await synthesizeResearch(
    {
      question: "How large is the global EV market today?",
      evidence,
      analysis,
    },
    mockProvider(
      JSON.stringify({
        executiveSummary: {
          text: "IEA reported 14 million global EV sales in 2023.",
          citationIds: ["e1"],
          kind: "fact",
        },
        keyFindings: [
          {
            text: "A fake statistic with a fake URL.",
            citationIds: ["https://totally-fake.example/report"],
            kind: "fact",
          },
          {
            text: "Global EV sales reached 14 million vehicles in 2023.",
            citationIds: ["cite1"],
            kind: "fact",
          },
        ],
        findingsByQuestion: [
          {
            subQuestionId: "q1",
            question: "How large is the global EV market?",
            findings: [
              {
                text: "Sales reached 14 million in 2023.",
                citationIds: ["e1"],
                kind: "fact",
              },
            ],
          },
        ],
        supportingEvidenceIds: ["e1", "e99"],
        contradictingEvidenceIds: ["e99"],
        agreement: [],
        unresolvedConflicts: [],
        evidenceGaps: ["Country-level totals are not in the supplied evidence."],
        limitations: ["Only one source was available."],
        conclusion: {
          text: "The supplied evidence supports a 14 million 2023 sales figure, with limited corroboration.",
          citationIds: ["cite1"],
          kind: "interpretation",
        },
        citations: [
          {
            id: "bogus",
            evidenceId: "e1",
            url: "https://invented.example/not-real",
            title: "Invented",
            domain: "invented.example",
          },
        ],
      }),
    ),
  );

  assert.equal(result.citations.length, 1);
  assert.equal(result.citations[0].url, "https://www.iea.org/reports/global-ev-outlook");
  assert.equal(result.citations.some((item) => item.url.includes("invented")), false);
  assert.equal(result.keyFindings.length, 1);
  assert.deepEqual(result.keyFindings[0].citationIds, ["cite1"]);
  assert.deepEqual(result.supportingEvidenceIds, ["e1"]);
  assert.deepEqual(result.contradictingEvidenceIds, []);
  assert.equal(result.executiveSummary.kind, "fact");
});

test("drops uncited factual statements", async () => {
  const result = await synthesizeResearch(
    {
      question: "How large is the global EV market today?",
      evidence,
      analysis,
    },
    mockProvider(
      JSON.stringify({
        executiveSummary: {
          text: "An unsourced sweeping claim about the market.",
          citationIds: [],
          kind: "fact",
        },
        keyFindings: [
          {
            text: "Another unsourced fact.",
            citationIds: [],
            kind: "fact",
          },
        ],
        findingsByQuestion: [],
        supportingEvidenceIds: [],
        contradictingEvidenceIds: [],
        agreement: [],
        unresolvedConflicts: [],
        evidenceGaps: [],
        limitations: [],
        conclusion: { text: "Tentative.", citationIds: [], kind: "interpretation" },
      }),
    ),
  );

  assert.equal(result.executiveSummary.kind, "interpretation");
  assert.equal(result.keyFindings.length, 0);
  assert.equal(
    result.limitations.some((item) => item.includes("interpretive")),
    true,
  );
});
