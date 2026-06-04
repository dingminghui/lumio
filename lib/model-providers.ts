import { createOpenAICompatible } from "@ai-sdk/openai-compatible";

export const MODEL_PROVIDER_IDS = ["deepseek"] as const;

export type ModelProviderId = (typeof MODEL_PROVIDER_IDS)[number];

export type ModelProviderConfig = {
  id: ModelProviderId;
  label: string;
  defaultBaseUrl: string;
  defaultModel: string;
};

export const MODEL_PROVIDERS: Record<ModelProviderId, ModelProviderConfig> = {
  deepseek: {
    id: "deepseek",
    label: "DeepSeek",
    defaultBaseUrl: process.env.DEEPSEEK_BASE_URL ?? "https://api.deepseek.com",
    defaultModel: process.env.DEEPSEEK_MODEL ?? "deepseek-chat",
  },
};

export function createConfiguredProvider({
  provider,
  apiKey,
  baseUrl,
}: {
  provider: ModelProviderId;
  apiKey: string;
  baseUrl: string;
}) {
  return createOpenAICompatible({
    name: provider,
    apiKey,
    baseURL: baseUrl,
    transformRequestBody: (requestBody) => ({
      ...requestBody,
      thinking: { type: "disabled" },
    }),
  });
}
