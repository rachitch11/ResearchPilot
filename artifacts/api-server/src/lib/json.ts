export function parseJsonObject(text: string, invalidMessage: string): unknown {
  const trimmed = text.trim();
  const withoutFence = trimmed.startsWith("```")
    ? trimmed.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "")
    : trimmed;

  try {
    return JSON.parse(withoutFence);
  } catch {
    throw new Error(invalidMessage);
  }
}
