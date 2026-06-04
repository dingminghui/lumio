import { ImageIcon } from "lucide-react";

import type { SkillManifest } from "@/types/skill";

import systemPrompt from "./system-prompt.md";
import { IMAGE_SKILL_ID } from "./constants";

export { IMAGE_NODE_IMAGE_LIMIT, IMAGE_SKILL_ID } from "./constants";

export const imageManifest: SkillManifest = {
  source: "builtin",
  version: "1.0.0",
  id: IMAGE_SKILL_ID,
  name: "图片生成",
  description: "通过对话收集描述、风格、比例和用途，并生成一组图片。",
  category: "image",
  icon: ImageIcon,
  stateSchema: {
    type: "object",
    properties: {
      description: { type: "string", description: "图片描述" },
      style: { type: "string", description: "视觉风格" },
      aspectRatio: { type: "string", description: "图片比例" },
      usage: { type: "string", description: "用途" },
      images: {
        type: "array",
        description: "生成图片列表",
        items: {
          type: "object",
          properties: {
            id: { type: "string" },
            src: { type: "string" },
            prompt: { type: "string" },
            createdAt: { type: "string" },
          },
        },
      },
      status: { type: "string", description: "生成状态" },
      error: { type: "string", description: "错误信息" },
      pendingConfirmation: { type: "boolean", description: "是否等待确认" },
    },
  },
  initialState: {
    description: "",
    style: "",
    aspectRatio: "",
    usage: "",
    images: [],
    status: "collecting",
    error: "",
    pendingConfirmation: false,
  },
  stages: [
    {
      id: "empty",
      label: "未生成",
      description: "还没有生成图片",
      priority: 10,
      condition: { op: "array_empty", paths: ["images"] },
    },
    {
      id: "ready",
      label: "已有图片",
      description: "已生成图片，可继续追加直到上限",
      priority: 20,
      condition: { op: "array_nonempty", paths: ["images"] },
    },
  ],
  actions: [
    { id: "collect", label: "收集需求", description: "补齐描述、风格、比例和用途" },
    { id: "generate", label: "生成图片", description: "确认后生成一张图片" },
  ],
  prompts: { system: systemPrompt },
  canvas: {
    nodeType: "image",
    defaultSize: { w: 420, h: 320 },
  },
};
