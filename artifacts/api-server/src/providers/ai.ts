export interface GenerateTextInput {
  prompt: string;
  maxOutputTokens?: number;
  responseMimeType?: "text/plain" | "application/json";
}

export interface GenerateTextResult {
  text: string;
  provider: string;
  model: string;
}

export interface AiProvider {
  readonly name: string;
  readonly model: string;
  generateText(input: GenerateTextInput): Promise<GenerateTextResult>;
}

export class AiProviderError extends Error {
  public readonly code: "not_configured" | "request_failed" | "invalid_response";

  public constructor(
    message: string,
    code: AiProviderError["code"],
  ) {
    super(message);
    this.name = "AiProviderError";
    this.code = code;
  }
}