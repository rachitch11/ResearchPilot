import assert from "node:assert/strict";
import { test } from "node:test";
import type { ClaimAnalysis, EvidenceExtraction, ResearchPlan, ResearchSynthesis } from "@workspace/api-zod";
import { WebpageReaderError } from "./webpage-reader";
import { runResearch } from "./research-orchestrator";
import { getResearchRun } from "./research-store";

const plan: ResearchPlan = {
  question: "How large is the global EV market today?",
  objective: "Establish sourced 2023 global EV sales figures.",
  subQuestions: [
    { id: "q1", question: "What were 2023 global EV sales?", rationale: "Need a headline figure." },
    { id: "q2", question: "Which sources publish official totals?", rationale: "Need source quality." },
  ],
  searchQueries: [
    { query: "IEA global EV sales 2023", purpose: "Official totals" },
    { query: "global electric car sales 2023", purpose: "Corroboration" },
    { query: "EV market share 2023 IEA", purpose: "Share context" },
  ],
  constraints: ["Prefer 2023 calendar-year figures"],
  assumptions: ["Sales means vehicles sold, not stock"],
  provider: "mock",
  model: "mock-model",
};

const evidence: EvidenceExtraction = {
  question: plan.question,
  items: [
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
  ],
  skippedSources: [],
  provider: "mock",
  model: "mock-model",
};

const analysis: ClaimAnalysis = {
  question: plan.question,
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

const synthesis: ResearchSynthesis = {
  question: plan.question,
  executiveSummary: {
    text: "IEA reported 14 million global EV sales in 2023.",
    citationIds: ["cite1"],
    kind: "fact",
  },
  keyFindings: [
    {
      text: "Global EV sales reached 14 million vehicles in 2023.",
      citationIds: ["cite1"],
      kind: "fact",
    },
  ],
  findingsByQuestion: [],
  supportingEvidenceIds: ["e1"],
  contradictingEvidenceIds: [],
  agreement: [],
  unresolvedConflicts: [],
  evidenceGaps: ["Limited corroboration"],
  limitations: ["One readable source"],
  conclusion: {
    text: "The sourced figure is 14 million, with limited independent confirmation.",
    citationIds: ["cite1"],
    kind: "interpretation",
  },
  citations: [
    {
      id: "cite1",
      evidenceId: "e1",
      url: "https://www.iea.org/reports/global-ev-outlook",
      title: "Global EV Outlook",
      domain: "iea.org",
    },
  ],
  provider: "mock",
  model: "mock-model",
};

test("runs the full mocked research pipeline and stores the result", async () => {
  const run = await runResearch(plan.question, {
    createId: () => "rp_testrun01",
    now: () => 1_000,
    createPlan: async () => plan,
    search: async () => ({
      provider: "mock-search",
      queries: plan.searchQueries,
      results: [
        {
          title: "Global EV Outlook",
          url: "https://www.iea.org/reports/global-ev-outlook",
          snippet: "14 million",
          domain: "iea.org",
          sourceQuery: "IEA global EV sales 2023",
        },
        {
          title: "Blocked page",
          url: "https://blocked.example/ev",
          snippet: "no text",
          domain: "blocked.example",
          sourceQuery: "global electric car sales 2023",
        },
      ],
      totalResults: 2,
      deduplicatedResults: 2,
    }),
    classify: (inputs) =>
      inputs.map((input) => ({
        url: input.url,
        domain: new URL(input.url).hostname.replace(/^www\./, ""),
        title: input.title,
        sourceType: input.url.includes("iea") ? "International Organization" : "Unknown",
        quality: input.url.includes("iea") ? "High" : "Unknown",
        signals: ["test"],
      })),
    readPage: async (url) => {
      if (url.includes("blocked")) {
        throw new WebpageReaderError("blocked", "request_failed");
      }
      return {
        title: "Global EV Outlook",
        url,
        domain: "iea.org",
        cleanText:
          "The agency reported that global electric car sales reached 14 million vehicles in 2023.",
      };
    },
    extract: async () => evidence,
    analyze: async () => analysis,
    synthesize: async () => synthesis,
  });

  assert.equal(run.status, "completed_with_partial_results");
  assert.equal(run.synthesis?.citations[0].url, "https://www.iea.org/reports/global-ev-outlook");
  assert.equal(run.metadata.sourcesRead, 1);
  assert.equal(run.metadata.aiCalls, 4);
  assert.equal(getResearchRun("rp_testrun01")?.researchId, "rp_testrun01");
  assert.equal(
    run.progress.some((event) => event.stage === "completed" && event.status === "completed"),
    true,
  );
});

test("returns a failed run when every source read fails", async () => {
  const run = await runResearch(plan.question, {
    createId: () => "rp_testfail1",
    now: () => 1_000,
    createPlan: async () => plan,
    search: async () => ({
      provider: "mock-search",
      queries: plan.searchQueries,
      results: [
        {
          title: "Blocked",
          url: "https://blocked.example/ev",
          snippet: "no",
          domain: "blocked.example",
          sourceQuery: "IEA global EV sales 2023",
        },
      ],
      totalResults: 1,
      deduplicatedResults: 1,
    }),
    classify: (inputs) =>
      inputs.map((input) => ({
        url: input.url,
        domain: "blocked.example",
        sourceType: "Unknown",
        quality: "Unknown",
        signals: [],
      })),
    readPage: async () => {
      throw new WebpageReaderError("blocked", "request_failed");
    },
    extract: async () => {
      throw new Error("should not extract");
    },
    analyze: async () => {
      throw new Error("should not analyze");
    },
    synthesize: async () => {
      throw new Error("should not synthesize");
    },
  });

  assert.equal(run.status, "failed");
  assert.equal(run.synthesis, undefined);
  assert.equal(run.errors.length > 0, true);
});
