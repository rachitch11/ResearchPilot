import {
  SynthesizeResearchResponse,
  type CitedStatement,
  type ClaimAnalysis,
  type EvidenceItem,
  type QuestionFindings,
  type ResearchCitation,
  type ResearchPlan,
  type ResearchSynthesis,
  type SynthesizeResearchRequest,
} from "@workspace/api-zod";
import { generateJson } from "../lib/ai-json";
import { truncateText } from "../lib/text";
import type { AiProvider } from "../providers/ai";
import { getAiProvider } from "../providers";

export class SynthesizerError extends Error {
  public constructor(message: string) {
    super(message);
    this.name = "SynthesizerError";
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function asString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function asStringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string").map((item) => item.trim())
    : [];
}

function citationsFromEvidence(evidence: EvidenceItem[]): ResearchCitation[] {
  return evidence.map((item, index) => ({
    id: `cite${index + 1}`,
    evidenceId: item.id,
    url: item.sourceUrl,
    title: item.sourceTitle,
    domain: item.sourceDomain,
  }));
}

function remapCitationIds(
  values: string[],
  citations: ResearchCitation[],
): string[] {
  const byCitationId = new Map(citations.map((item) => [item.id, item.id]));
  const byEvidenceId = new Map(citations.map((item) => [item.evidenceId, item.id]));
  const mapped = values
    .map((value) => byCitationId.get(value) ?? byEvidenceId.get(value))
    .filter((value): value is string => Boolean(value));
  return [...new Set(mapped)];
}

function sanitizeStatement(
  raw: unknown,
  citations: ResearchCitation[],
  fallbackKind: CitedStatement["kind"] = "interpretation",
): CitedStatement | undefined {
  if (!isRecord(raw)) {
    return undefined;
  }
  const text = truncateText(asString(raw.text), 600);
  if (!text) {
    return undefined;
  }
  const citationIds = remapCitationIds(asStringArray(raw.citationIds), citations);
  const kind = asString(raw.kind) === "fact" ? "fact" : fallbackKind;
  if (kind === "fact" && citationIds.length === 0) {
    return undefined;
  }
  return {
    text,
    citationIds,
    kind: citationIds.length === 0 ? "interpretation" : kind,
  };
}

function sanitizeStatementList(
  raw: unknown,
  citations: ResearchCitation[],
  maxItems: number,
): CitedStatement[] {
  if (!Array.isArray(raw)) {
    return [];
  }
  const items: CitedStatement[] = [];
  for (const candidate of raw) {
    if (items.length >= maxItems) {
      break;
    }
    const statement = sanitizeStatement(candidate, citations);
    if (statement) {
      items.push(statement);
    }
  }
  return items;
}

function buildPrompt(
  question: string,
  plan: ResearchPlan | undefined,
  evidence: EvidenceItem[],
  analysis: ClaimAnalysis,
  citations: ResearchCitation[],
): string {
  return [
    "You are the ResearchPilot synthesis engine.",
    "Write a structured research synthesis from the supplied evidence and claim analysis only.",
    "Do not fabricate sources, quotations, URLs, or citation IDs.",
    "Every factual statement must include citationIds drawn from the citation list.",
    "Mark interpretations as kind interpretation. Mark sourced facts as kind fact.",
    "Do not resolve unresolved conflicts by picking a winner.",
    "Return only JSON matching this shape:",
    JSON.stringify({
      executiveSummary: { text: "...", citationIds: ["cite1"], kind: "fact" },
      keyFindings: [{ text: "...", citationIds: ["cite1"], kind: "fact" }],
      findingsByQuestion: [
        {
          subQuestionId: "q1",
          question: "...",
          findings: [{ text: "...", citationIds: ["cite1"], kind: "fact" }],
        },
      ],
      supportingEvidenceIds: ["e1"],
      contradictingEvidenceIds: ["e2"],
      agreement: [{ text: "...", citationIds: ["cite1"], kind: "fact" }],
      unresolvedConflicts: [{ text: "...", citationIds: ["cite1", "cite2"], kind: "fact" }],
      evidenceGaps: ["what is missing"],
      limitations: ["coverage or recency limits"],
      conclusion: { text: "...", citationIds: ["cite1"], kind: "interpretation" },
    }),
    "Research question:",
    `<question>${question}</question>`,
    plan ? `Plan objective: ${plan.objective}` : "",
    "Citations:",
    JSON.stringify(citations),
    "Evidence:",
    JSON.stringify(
      evidence.map((item) => ({
        id: item.id,
        claim: item.claim,
        passage: item.passage,
        sourceUrl: item.sourceUrl,
        subQuestionId: item.subQuestionId,
      })),
    ),
    "Claim analysis:",
    JSON.stringify({
      claims: analysis.claims,
      conflicts: analysis.conflicts,
      agreement: analysis.agreement,
      unresolvedConflicts: analysis.unresolvedConflicts,
    }),
  ]
    .filter(Boolean)
    .join("\n");
}

function knownEvidenceIds(values: unknown, evidence: EvidenceItem[]): string[] {
  const allowed = new Set(evidence.map((item) => item.id));
  return [...new Set(asStringArray(values).filter((id) => allowed.has(id)))];
}

export function assertCitationsAreGrounded(
  synthesis: ResearchSynthesis,
  evidence: EvidenceItem[],
): void {
  const evidenceUrls = new Set(evidence.map((item) => item.sourceUrl));
  const evidenceIds = new Set(evidence.map((item) => item.id));
  for (const citation of synthesis.citations) {
    if (!evidenceIds.has(citation.evidenceId) || !evidenceUrls.has(citation.url)) {
      throw new SynthesizerError("Synthesis citations are not grounded in evidence.");
    }
  }
}

export async function synthesizeResearch(
  input: SynthesizeResearchRequest,
  provider?: AiProvider,
): Promise<ResearchSynthesis> {
  const citations = citationsFromEvidence(input.evidence);

  try {
    const result = await generateJson(
      buildPrompt(
        input.question,
        input.plan,
        input.evidence,
        input.analysis,
        citations,
      ),
      "The synthesizer returned invalid JSON.",
      6144,
      provider ?? getAiProvider(),
    );
    const raw = isRecord(result.value) ? result.value : {};
    const executiveSummary =
      sanitizeStatement(raw.executiveSummary, citations) ?? {
        text: "The available sources were insufficient to produce a sourced executive summary.",
        citationIds: [],
        kind: "interpretation" as const,
      };
    const findingsByQuestion: QuestionFindings[] = Array.isArray(raw.findingsByQuestion)
      ? raw.findingsByQuestion
          .filter(isRecord)
          .slice(0, 6)
          .map((item) => ({
            subQuestionId: asString(item.subQuestionId) || "unknown",
            question: truncateText(asString(item.question), 300) || input.question,
            findings: sanitizeStatementList(item.findings, citations, 6),
          }))
          .filter((item) => item.findings.length > 0)
      : [];

    const limitations = asStringArray(raw.limitations)
      .map((item) => truncateText(item, 240))
      .filter(Boolean)
      .slice(0, 8);
    if (executiveSummary.kind === "interpretation" && executiveSummary.citationIds.length === 0) {
      limitations.push("The executive summary is interpretive because no grounded citations remained.");
    }

    const synthesis = SynthesizeResearchResponse.parse({
      question: input.question,
      executiveSummary,
      keyFindings: sanitizeStatementList(raw.keyFindings, citations, 10),
      findingsByQuestion,
      supportingEvidenceIds: knownEvidenceIds(raw.supportingEvidenceIds, input.evidence),
      contradictingEvidenceIds: knownEvidenceIds(
        raw.contradictingEvidenceIds,
        input.evidence,
      ),
      agreement: sanitizeStatementList(raw.agreement, citations, 8),
      unresolvedConflicts: sanitizeStatementList(raw.unresolvedConflicts, citations, 8),
      evidenceGaps: asStringArray(raw.evidenceGaps)
        .map((item) => truncateText(item, 240))
        .filter(Boolean)
        .slice(0, 8),
      limitations,
      conclusion:
        sanitizeStatement(raw.conclusion, citations, "interpretation") ?? {
          text: "No sourced conclusion could be formed from the remaining evidence.",
          citationIds: [],
          kind: "interpretation",
        },
      citations,
      provider: result.provider,
      model: result.model,
    });
    assertCitationsAreGrounded(synthesis, input.evidence);
    return synthesis;
  } catch (error) {
    if (error instanceof SynthesizerError) {
      throw error;
    }
    if (error instanceof Error && error.message.includes("invalid JSON")) {
      throw new SynthesizerError(error.message);
    }
    throw error;
  }
}
