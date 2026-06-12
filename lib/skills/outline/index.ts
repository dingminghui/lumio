import { List } from "lucide-react";

import { OUTLINE_SKILL_ID } from "@/lib/skills/skill-ids";
import type { SkillManifest } from "@/types/skill";

import systemPrompt from "./system-prompt.md";

export const outlineManifest: SkillManifest = {
  source: "builtin",
  version: "1.0.0",
  id: OUTLINE_SKILL_ID,
  name: "大纲生成",
  description: "生成结构化内容大纲，支持章节标题与要点列表。",
  category: "document",
  icon: List,
  stateSchema: {
    type: "object",
    properties: {
      sections: {
        type: "array",
        description: "大纲章节列表",
        items: {
          type: "object",
          properties: {
            title: { type: "string", description: "章节标题" },
            bullets: {
              type: "array",
              items: { type: "string" },
              description: "要点列表",
            },
          },
        },
      },
    },
  },
  initialState: { sections: [] },
  stages: [
    {
      id: "empty",
      label: "待生成",
      description: "尚未生成大纲",
      priority: 10,
      condition: { op: "array_empty", paths: ["sections"] },
    },
    {
      id: "ready",
      label: "已生成",
      description: "大纲已生成，可继续修改",
      priority: 20,
      condition: { op: "array_nonempty", paths: ["sections"] },
    },
  ],
  actions: [
    { id: "generate", label: "生成大纲", description: "根据主题生成结构化大纲" },
    { id: "revise", label: "修订大纲", description: "按要求调整章节或要点" },
  ],
  prompts: { system: systemPrompt },
  canvas: {
    nodeType: "text",
    defaultSize: { w: 360, h: 280 },
  },
};
