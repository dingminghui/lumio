"use client";

import { useState } from "react";

import {
  saveUserProfileNameAction,
  validateAndSaveImageModelConfigAction,
  validateAndSaveModelConfigAction,
} from "@/app/profile/actions";
import { ImageModelConfigSection } from "@/components/profile/image-model-config-section";
import { ModelConfigSection } from "@/components/profile/model-config-section";
import { PersonalCenterSection } from "@/components/profile/personal-center-section";
import { ProfileSettingsNav } from "@/components/profile/profile-settings-nav";
import type {
  ImageModelConfigRow,
  ModelConfigRow,
  ProfileImageModelConfig,
  ProfileModelConfig,
  SaveStatus,
} from "@/components/profile/profile-settings-types";
import type { ModelProviderId } from "@/lib/model-providers";

type ProfileSettingsProps = {
  profile: {
    name: string;
  };
  modelConfigs: ProfileModelConfig[];
  imageModelConfig: ProfileImageModelConfig;
};

function getInitialModelRows(modelConfigs: ProfileModelConfig[]): ModelConfigRow[] {
  return modelConfigs.map((config) => ({
    ...config,
    apiKey: "",
    status: config.validatedAt ? "saved" : "idle",
    message: "",
  }));
}

function getInitialImageModelRow(
  imageModelConfig: ProfileImageModelConfig,
): ImageModelConfigRow {
  return {
    ...imageModelConfig,
    apiToken: "",
    status: imageModelConfig.validatedAt ? "saved" : "idle",
    message: "",
  };
}

export function ProfileSettings({
  profile,
  modelConfigs,
  imageModelConfig,
}: ProfileSettingsProps) {
  const [name, setName] = useState(profile.name);
  const [savedName, setSavedName] = useState(profile.name);
  const [nameStatus, setNameStatus] = useState<SaveStatus>("idle");
  const [nameMessage, setNameMessage] = useState("");
  const [rows, setRows] = useState(() => getInitialModelRows(modelConfigs));
  const [imageRow, setImageRow] = useState(() =>
    getInitialImageModelRow(imageModelConfig),
  );
  const [visibleKeys, setVisibleKeys] = useState<Record<ModelProviderId, boolean>>({
    deepseek: false,
  });
  const [isImageTokenVisible, setIsImageTokenVisible] = useState(false);

  async function handleNameBlur() {
    if (name.trim() === savedName) {
      return;
    }

    setNameStatus("saving");
    setNameMessage("");

    const result = await saveUserProfileNameAction(name);

    if (result.ok) {
      setSavedName(result.profile.name);
      setName(result.profile.name);
      setNameStatus("saved");
      return;
    }

    setNameStatus("error");
    setNameMessage(result.message);
  }

  function handleNameChange(nextName: string) {
    setName(nextName);
    setNameStatus("idle");
  }

  function updateRow(provider: ModelProviderId, updates: Partial<ModelConfigRow>) {
    setRows((currentRows) =>
      currentRows.map((row) =>
        row.provider === provider ? { ...row, ...updates } : row,
      ),
    );
  }

  async function handleModelSave(provider: ModelProviderId) {
    const row = rows.find((currentRow) => currentRow.provider === provider);

    if (!row) {
      return;
    }

    updateRow(provider, { status: "saving", message: "" });

    const result = await validateAndSaveModelConfigAction(provider, {
      apiKey: row.apiKey,
    });

    if (result.ok) {
      updateRow(provider, {
        apiKey: "",
        hasApiKey: result.config.hasApiKey,
        validatedAt: result.config.validatedAt,
        status: "saved",
        message: "",
      });
      return;
    }

    updateRow(provider, {
      status: "error",
      message: result.message,
    });
  }

  function handleApiKeyChange(provider: ModelProviderId, apiKey: string) {
    updateRow(provider, {
      apiKey,
      status: "idle",
      message: "",
    });
  }

  function toggleKeyVisibility(provider: ModelProviderId) {
    setVisibleKeys((currentVisibility) => ({
      ...currentVisibility,
      [provider]: !currentVisibility[provider],
    }));
  }

  function updateImageRow(updates: Partial<ImageModelConfigRow>) {
    setImageRow((currentRow) => ({ ...currentRow, ...updates }));
  }

  async function handleImageModelSave() {
    updateImageRow({ status: "saving", message: "" });

    const result = await validateAndSaveImageModelConfigAction({
      accountId: imageRow.accountId,
      apiToken: imageRow.apiToken,
    });

    if (result.ok) {
      updateImageRow({
        accountId: result.config.accountId,
        apiToken: "",
        hasApiToken: result.config.hasApiToken,
        model: result.config.model,
        validatedAt: result.config.validatedAt,
        status: "saved",
        message: "",
      });
      return;
    }

    updateImageRow({
      status: "error",
      message: result.message,
    });
  }

  return (
    <div className="mx-auto flex w-full max-w-[calc(100vw-8rem)] min-w-0 flex-col gap-6 sm:max-w-6xl">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-normal">我的</h1>
        <p className="text-sm text-muted-foreground">管理个人信息与模型服务配置。</p>
      </header>

      <div className="grid gap-6 lg:grid-cols-[12rem_minmax(0,1fr)]">
        <ProfileSettingsNav />

        <div className="flex min-w-0 flex-col gap-8">
          <PersonalCenterSection
            name={name}
            status={nameStatus}
            message={nameMessage}
            onNameBlur={handleNameBlur}
            onNameChange={handleNameChange}
          />
          <ModelConfigSection
            rows={rows}
            visibleKeys={visibleKeys}
            onApiKeyBlur={handleModelSave}
            onApiKeyChange={handleApiKeyChange}
            onKeyVisibilityToggle={toggleKeyVisibility}
          />
          <ImageModelConfigSection
            row={imageRow}
            isTokenVisible={isImageTokenVisible}
            onAccountIdChange={(accountId) =>
              updateImageRow({ accountId, status: "idle", message: "" })
            }
            onApiTokenChange={(apiToken) =>
              updateImageRow({ apiToken, status: "idle", message: "" })
            }
            onKeyVisibilityToggle={() => setIsImageTokenVisible((current) => !current)}
            onTestConnection={handleImageModelSave}
          />
        </div>
      </div>
    </div>
  );
}
