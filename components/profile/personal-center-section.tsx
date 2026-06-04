"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { SaveStatus } from "@/components/profile/profile-settings-types";

type PersonalCenterSectionProps = {
  name: string;
  status: SaveStatus;
  message: string;
  onNameBlur: () => void;
  onNameChange: (name: string) => void;
};

export function PersonalCenterSection({
  name,
  status,
  message,
  onNameBlur,
  onNameChange,
}: PersonalCenterSectionProps) {
  return (
    <section id="personal-center" className="scroll-mt-10">
      <Card className="min-w-0 shadow-xs ring-0">
        <CardHeader>
          <CardTitle>个人中心</CardTitle>
          <CardDescription>用于展示你的个人身份信息。</CardDescription>
        </CardHeader>
        <CardContent>
          <FieldGroup>
            <Field
              data-invalid={status === "error"}
              className="flex-row items-center gap-3"
            >
              <FieldLabel htmlFor="profile-name" className="max-w-20">
                姓名
              </FieldLabel>
              <Input
                id="profile-name"
                value={name}
                onBlur={onNameBlur}
                onChange={(event) => onNameChange(event.target.value)}
                aria-invalid={status === "error"}
                placeholder="请输入姓名"
                className="group-autofill"
              />
              <FieldDescription
                className={cn(status === "error" && "text-destructive")}
              >
                {status === "saving" && "保存中"}
                {status === "saved" && "已保存"}
                {status === "error" && message}
              </FieldDescription>
            </Field>
          </FieldGroup>
        </CardContent>
      </Card>
    </section>
  );
}
