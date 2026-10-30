import {
  ExtractEvidenceResponse,
  type EvidenceExtraction,
  type EvidenceItem,
  type EvidenceSourceInput,
  type ExtractEvidenceRequest,
  type ResearchSubQuestion,
  type SkippedSource,
} from "@workspace/api-zod";
import { config } from "../config";
import { generateJson } from "../lib/ai-json";
import { clipPassage, passageOccursInSource, truncateText } from "../lib/text";
import type { AiProvider } from "../providers/ai";
import { getAiProvider } from "../providers";

const CONFIDENCE = new Set(["high", "medium", "low"]);

export class EvidenceExtractorError extends Error {
  public constructor(message: string) {
    super(message);
    this.name = "EvidenceExtractorError";
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function asString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function prepareSources(sources: EvidenceSourceInput[]): {
  usable: EvidenceSourceInput[];
  skipped: SkippedSource[];
} {
  const skipped: SkippedSource[] = [];
  const usable: EvidenceSourceInput[] = [];

  for (const source of sources) {
    const cleanText = truncateText(source.cleanText, config.maxSourceCharsForAi);
    if (cleanText.length < 40) {
      skipped.push({
        url: source.url,
        reason: "The source text was empty, irrelevant, or too short to extract evidence.",
      });
      continue;
    }

    usable.push({
      ...source,
      title: source.title.trim().slice(0, 500),
      domain: source.domain.trim().slice(0, 255),
      cleanText,
    });
  }

  return { usable, skipped };
}

function buildPrompt(
  question: string,
  subQuestions: ResearchSubQuestion[],
  sources: EvidenceSourceInput[],
): string {
  return [
    "You are the ResearchPilot evidence extractor.",
    "Extract only factual evidence that is explicitly present in the source passages.",
    "Do not invent facts, URLs, titles, or quotations.",
    "passage must be an exact contiguous excerpt copied from the source text.",
    "summary may paraphrase; claim is a concise factual statement supported by the passage.",
    "If a source is irrelevant, omit it.",
    "Return only JSON:",
    JSON.stringify({
      items: [
        {
          sourceUrl: "https://example.com/page",
          subQuestionId: "q1",
          claim: "concise factual claim",
          passage: "exact excerpt from the source",
          summary: "short paraphrase of the excerpt",
          confidence: "high",
        },
      ],
    }),
    "Use at most 3 items per source and at most 20 items total.",
    "confidence must be high, medium, or low.",
    "subQuestionId must match one of the provided ids.",
    "Research question:",
    `<question>${question}</question>`,
    "Sub-questions:",
    JSON.stringify(subQuestions.map(({ id, question: text }) => ({ id, question: text }))),
    "Sources:",
    JSON.stringify(
      sources.map((source) => ({
        url: source.url,
        title: source.title,
        domain: source.domain,
        publicationDate: source.publicationDate,
        sourceType: source.sourceType,
        text: source.cleanText,
      })),
    ),
  ].join("\n");
}

function validateItems(
  raw: unknown,
  question: string,
  subQuestions: ResearchSubQuestion[],
  sources: EvidenceSourceInput[],
  skipped: SkippedSource[],
  provider: string,
  model: string,
): EvidenceExtraction {
  const sourceByUrl = new Map(sources.map((source) => [source.url, source]));
  const subQuestionIds = new Set(subQuestions.map((item) => item.id));
  const items: EvidenceItem[] = [];
  const seen = new Set<string>();

  const rawItems = isRecord(raw) && Array.isArray(raw.items) ? raw.items : [];

  for (const candidate of rawItems) {
    if (!isRecord(candidate) || items.length >= config.maxEvidenceItems) {
      continue;
    }

    const sourceUrl = asString(candidate.sourceUrl);
    const source = sourceByUrl.get(sourceUrl);
    if (!source) {
      continue;
    }

    const passage = clipPassage(asString(candidate.passage));
    if (!passageOccursInSource(passage, source.cleanText)) {
      continue;
    }

    const subQuestionId = asString(candidate.subQuestionId);
    if (!subQuestionIds.has(subQuestionId)) {
      continue;
    }

    const claim = truncateText(asString(candidate.claim), 400);
    const summary = truncateText(asString(candidate.summary), 400);
    const confidence = asString(candidate.confidence);
    if (!claim || !summary || !CONFIDENCE.has(confidence)) {
      continue;
    }

    const fingerprint = `${sourceUrl}|${passage}`;
    if (seen.has(fingerprint)) {
      continue;
    }
    seen.add(fingerprint);

    items.push({
      id: `e${items.length + 1}`,
      claim,
      passage,
      summary,
      sourceUrl,
      sourceTitle: source.title,
      sourceDomain: source.domain,
      ...(source.publicationDate ? { publicationDate: source.publicationDate } : {}),
      ...(source.sourceType ? { sourceType: source.sourceType } : {}),
      subQuestionId,
      confidence: confidence as EvidenceItem["confidence"],
    });
  }

  return ExtractEvidenceResponse.parse({
    question,
    items,
    skippedSources: skipped,
    provider,
    model,
  });
}

export async function extractEvidence(
  input: ExtractEvidenceRequest,
  provider?: AiProvider,
): Promise<EvidenceExtraction> {
  const { usable, skipped } = prepareSources(input.sources);
  if (usable.length === 0) {
    return ExtractEvidenceResponse.parse({
      question: input.question,
      items: [],
      skippedSources: skipped,
      provider: provider?.name ?? "none",
      model: provider?.model ?? "none",
    });
  }

  try {
    const result = await generateJson(
      buildPrompt(input.question, input.subQuestions, usable),
      "The evidence extractor returned invalid JSON.",
      4096,
      provider ?? getAiProvider(),
    );
    return validateItems(
      result.value,
      input.question,
      input.subQuestions,
      usable,
      skipped,
      result.provider,
      result.model,
    );
  } catch (error) {
    if (error instanceof EvidenceExtractorError) {
      throw error;
    }
    if (error instanceof Error && error.message.includes("invalid JSON")) {
      throw new EvidenceExtractorError(error.message);
    }
    throw error;
  }
}
