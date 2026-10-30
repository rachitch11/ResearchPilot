const STORAGE_KEY = 'researchpilot.history.v1';
const MAX_ITEMS = 20;

export interface HistoryItem {
  researchId: string;
  question: string;
  status: string;
  savedAt: string;
}

function readAll(): HistoryItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return [];
    }
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? (parsed as HistoryItem[]) : [];
  } catch {
    return [];
  }
}

export function listResearchHistory(): HistoryItem[] {
  return readAll();
}

export function saveResearchHistory(item: HistoryItem): void {
  const next = [
    item,
    ...readAll().filter((candidate) => candidate.researchId !== item.researchId),
  ].slice(0, MAX_ITEMS);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
}
