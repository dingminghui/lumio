import { FileText } from "lucide-react";

import { DOCUMENT_SKILL_ID } from "@/lib/skills/skill-ids";
import type { SkillManifest } from "@/types/skill";

import systemPrompt from "./system-prompt.md";

export const documentManifest: SkillManifest = {
  source: "builtin",
  version: "1.0.0",
  id: DOCUMENT_SKILL_ID,
  name: "文档生成",
  description: "通过对话生成 Markdown 文档，支持起草、编辑与导出准备。",
  category: "document",
  icon: FileText,
  stateSchema: {
    type: "object",
    properties: {
      content: { type: "string", description: "Markdown 文档正文" },
    },
  },
  initialState: { content: "" },
  stages: [
    {
      id: "draft",
      label: "起草",
      description: "尚未生成文档内容",
      priority: 10,
      condition: { op: "missing", paths: ["content"] },
    },
    {
      id: "editing",
      label: "编辑中",
      description: "已有文档内容，可继续编辑",
      priority: 20,
      condition: { op: "present", paths: ["content"] },
    },
  ],
  actions: [
    { id: "draft", label: "起草文档", description: "根据对话生成 Markdown" },
    { id: "revise", label: "修订文档", description: "按用户要求更新全文" },
  ],
  prompts: { system: systemPrompt },
  canvas: {
    nodeType: "text",
    defaultSize: { w: 400, h: 300 },
  },
};

/** @deprecated Use documentManifest */
export const documentSkill = documentManifest;
