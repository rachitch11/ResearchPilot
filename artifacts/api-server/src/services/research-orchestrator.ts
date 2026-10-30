import type {
  ClaimAnalysis,
  EvidenceExtraction,
  ResearchPlan,
  ResearchProgressEvent,
  ResearchRun,
  ResearchSourceRecord,
  ResearchStageError,
  ResearchSynthesis,
} from "@workspace/api-zod";
import { RunResearchResponse } from "@workspace/api-zod";
import { config } from "../config";
import { mapWithConcurrency } from "../lib/text";
import { classifySources } from "./source-classifier";
import { extractEvidence } from "./evidence-extractor";
import { analyzeClaims } from "./claim-analyzer";
import { createResearchPlan } from "./research-planner";
import { searchWeb } from "./search-service";
import { synthesizeResearch } from "./synthesizer";
import { WebpageReaderError, readWebpage } from "./webpage-reader";
import { createResearchId, saveResearchRun } from "./research-store";

export class ResearchOrchestratorError extends Error {
  public constructor(message: string) {
    super(message);
    this.name = "ResearchOrchestratorError";
  }
}

export interface ResearchOrchestratorDependencies {
  createPlan?: typeof createResearchPlan;
  search?: typeof searchWeb;
  classify?: typeof classifySources;
  readPage?: typeof readWebpage;
  extract?: typeof extractEvidence;
  analyze?: typeof analyzeClaims;
  synthesize?: typeof synthesizeResearch;
  now?: () => number;
  createId?: () => string;
}

function addProgress(
  progress: ResearchProgressEvent[],
  stage: ResearchProgressEvent["stage"],
  status: ResearchProgressEvent["status"],
  detail?: string,
): void {
  progress.push({
    stage,
    status,
    ...(detail ? { detail } : {}),
  });
}

function ensureTime(deadline: number, now: () => number): void {
  if (now() >= deadline) {
    throw new ResearchOrchestratorError("The research run exceeded the configured time limit.");
  }
}

export async function runResearch(
  question: string,
  dependencies: ResearchOrchestratorDependencies = {},
): Promise<ResearchRun> {
  const startedAt = (dependencies.now ?? Date.now)();
  const now = dependencies.now ?? Date.now;
  const deadline = startedAt + config.maxResearchTimeSeconds * 1000;
  const researchId = (dependencies.createId ?? createResearchId)();
  const progress: ResearchProgressEvent[] = [];
  const errors: ResearchStageError[] = [];
  const sources: ResearchSourceRecord[] = [];
  let aiCalls = 0;
  let plan: ResearchPlan | undefined;
  let evidence: EvidenceExtraction | undefined;
  let analysis: ClaimAnalysis | undefined;
  let synthesis: ResearchSynthesis | undefined;
  let status: ResearchRun["status"] = "failed";

  const createPlan = dependencies.createPlan ?? createResearchPlan;
  const search = dependencies.search ?? searchWeb;
  const classify = dependencies.classify ?? classifySources;
  const readPage = dependencies.readPage ?? readWebpage;
  const extract = dependencies.extract ?? extractEvidence;
  const analyze = dependencies.analyze ?? analyzeClaims;
  const synthesize = dependencies.synthesize ?? synthesizeResearch;

  addProgress(progress, "understanding_question", "completed");

  try {
    ensureTime(deadline, now);
    addProgress(progress, "creating_plan", "started");
    plan = (await createPlan(question)) as ResearchPlan;
    aiCalls += 1;
    addProgress(progress, "creating_plan", "completed", `Created ${plan.subQuestions.length} sub-questions.`);

    ensureTime(deadline, now);
    addProgress(progress, "searching", "started");
    const searchResult = await search(
      plan.searchQueries.slice(0, config.maxSearchesPerResearch),
      config.maxResultsPerQuery,
    );
    addProgress(
      progress,
      "searching",
      "completed",
      `Collected ${searchResult.deduplicatedResults} unique sources.`,
    );

    if (searchResult.results.length === 0) {
      throw new ResearchOrchestratorError("Search returned no usable sources.");
    }

    ensureTime(deadline, now);
    addProgress(progress, "classifying_sources", "started");
    const classified = classify(
      searchResult.results.slice(0, config.maxSourcesPerResearch).map((result) => ({
        url: result.url,
        title: result.title,
      })),
    );
    addProgress(progress, "classifying_sources", "completed");

    ensureTime(deadline, now);
    addProgress(progress, "reading_sources", "started");
    const documents = await mapWithConcurrency(
      classified,
      config.researchConcurrency,
      async (source) => {
        try {
          const document = await readPage(source.url);
          sources.push({
            url: source.url,
            title: source.title ?? document.title,
            domain: source.domain,
            sourceType: source.sourceType,
            quality: source.quality,
            readStatus: "read",
          });
          return document;
        } catch (error) {
          const message =
            error instanceof WebpageReaderError
              ? error.message
              : "The webpage could not be retrieved.";
          sources.push({
            url: source.url,
            ...(source.title ? { title: source.title } : {}),
            domain: source.domain,
            sourceType: source.sourceType,
            quality: source.quality,
            readStatus: "failed",
            error: message,
          });
          errors.push({ stage: "reading_sources", message });
          return undefined;
        }
      },
    );
    const readableDocuments = documents.filter(
      (document): document is NonNullable<typeof document> => Boolean(document),
    );
    addProgress(
      progress,
      "reading_sources",
      readableDocuments.length > 0 ? "completed" : "failed",
      `Read ${readableDocuments.length} of ${classified.length} sources.`,
    );

    if (readableDocuments.length === 0) {
      throw new ResearchOrchestratorError("No sources could be read.");
    }

    ensureTime(deadline, now);
    addProgress(progress, "extracting_evidence", "started");
    evidence = await extract({
      question,
      subQuestions: plan.subQuestions,
      sources: readableDocuments.map((document) => {
        const classification = classified.find((item) => item.url === document.url);
        return {
          url: document.url,
          title: document.title,
          domain: document.domain,
          ...(document.publicationDate ? { publicationDate: document.publicationDate } : {}),
          ...(classification ? { sourceType: classification.sourceType } : {}),
          cleanText: document.cleanText.slice(0, 20_000),
        };
      }),
    });
    aiCalls += 1;
    addProgress(
      progress,
      "extracting_evidence",
      evidence.items.length > 0 ? "completed" : "failed",
      `Extracted ${evidence.items.length} evidence items.`,
    );

    if (evidence.items.length === 0) {
      throw new ResearchOrchestratorError("No sourced evidence could be extracted.");
    }

    ensureTime(deadline, now);
    addProgress(progress, "analyzing_claims", "started");
    analysis = await analyze({
      question,
      evidence: evidence.items,
    });
    aiCalls += 1;
    addProgress(
      progress,
      "analyzing_claims",
      "completed",
      `Identified ${analysis.claims.length} claims and ${analysis.unresolvedConflicts.length} unresolved conflicts.`,
    );

    ensureTime(deadline, now);
    addProgress(progress, "synthesizing", "started");
    synthesis = await synthesize({
      question,
      plan,
      evidence: evidence.items,
      analysis,
    });
    aiCalls += 1;
    addProgress(progress, "synthesizing", "completed");

    status =
      errors.length > 0 || evidence.skippedSources.length > 0
        ? "completed_with_partial_results"
        : "completed";
    addProgress(progress, "completed", "completed");
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "The research run failed.";
    errors.push({
      stage: progress.at(-1)?.stage ?? "failed",
      message,
    });
    addProgress(progress, "failed", "failed", "The research run stopped before a full report was ready.");
    status = synthesis ? "completed_with_partial_results" : "failed";
  }

  const run = RunResearchResponse.parse({
    researchId,
    status,
    question,
    progress,
    ...(plan ? { plan } : {}),
    sources,
    ...(evidence ? { evidence } : {}),
    ...(analysis ? { analysis } : {}),
    ...(synthesis ? { synthesis } : {}),
    errors,
    metadata: {
      durationMs: Math.max(0, now() - startedAt),
      aiCalls,
      sourcesAttempted: sources.length,
      sourcesRead: sources.filter((source) => source.readStatus === "read").length,
      evidenceCount: evidence?.items.length ?? 0,
      provider: plan?.provider ?? "none",
      model: plan?.model ?? "none",
    },
  });
  saveResearchRun(run);
  return run;
}
