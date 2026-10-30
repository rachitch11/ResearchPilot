import assert from "node:assert/strict";
import { test } from "node:test";
import type { AiProvider, GenerateTextResult } from "../providers/ai";
import type { EvidenceItem } from "@workspace/api-zod";
import { analyzeClaims } from "./claim-analyzer";

const evidence: EvidenceItem[] = [
  {
    id: "e1",
    claim: "Global EV sales were 14 million in 2023.",
    passage:
      "The agency reported that global electric car sales reached 14 million vehicles in 2023.",
    summary: "IEA 14 million figure",
    sourceUrl: "https://www.iea.org/reports/global-ev-outlook",
    sourceTitle: "Global EV Outlook",
    sourceDomain: "iea.org",
    publicationDate: "2024-04-01",
    subQuestionId: "q1",
    confidence: "high",
  },
  {
    id: "e2",
    claim: "Global EV sales were 10 million in 2023.",
    passage:
      "A market note said global electric car sales were about 10 million vehicles in 2023.",
    summary: "Blog 10 million figure",
    sourceUrl: "https://blog.example.com/ev-sales",
    sourceTitle: "EV sales note",
    sourceDomain: "blog.example.com",
    subQuestionId: "q1",
    confidence: "medium",
  },
];

function mockProvider(text: string): AiProvider {
  return {
    name: "mock",
    model: "mock-model",
    async generateText(): Promise<GenerateTextResult> {
      return { text, provider: "mock", model: "mock-model" };
    },
  };
}

test("keeps contradictions that cite two sources and does not pick a winner", async () => {
  const result = await analyzeClaims(
    { question: "How large is the global EV market today?", evidence },
    mockProvider(
      JSON.stringify({
        claims: [
          {
            id: "ignored",
            statement: "Global EV sales in 2023 were either 14 million or 10 million.",
            evidenceIds: ["e1", "e2"],
          },
        ],
        conflicts: [
          {
            evidenceIds: ["e1", "e2"],
            claimIds: ["ignored"],
            type: "contradiction",
            description: "The two sources report different 2023 global EV sales totals.",
          },
        ],
        agreement: [],
      }),
    ),
  );

  assert.equal(result.claims[0].support, "supported");
  assert.equal(result.conflicts.length, 1);
  assert.equal(result.conflicts[0].resolved, false);
  assert.equal(result.unresolvedConflicts.length, 1);
});

test("drops invented single-source contradictions and dates methodology differences", async () => {
  const result = await analyzeClaims(
    { question: "How large is the global EV market today?", evidence },
    mockProvider(
      JSON.stringify({
        claims: [
          {
            statement: "IEA reported 14 million EV sales.",
            evidenceIds: ["e1"],
          },
        ],
        conflicts: [
          {
            evidenceIds: ["e1"],
            type: "contradiction",
            description: "Invented conflict from one source.",
          },
          {
            evidenceIds: ["e1", "e2"],
            type: "date_difference",
            description: "The figures may refer to different reporting windows.",
          },
        ],
        agreement: [{ claimIds: ["c1"], description: "Both discuss 2023 sales." }],
      }),
    ),
  );

  assert.equal(result.claims[0].support, "insufficient");
  assert.equal(result.conflicts.every((conflict) => conflict.type !== "contradiction" || conflict.evidenceIds.length > 1), true);
  assert.equal(result.conflicts.some((conflict) => conflict.type === "date_difference"), true);
});

test("marks claims with no remaining evidence as unsupported", async () => {
  const result = await analyzeClaims(
    { question: "How large is the global EV market today?", evidence },
    mockProvider(
      JSON.stringify({
        claims: [
          {
            statement: "An unsourced market share number.",
            evidenceIds: ["missing"],
          },
        ],
        conflicts: [],
        agreement: [],
      }),
    ),
  );

  assert.equal(result.claims[0].support, "unsupported");
  assert.deepEqual(result.claims[0].evidenceIds, []);
});
