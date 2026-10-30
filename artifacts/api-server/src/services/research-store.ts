import type { ResearchRun } from "@workspace/api-zod";
import { randomBytes } from "node:crypto";

const MAX_RUNS = 50;
const runs = new Map<string, ResearchRun>();

export function createResearchId(): string {
  return `rp_${randomBytes(8).toString("hex")}`;
}

export function saveResearchRun(run: ResearchRun): void {
  runs.set(run.researchId, run);
  if (runs.size > MAX_RUNS) {
    const oldest = runs.keys().next().value;
    if (oldest) {
      runs.delete(oldest);
    }
  }
}

export function getResearchRun(researchId: string): ResearchRun | undefined {
  return runs.get(researchId);
}
