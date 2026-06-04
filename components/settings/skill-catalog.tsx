"use client";

import { FileText } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { deriveSkillStage } from "@/lib/skills/core/stage-engine";
import { getSkillRegistry } from "@/lib/skills/register-builtins";
import type { SkillManifest } from "@/types/skill";

function SkillCard({ skill }: { skill: SkillManifest }) {
  const Icon = skill.icon ?? FileText;
  const currentStage = deriveSkillStage(skill, skill.initialState);

  return (
    <Card size="sm" className="h-full shadow-xs ring-0">
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-muted">
              <Icon className="size-5 text-foreground" aria-hidden />
            </div>
            <div className="min-w-0">
              <CardTitle>{skill.name}</CardTitle>
              <p className="mt-0.5 font-mono text-xs text-muted-foreground">
                {skill.id}
              </p>
            </div>
          </div>
          <Badge variant="secondary">内置</Badge>
        </div>
        <CardDescription className="mt-2">{skill.description}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div>
          <p className="mb-1.5 text-xs font-medium text-muted-foreground">初始阶段</p>
          <Badge variant="outline">{currentStage.label}</Badge>
          <p className="mt-1 text-xs text-muted-foreground">
            {currentStage.description}
          </p>
        </div>
        <div>
          <p className="mb-1.5 text-xs font-medium text-muted-foreground">支持操作</p>
          <ul className="flex flex-wrap gap-1.5">
            {skill.actions.map((action) => (
              <li key={action.id}>
                <Badge variant="outline" title={action.description}>
                  {action.label}
                </Badge>
              </li>
            ))}
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}

export function SkillCatalog() {
  const skills = getSkillRegistry().list({ source: "builtin" });

  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {skills.map((skill) => (
        <SkillCard key={skill.id} skill={skill} />
      ))}
    </div>
  );
}
