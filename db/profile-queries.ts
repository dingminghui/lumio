import { eq, sql } from "drizzle-orm";

import { db } from "@/db";
import { imageModelConfigs, modelConfigs, userProfile } from "@/db/schema";
import {
  CLOUDFLARE_IMAGE_MODEL,
  CLOUDFLARE_IMAGE_PROVIDER_ID,
  CLOUDFLARE_IMAGE_PROVIDER_LABEL,
} from "@/lib/cloudflare-workers-ai";
import { decryptModelApiKey, encryptModelApiKey } from "@/lib/model-config-crypto";
import {
  MODEL_PROVIDER_IDS,
  MODEL_PROVIDERS,
  type ModelProviderId,
} from "@/lib/model-providers";

const DEFAULT_PROFILE_ID = "default";

export type UserProfileSettings = {
  id: string;
  name: string;
};

export type SavedModelConfig = {
  provider: ModelProviderId;
  hasApiKey: boolean;
  validatedAt: Date | null;
};

export type DecryptedModelConfig = {
  provider: ModelProviderId;
  baseUrl: string;
  model: string;
  apiKey: string;
  validatedAt: Date | null;
};

export type SavedImageModelConfig = {
  id: typeof CLOUDFLARE_IMAGE_PROVIDER_ID;
  label: typeof CLOUDFLARE_IMAGE_PROVIDER_LABEL;
  accountId: string;
  model: string;
  hasApiToken: boolean;
  validatedAt: Date | null;
};

export type DecryptedImageModelConfig = {
  accountId: string;
  model: string;
  apiToken: string;
  validatedAt: Date | null;
};

export async function getUserProfileSettings(): Promise<UserProfileSettings> {
  const [profile] = await db
    .select({
      id: userProfile.id,
      name: userProfile.name,
    })
    .from(userProfile)
    .where(eq(userProfile.id, DEFAULT_PROFILE_ID))
    .limit(1);

  return profile ?? { id: DEFAULT_PROFILE_ID, name: "" };
}

export async function updateUserProfileName(name: string) {
  const trimmedName = name.trim();

  const [profile] = await db
    .insert(userProfile)
    .values({
      id: DEFAULT_PROFILE_ID,
      name: trimmedName,
    })
    .onConflictDoUpdate({
      target: userProfile.id,
      set: {
        name: trimmedName,
        updatedAt: sql`now()`,
      },
    })
    .returning({
      id: userProfile.id,
      name: userProfile.name,
    });

  return profile;
}

export async function listSavedModelConfigs(): Promise<SavedModelConfig[]> {
  const rows = await db
    .select({
      provider: modelConfigs.provider,
      validatedAt: modelConfigs.validatedAt,
    })
    .from(modelConfigs);

  return rows.map((row) => ({
    ...row,
    provider: row.provider,
    hasApiKey: true,
  }));
}

export async function getSavedModelConfig(provider: ModelProviderId) {
  const [config] = await db
    .select({
      provider: modelConfigs.provider,
      apiKeyEncrypted: modelConfigs.apiKeyEncrypted,
      validatedAt: modelConfigs.validatedAt,
    })
    .from(modelConfigs)
    .where(eq(modelConfigs.provider, provider))
    .limit(1);

  return config ?? null;
}

export async function getDecryptedModelConfig(
  provider: ModelProviderId,
): Promise<DecryptedModelConfig | null> {
  const config = await getSavedModelConfig(provider);

  if (!config) {
    return null;
  }

  return {
    provider: config.provider,
    baseUrl: MODEL_PROVIDERS[config.provider].defaultBaseUrl,
    model: MODEL_PROVIDERS[config.provider].defaultModel,
    apiKey: decryptModelApiKey(config.apiKeyEncrypted),
    validatedAt: config.validatedAt,
  };
}

export async function saveValidatedModelConfig({
  provider,
  apiKey,
}: {
  provider: ModelProviderId;
  apiKey: string;
}) {
  const encryptedApiKey = encryptModelApiKey(apiKey);

  const [config] = await db
    .insert(modelConfigs)
    .values({
      provider,
      apiKeyEncrypted: encryptedApiKey,
      validatedAt: sql`now()`,
    })
    .onConflictDoUpdate({
      target: modelConfigs.provider,
      set: {
        apiKeyEncrypted: encryptedApiKey,
        validatedAt: sql`now()`,
        updatedAt: sql`now()`,
      },
    })
    .returning({
      provider: modelConfigs.provider,
      validatedAt: modelConfigs.validatedAt,
    });

  return {
    ...config,
    hasApiKey: true,
  };
}

export async function getSavedImageModelConfig(): Promise<SavedImageModelConfig> {
  const [config] = await db
    .select({
      accountId: imageModelConfigs.accountId,
      model: imageModelConfigs.model,
      validatedAt: imageModelConfigs.validatedAt,
    })
    .from(imageModelConfigs)
    .where(eq(imageModelConfigs.id, CLOUDFLARE_IMAGE_PROVIDER_ID))
    .limit(1);

  return {
    id: CLOUDFLARE_IMAGE_PROVIDER_ID,
    label: CLOUDFLARE_IMAGE_PROVIDER_LABEL,
    accountId: config?.accountId ?? "",
    model: config?.model ?? CLOUDFLARE_IMAGE_MODEL,
    hasApiToken: Boolean(config),
    validatedAt: config?.validatedAt ?? null,
  };
}

export async function getDecryptedImageModelConfig(): Promise<DecryptedImageModelConfig | null> {
  const [config] = await db
    .select({
      accountId: imageModelConfigs.accountId,
      apiTokenEncrypted: imageModelConfigs.apiTokenEncrypted,
      model: imageModelConfigs.model,
      validatedAt: imageModelConfigs.validatedAt,
    })
    .from(imageModelConfigs)
    .where(eq(imageModelConfigs.id, CLOUDFLARE_IMAGE_PROVIDER_ID))
    .limit(1);

  if (!config) {
    return null;
  }

  return {
    accountId: config.accountId,
    model: config.model,
    apiToken: decryptModelApiKey(config.apiTokenEncrypted),
    validatedAt: config.validatedAt,
  };
}

export async function saveValidatedImageModelConfig({
  accountId,
  apiToken,
}: {
  accountId: string;
  apiToken: string;
}) {
  const encryptedApiToken = encryptModelApiKey(apiToken);

  const [config] = await db
    .insert(imageModelConfigs)
    .values({
      id: CLOUDFLARE_IMAGE_PROVIDER_ID,
      accountId,
      apiTokenEncrypted: encryptedApiToken,
      model: CLOUDFLARE_IMAGE_MODEL,
      validatedAt: sql`now()`,
    })
    .onConflictDoUpdate({
      target: imageModelConfigs.id,
      set: {
        accountId,
        apiTokenEncrypted: encryptedApiToken,
        model: CLOUDFLARE_IMAGE_MODEL,
        validatedAt: sql`now()`,
        updatedAt: sql`now()`,
      },
    })
    .returning({
      accountId: imageModelConfigs.accountId,
      model: imageModelConfigs.model,
      validatedAt: imageModelConfigs.validatedAt,
    });

  return {
    id: CLOUDFLARE_IMAGE_PROVIDER_ID,
    label: CLOUDFLARE_IMAGE_PROVIDER_LABEL,
    ...config,
    hasApiToken: true,
  };
}

export async function getProfileSettings() {
  const [profile, savedConfigs, imageModelConfig] = await Promise.all([
    getUserProfileSettings(),
    listSavedModelConfigs(),
    getSavedImageModelConfig(),
  ]);

  const savedConfigByProvider = new Map(
    savedConfigs.map((config) => [config.provider, config]),
  );

  return {
    profile,
    modelConfigs: MODEL_PROVIDER_IDS.map((provider) => {
      const savedConfig = savedConfigByProvider.get(provider);
      const defaults = MODEL_PROVIDERS[provider];

      return {
        provider,
        label: defaults.label,
        baseUrl: defaults.defaultBaseUrl,
        model: defaults.defaultModel,
        hasApiKey: savedConfig?.hasApiKey ?? false,
        validatedAt: savedConfig?.validatedAt ?? null,
      };
    }),
    imageModelConfig,
  };
}
