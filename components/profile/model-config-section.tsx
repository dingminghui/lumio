"use client";

import { Check, Eye, EyeOff } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Field, FieldLabel } from "@/components/ui/field";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from "@/components/ui/input-group";
import type { ModelProviderId } from "@/lib/model-providers";
import type { ModelConfigRow } from "@/components/profile/profile-settings-types";

type ModelConfigSectionProps = {
  rows: ModelConfigRow[];
  visibleKeys: Record<ModelProviderId, boolean>;
  onApiKeyBlur: (provider: ModelProviderId) => void;
  onApiKeyChange: (provider: ModelProviderId, apiKey: string) => void;
  onKeyVisibilityToggle: (provider: ModelProviderId) => void;
};

function getStatusLabel(row: ModelConfigRow) {
  if (row.status === "saving") {
    return "校验中";
  }

  if (row.status === "error") {
    return "校验失败";
  }

  if (row.validatedAt) {
    return "已保存";
  }

  return "未保存";
}

function ModelConfigItem({
  row,
  isKeyVisible,
  onApiKeyBlur,
  onApiKeyChange,
  onKeyVisibilityToggle,
}: {
  row: ModelConfigRow;
  isKeyVisible: boolean;
  onApiKeyBlur: (provider: ModelProviderId) => void;
  onApiKeyChange: (provider: ModelProviderId, apiKey: string) => void;
  onKeyVisibilityToggle: (provider: ModelProviderId) => void;
}) {
  const isSaving = row.status === "saving";

  return (
    <div className="flex min-w-0 flex-col gap-3 rounded-lg border p-3">
      <div className="flex min-w-0 items-start justify-between gap-3">
        <div className="flex min-w-0 flex-col gap-1">
          <div className="flex min-w-0 items-center gap-2">
            <span className="truncate text-sm font-medium">{row.label}</span>
            {row.validatedAt && (
              <Check aria-label="已保存" className="size-4 shrink-0 text-emerald-600" />
            )}
          </div>
          <p className="truncate text-xs text-muted-foreground">
            {row.baseUrl} / {row.model}
          </p>
        </div>
        <Badge
          variant={row.status === "error" ? "destructive" : "secondary"}
          className="shrink-0"
        >
          {getStatusLabel(row)}
        </Badge>
      </div>

      <div className="flex min-w-0 flex-col gap-2">
        <Field className="min-w-0 flex-row items-center gap-3">
          <FieldLabel className="max-w-20">API Key</FieldLabel>
          <InputGroup className="group-autofill">
            <InputGroupInput
              type={isKeyVisible ? "text" : "password"}
              value={row.apiKey}
              onBlur={() => {
                if (row.apiKey.trim()) {
                  onApiKeyBlur(row.provider);
                }
              }}
              onChange={(event) => onApiKeyChange(row.provider, event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.currentTarget.blur();
                }
              }}
              aria-label={`${row.label} API Key`}
              placeholder={
                row.hasApiKey ? "已保存，输入新 Key 后更新" : "请输入 API Key"
              }
              disabled={isSaving}
            />
            <InputGroupAddon align="inline-end">
              <InputGroupButton
                aria-label={isKeyVisible ? "隐藏 Key" : "显示 Key"}
                size="icon-xs"
                onClick={() => onKeyVisibilityToggle(row.provider)}
                disabled={isSaving}
              >
                {isKeyVisible ? <EyeOff /> : <Eye />}
              </InputGroupButton>
            </InputGroupAddon>
          </InputGroup>
        </Field>
      </div>

      {row.message && (
        <p className="text-xs leading-normal text-destructive">{row.message}</p>
      )}
    </div>
  );
}

export function ModelConfigSection({
  rows,
  visibleKeys,
  onApiKeyBlur,
  onApiKeyChange,
  onKeyVisibilityToggle,
}: ModelConfigSectionProps) {
  return (
    <section id="model-configs" className="scroll-mt-10">
      <Card className="min-w-0 shadow-xs ring-0">
        <CardHeader>
          <CardTitle>模型配置</CardTitle>
          <CardDescription>配置固定支持的模型服务商。</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-2">
            {rows.map((row) => (
              <ModelConfigItem
                key={row.provider}
                row={row}
                isKeyVisible={visibleKeys[row.provider]}
                onApiKeyBlur={onApiKeyBlur}
                onApiKeyChange={onApiKeyChange}
                onKeyVisibilityToggle={onKeyVisibilityToggle}
              />
            ))}
          </div>
        </CardContent>
      </Card>
    </section>
  );
}
