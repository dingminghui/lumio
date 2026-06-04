"use server";

import { generateText } from "ai";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import {
  saveValidatedImageModelConfig,
  saveValidatedModelConfig,
  updateUserProfileName,
} from "@/db/profile-queries";
import { validateCloudflareImageConfig } from "@/lib/cloudflare-workers-ai";
import {
  MODEL_PROVIDER_IDS,
  MODEL_PROVIDERS,
  createConfiguredProvider,
  type ModelProviderId,
} from "@/lib/model-providers";

const providerSchema = z.enum(MODEL_PROVIDER_IDS);

const modelConfigSchema = z.object({
  apiKey: z.string().trim().min(1, "请输入 API Key"),
});

const imageModelConfigSchema = z.object({
  accountId: z.string().trim().min(1, "请输入 Account ID"),
  apiToken: z.string().trim().min(1, "请输入 API Token"),
});

function getErrorMessage(error: unknown) {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  return "操作失败";
}

async function validateModelConnection({
  provider,
  baseUrl,
  model,
  apiKey,
}: {
  provider: ModelProviderId;
  baseUrl: string;
  model: string;
  apiKey: string;
}) {
  const configuredProvider = createConfiguredProvider({
    provider,
    baseUrl,
    apiKey,
  });

  await generateText({
    model: configuredProvider.chatModel(model),
    prompt: "ping",
    maxOutputTokens: 1,
    maxRetries: 0,
    abortSignal: AbortSignal.timeout(15000),
  });
}

export async function saveUserProfileNameAction(name: string) {
  try {
    const profile = await updateUserProfileName(name);
    revalidatePath("/profile");

    return {
      ok: true as const,
      profile,
    };
  } catch (error) {
    return {
      ok: false as const,
      message: getErrorMessage(error),
    };
  }
}

export async function validateAndSaveModelConfigAction(
  providerInput: string,
  input: {
    apiKey: string;
  },
) {
  const providerResult = providerSchema.safeParse(providerInput);

  if (!providerResult.success) {
    return {
      ok: false as const,
      message: "不支持的模型服务商",
    };
  }

  const inputResult = modelConfigSchema.safeParse(input);

  if (!inputResult.success) {
    return {
      ok: false as const,
      message: inputResult.error.issues[0]?.message ?? "模型配置无效",
    };
  }

  const provider = providerResult.data;
  const { defaultBaseUrl: baseUrl, defaultModel: model } = MODEL_PROVIDERS[provider];
  const apiKey = inputResult.data.apiKey;

  try {
    await validateModelConnection({
      provider,
      baseUrl,
      model,
      apiKey,
    });

    const config = await saveValidatedModelConfig({
      provider,
      apiKey,
    });

    revalidatePath("/profile");

    return {
      ok: true as const,
      config: {
        ...config,
        validatedAt: config.validatedAt?.toISOString() ?? null,
      },
    };
  } catch (error) {
    const message = getErrorMessage(error);

    return {
      ok: false as const,
      message:
        message === "MODEL_CONFIG_SECRET is required"
          ? "缺少 MODEL_CONFIG_SECRET，无法安全保存 API Key"
          : "校验失败，请检查 API Key 或当前 DeepSeek 配置",
    };
  }
}

export async function validateAndSaveImageModelConfigAction(input: {
  accountId: string;
  apiToken: string;
}) {
  const inputResult = imageModelConfigSchema.safeParse(input);

  if (!inputResult.success) {
    return {
      ok: false as const,
      message: inputResult.error.issues[0]?.message ?? "图片模型配置无效",
    };
  }

  const { accountId, apiToken } = inputResult.data;

  try {
    await validateCloudflareImageConfig({ accountId, apiToken });

    const config = await saveValidatedImageModelConfig({
      accountId,
      apiToken,
    });

    revalidatePath("/profile");

    return {
      ok: true as const,
      config: {
        ...config,
        validatedAt: config.validatedAt?.toISOString() ?? null,
      },
    };
  } catch (error) {
    const message = getErrorMessage(error);

    return {
      ok: false as const,
      message:
        message === "MODEL_CONFIG_SECRET is required"
          ? "缺少 MODEL_CONFIG_SECRET，无法安全保存 API Token"
          : `测试连接失败：${message}`,
    };
  }
}
