import assert from "node:assert/strict";
import { test } from "node:test";
import type { AiProvider, GenerateTextResult } from "../providers/ai";
import { extractEvidence } from "./evidence-extractor";

const SOURCE_TEXT =
  "The International Energy Agency reported that global electric car sales reached 14 million vehicles in 2023, accounting for 18 percent of all cars sold worldwide.";

const subQuestions = [
  {
    id: "q1",
    question: "How large is the global EV market?",
    rationale: "Need a sourced sales figure.",
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

test("skips empty and tiny sources without calling the model", async () => {
  let called = 0;
  const provider: AiProvider = {
    name: "mock",
    model: "mock-model",
    async generateText() {
      called += 1;
      return { text: "{}", provider: "mock", model: "mock-model" };
    },
  };

  const result = await extractEvidence(
    {
      question: "How large is the global EV market today?",
      subQuestions,
      sources: [
        {
          url: "https://example.com/empty",
          title: "Empty",
          domain: "example.com",
          cleanText: "   ",
        },
      ],
    },
    provider,
  );

  assert.equal(called, 0);
  assert.equal(result.items.length, 0);
  assert.equal(result.skippedSources.length, 1);
});

test("keeps exact passages and drops invented quotations", async () => {
  const result = await extractEvidence(
    {
      question: "How large is the global EV market today?",
      subQuestions,
      sources: [
        {
          url: "https://www.iea.org/reports/global-ev-outlook",
          title: "Global EV Outlook",
          domain: "iea.org",
          publicationDate: "2024-04-01",
          sourceType: "International Organization",
          cleanText: SOURCE_TEXT,
        },
      ],
    },
    mockProvider(
      JSON.stringify({
        items: [
          {
            sourceUrl: "https://www.iea.org/reports/global-ev-outlook",
            subQuestionId: "q1",
            claim: "Global EV sales reached 14 million in 2023.",
            passage:
              "global electric car sales reached 14 million vehicles in 2023, accounting for 18 percent of all cars sold worldwide.",
            summary: "IEA reported 14 million EV sales in 2023.",
            confidence: "high",
          },
          {
            sourceUrl: "https://www.iea.org/reports/global-ev-outlook",
            subQuestionId: "q1",
            claim: "Global EV sales reached 90 million.",
            passage: "Global EV sales reached 90 million vehicles in 2023 according to nobody.",
            summary: "Invented figure",
            confidence: "high",
          },
        ],
      }),
    ),
  );

  assert.equal(result.items.length, 1);
  assert.equal(result.items[0].sourceUrl, "https://www.iea.org/reports/global-ev-outlook");
  assert.match(result.items[0].passage, /14 million vehicles in 2023/);
  assert.equal(result.items[0].claim.includes("14 million"), true);
});

test("rejects malformed JSON and unknown source URLs", async () => {
  await assert.rejects(
    () =>
      extractEvidence(
        {
          question: "How large is the global EV market today?",
          subQuestions,
          sources: [
            {
              url: "https://www.iea.org/reports/global-ev-outlook",
              title: "Global EV Outlook",
              domain: "iea.org",
              cleanText: SOURCE_TEXT,
            },
          ],
        },
        mockProvider("not-json"),
      ),
    /invalid JSON/,
  );

  const result = await extractEvidence(
    {
      question: "How large is the global EV market today?",
      subQuestions,
      sources: [
        {
          url: "https://www.iea.org/reports/global-ev-outlook",
          title: "Global EV Outlook",
          domain: "iea.org",
          cleanText: SOURCE_TEXT,
        },
      ],
    },
    mockProvider(
      JSON.stringify({
        items: [
          {
            sourceUrl: "https://invented.example/not-in-input",
            subQuestionId: "q1",
            claim: "A claim",
            passage: SOURCE_TEXT.slice(20, 120),
            summary: "summary",
            confidence: "high",
          },
        ],
      }),
    ),
  );
  assert.equal(result.items.length, 0);
});
