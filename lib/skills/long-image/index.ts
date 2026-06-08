import { ImageIcon } from "lucide-react";

import type { SkillManifest } from "@/types/skill";

import systemPrompt from "./system-prompt.md";
import {
  LONG_IMAGE_DEFAULT_HEIGHT,
  LONG_IMAGE_DEFAULT_WIDTH,
  LONG_IMAGE_SKILL_ID,
} from "./constants";

export { LONG_IMAGE_SKILL_ID } from "./constants";

export const longImageManifest: SkillManifest = {
  source: "builtin",
  version: "1.0.0",
  id: LONG_IMAGE_SKILL_ID,
  name: "生成长图",
  description: "根据前置文档总结生成 HTML 长图预览，并支持导出为图片。",
  category: "image",
  icon: ImageIcon,
  stateSchema: {
    type: "object",
    properties: {
      status: { type: "string", description: "生成状态" },
      title: { type: "string", description: "长图主标题" },
      subtitle: { type: "string", description: "长图副标题" },
      summary: { type: "string", description: "长图摘要" },
      sections: {
        type: "array",
        description: "长图章节",
        items: {
          type: "object",
          properties: {
            title: { type: "string" },
            body: { type: "string" },
            quote: { type: "string" },
            imageId: { type: "string" },
          },
        },
      },
      images: {
        type: "array",
        description: "上游图片素材快照",
        items: {
          type: "object",
          properties: {
            id: { type: "string" },
            src: { type: "string" },
            prompt: { type: "string" },
          },
        },
      },
      error: { type: "string", description: "错误信息" },
      generatedAt: { type: "string", description: "生成时间" },
    },
  },
  initialState: {
    status: "empty",
    title: "",
    subtitle: "",
    summary: "",
    sections: [],
    images: [],
    error: "",
    generatedAt: "",
  },
  stages: [
    {
      id: "empty",
      label: "未生成",
      description: "还没有生成长图内容",
      priority: 10,
      condition: { op: "array_empty", paths: ["sections"] },
    },
    {
      id: "ready",
      label: "已生成",
      description: "已有长图内容，可导出图片",
      priority: 20,
      condition: { op: "array_nonempty", paths: ["sections"] },
    },
  ],
  actions: [{ id: "generate", label: "生成长图", description: "根据上游文档生成长图" }],
  prompts: { system: systemPrompt },
  canvas: {
    nodeType: "long-image",
    defaultSize: { w: LONG_IMAGE_DEFAULT_WIDTH, h: LONG_IMAGE_DEFAULT_HEIGHT },
  },
};
