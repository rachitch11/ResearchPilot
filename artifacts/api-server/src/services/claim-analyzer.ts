import {
  AnalyzeClaimsResponse,
  type AnalyzeClaimsRequest,
  type ClaimAnalysis,
  type ClaimAgreement,
  type EvidenceItem,
  type ResearchClaim,
  type ResearchConflict,
} from "@workspace/api-zod";
import { config } from "../config";
import { generateJson } from "../lib/ai-json";
import { truncateText } from "../lib/text";
import type { AiProvider } from "../providers/ai";
import { getAiProvider } from "../providers";

const CONFLICT_TYPES = new Set([
  "contradiction",
  "date_difference",
  "definition_difference",
  "scope_difference",
  "methodology_difference",
]);

export class ClaimAnalyzerError extends Error {
  public constructor(message: string) {
    super(message);
    this.name = "ClaimAnalyzerError";
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

function supportFromEvidenceCount(count: number): ResearchClaim["support"] {
  if (count <= 0) {
    return "unsupported";
  }
  if (count === 1) {
    return "insufficient";
  }
  return "supported";
}

function buildPrompt(question: string, evidence: EvidenceItem[]): string {
  return [
    "You are the ResearchPilot claim analyst.",
    "Group the evidence into factual claims and identify conflicts.",
    "Do not invent claims, evidence IDs, or contradictions.",
    "Do not treat source type or quality as proof that a claim is correct.",
    "A contradiction requires two or more evidence items that cannot both be true.",
    "If values differ because of date, definition, geography, or methodology, use that conflict type instead of contradiction.",
    "Do not pick a winner for unresolved conflicts.",
    "Return only JSON:",
    JSON.stringify({
      claims: [
        {
          id: "c1",
          statement: "factual claim",
          evidenceIds: ["e1"],
          notes: "optional caveat",
        },
      ],
      conflicts: [
        {
          id: "x1",
          claimIds: ["c1"],
          evidenceIds: ["e1", "e2"],
          type: "contradiction",
          description: "why these cannot both be true",
        },
      ],
      agreement: [
        {
          claimIds: ["c1"],
          description: "what independent sources agree on",
        },
      ],
    }),
    "Use at most 16 claims and 12 conflicts.",
    "type must be one of contradiction, date_difference, definition_difference, scope_difference, methodology_difference.",
    "Research question:",
    `<question>${question}</question>`,
    "Evidence:",
    JSON.stringify(
      evidence.map((item) => ({
        id: item.id,
        claim: item.claim,
        passage: item.passage,
        sourceUrl: item.sourceUrl,
        sourceDomain: item.sourceDomain,
        publicationDate: item.publicationDate,
        subQuestionId: item.subQuestionId,
      })),
    ),
  ].join("\n");
}

function unique(values: string[]): string[] {
  return [...new Set(values.filter(Boolean))];
}

function validateAnalysis(
  raw: unknown,
  question: string,
  evidence: EvidenceItem[],
  provider: string,
  model: string,
): ClaimAnalysis {
  const evidenceById = new Map(evidence.map((item) => [item.id, item]));
  const rawClaims = isRecord(raw) && Array.isArray(raw.claims) ? raw.claims : [];
  const claims: ResearchClaim[] = [];

  for (const candidate of rawClaims) {
    if (!isRecord(candidate) || claims.length >= config.maxClaims) {
      continue;
    }

    const statement = truncateText(asString(candidate.statement), 400);
    const evidenceIds = unique(asStringArray(candidate.evidenceIds)).filter((id) =>
      evidenceById.has(id),
    );
    if (!statement) {
      continue;
    }

    const notes = truncateText(asString(candidate.notes), 300);
    claims.push({
      id: `c${claims.length + 1}`,
      statement,
      evidenceIds,
      support: supportFromEvidenceCount(evidenceIds.length),
      ...(notes ? { notes } : {}),
    });
  }

  const claimById = new Map(claims.map((claim) => [claim.id, claim]));
  const rawConflicts = isRecord(raw) && Array.isArray(raw.conflicts) ? raw.conflicts : [];
  const conflicts: ResearchConflict[] = [];

  for (const candidate of rawConflicts) {
    if (!isRecord(candidate) || conflicts.length >= 12) {
      continue;
    }

    const type = asString(candidate.type);
    if (!CONFLICT_TYPES.has(type)) {
      continue;
    }

    const evidenceIds = unique(asStringArray(candidate.evidenceIds)).filter((id) =>
      evidenceById.has(id),
    );
    const distinctSources = new Set(
      evidenceIds.map((id) => evidenceById.get(id)?.sourceUrl).filter(Boolean),
    );
    if (evidenceIds.length < 2 || distinctSources.size < 2) {
      continue;
    }

    const description = truncateText(asString(candidate.description), 400);
    if (!description) {
      continue;
    }

    conflicts.push({
      id: `x${conflicts.length + 1}`,
      claimIds: unique(asStringArray(candidate.claimIds)).filter((id) => claimById.has(id)),
      evidenceIds,
      type: type as ResearchConflict["type"],
      description,
      resolved: false,
    });
  }

  const rawAgreement = isRecord(raw) && Array.isArray(raw.agreement) ? raw.agreement : [];
  const agreement: ClaimAgreement[] = [];
  for (const candidate of rawAgreement) {
    if (!isRecord(candidate) || agreement.length >= 12) {
      continue;
    }
    const claimIds = unique(asStringArray(candidate.claimIds)).filter((id) => claimById.has(id));
    const description = truncateText(asString(candidate.description), 400);
    if (claimIds.length === 0 || !description) {
      continue;
    }
    agreement.push({ claimIds, description });
  }

  const unresolvedConflicts = conflicts.filter((conflict) => !conflict.resolved);

  return AnalyzeClaimsResponse.parse({
    question,
    claims,
    conflicts,
    agreement,
    unresolvedConflicts,
    provider,
    model,
  });
}

export async function analyzeClaims(
  input: AnalyzeClaimsRequest,
  provider?: AiProvider,
): Promise<ClaimAnalysis> {
  try {
    const result = await generateJson(
      buildPrompt(input.question, input.evidence),
      "The claim analyzer returned invalid JSON.",
      4096,
      provider ?? getAiProvider(),
    );
    return validateAnalysis(
      result.value,
      input.question,
      input.evidence,
      result.provider,
      result.model,
    );
  } catch (error) {
    if (error instanceof Error && error.message.includes("invalid JSON")) {
      throw new ClaimAnalyzerError(error.message);
    }
    throw error;
  }
}
