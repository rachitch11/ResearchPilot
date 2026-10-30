import type { AiProvider } from "../providers/ai";
import { getAiProvider } from "../providers";
import { parseJsonObject } from "./json";

export async function generateJson(
  prompt: string,
  invalidMessage: string,
  maxOutputTokens: number,
  provider: AiProvider = getAiProvider(),
): Promise<{ value: unknown; provider: string; model: string }> {
  const result = await provider.generateText({
    prompt,
    maxOutputTokens,
    responseMimeType: "application/json",
  });

  return {
    value: parseJsonObject(result.text, invalidMessage),
    provider: result.provider,
    model: result.model,
  };
}
