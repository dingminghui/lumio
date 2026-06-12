import { Layers } from "lucide-react";

import { COMPOSE_SKILL_ID } from "@/lib/skills/skill-ids";
import type { SkillManifest } from "@/types/skill";

import systemPrompt from "./system-prompt.md";

export const composeManifest: SkillManifest = {
  source: "builtin",
  version: "1.0.0",
  id: COMPOSE_SKILL_ID,
  name: "内容合成",
  description: "读取所有上游节点内容，合并输出完整 Markdown 交付物。",
  category: "document",
  icon: Layers,
  stateSchema: {
    type: "object",
    properties: {
      content: { type: "string", description: "完整 Markdown 文档" },
    },
  },
  initialState: { content: "" },
  stages: [
    {
      id: "empty",
      label: "待合成",
      description: "尚未合成内容",
      priority: 10,
      condition: { op: "missing", paths: ["content"] },
    },
    {
      id: "done",
      label: "已合成",
      description: "已合成完整文档",
      priority: 20,
      condition: { op: "present", paths: ["content"] },
    },
  ],
  actions: [
    { id: "compose", label: "合成文档", description: "整合上游内容，输出完整文档" },
    { id: "recompose", label: "重新合成", description: "重新整合所有上游内容" },
  ],
  prompts: { system: systemPrompt },
  canvas: {
    nodeType: "text",
    defaultSize: { w: 440, h: 320 },
    isComposer: true,
  },
};
