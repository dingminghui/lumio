import type { ModelProviderId } from "@/lib/model-providers";

export type SaveStatus = "idle" | "saving" | "saved" | "error";

export type ModelConfigRow = {
  provider: ModelProviderId;
  label: string;
  baseUrl: string;
  model: string;
  apiKey: string;
  hasApiKey: boolean;
  validatedAt: string | null;
  status: SaveStatus;
  message: string;
};

export type ProfileModelConfig = {
  provider: ModelProviderId;
  label: string;
  baseUrl: string;
  model: string;
  hasApiKey: boolean;
  validatedAt: string | null;
};

export type ImageModelConfigRow = {
  id: string;
  label: string;
  accountId: string;
  apiToken: string;
  model: string;
  hasApiToken: boolean;
  validatedAt: string | null;
  status: SaveStatus;
  message: string;
};

export type ProfileImageModelConfig = {
  id: string;
  label: string;
  accountId: string;
  model: string;
  hasApiToken: boolean;
  validatedAt: string | null;
};
