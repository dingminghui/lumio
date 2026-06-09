import { createOpenAICompatible } from "@ai-sdk/openai-compatible";

export function createConfiguredProvider({
  apiKey,
  baseUrl,
}: {
  apiKey: string;
  baseUrl: string;
}) {
  return createOpenAICompatible({
    name: "deepseek",
    apiKey,
    baseURL: baseUrl,
    transformRequestBody: (requestBody) => ({
      ...requestBody,
      thinking: { type: "disabled" },
    }),
  });
}
