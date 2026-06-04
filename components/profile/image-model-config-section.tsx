"use client";

import { Check, Eye, EyeOff } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from "@/components/ui/input-group";
import type { ImageModelConfigRow } from "@/components/profile/profile-settings-types";

type ImageModelConfigSectionProps = {
  row: ImageModelConfigRow;
  isTokenVisible: boolean;
  onAccountIdChange: (accountId: string) => void;
  onApiTokenChange: (apiToken: string) => void;
  onKeyVisibilityToggle: () => void;
  onTestConnection: () => void;
};

function getStatusLabel(row: ImageModelConfigRow) {
  if (row.status === "saving") {
    return "测试中";
  }

  if (row.status === "error") {
    return "测试失败";
  }

  if (row.validatedAt) {
    return "已保存";
  }

  return "未保存";
}

export function ImageModelConfigSection({
  row,
  isTokenVisible,
  onAccountIdChange,
  onApiTokenChange,
  onKeyVisibilityToggle,
  onTestConnection,
}: ImageModelConfigSectionProps) {
  const isSaving = row.status === "saving";

  return (
    <section id="image-model-configs" className="scroll-mt-10">
      <Card className="min-w-0 shadow-xs ring-0">
        <CardHeader>
          <CardTitle>图片模型配置</CardTitle>
          <CardDescription>
            使用 Cloudflare Workers AI API Token 生成图片。测试连接会消耗一次 Workers AI
            调用额度。
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex min-w-0 flex-col gap-3 rounded-lg border p-3">
            <div className="flex min-w-0 items-start justify-between gap-3">
              <div className="flex min-w-0 flex-col gap-1">
                <div className="flex min-w-0 items-center gap-2">
                  <span className="truncate text-sm font-medium">{row.label}</span>
                  {row.validatedAt && (
                    <Check
                      aria-label="已保存"
                      className="size-4 shrink-0 text-emerald-600"
                    />
                  )}
                </div>
                <p className="truncate text-xs text-muted-foreground">{row.model}</p>
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
                <FieldLabel className="max-w-24">Account ID</FieldLabel>
                <Input
                  value={row.accountId}
                  onChange={(event) => onAccountIdChange(event.target.value)}
                  aria-label="Cloudflare Account ID"
                  placeholder="请输入 Account ID"
                  disabled={isSaving}
                />
              </Field>

              <Field className="min-w-0 flex-row items-center gap-3">
                <FieldLabel className="max-w-24">API Token</FieldLabel>
                <InputGroup className="group-autofill">
                  <InputGroupInput
                    type={isTokenVisible ? "text" : "password"}
                    value={row.apiToken}
                    onChange={(event) => onApiTokenChange(event.target.value)}
                    aria-label="Cloudflare API Token"
                    placeholder={
                      row.hasApiToken
                        ? "已保存，输入新 Token 后测试更新"
                        : "请输入 API Token"
                    }
                    disabled={isSaving}
                  />
                  <InputGroupAddon align="inline-end">
                    <InputGroupButton
                      aria-label={isTokenVisible ? "隐藏 Token" : "显示 Token"}
                      size="icon-xs"
                      onClick={onKeyVisibilityToggle}
                      disabled={isSaving}
                    >
                      {isTokenVisible ? <EyeOff /> : <Eye />}
                    </InputGroupButton>
                  </InputGroupAddon>
                </InputGroup>
              </Field>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-xs text-muted-foreground">
                Token 需要账号级 Workers AI Read 和 Workers AI Edit 权限。
              </p>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={onTestConnection}
                disabled={isSaving}
              >
                测试连接
              </Button>
            </div>

            {row.message && (
              <p className="text-xs leading-normal text-destructive">{row.message}</p>
            )}
          </div>
        </CardContent>
      </Card>
    </section>
  );
}
