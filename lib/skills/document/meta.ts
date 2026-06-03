import { FileText } from "lucide-react";

import type { SkillCategory, SkillId } from "@/types/skill";

export const documentMeta = {
  id: "document" satisfies SkillId,
  name: "文档生成",
  description:
    "通过对话生成结构化文档：确定主题、生成章节、逐段撰写，并支持重写任意章节或导出。",
  category: "document" satisfies SkillCategory,
  icon: FileText,
} as const;
