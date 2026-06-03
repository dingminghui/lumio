import { deriveStageFromRules } from "@/lib/skills/utils";
import type { DocumentState, StageRule } from "@/types/skill";

export const documentStages: StageRule<DocumentState>[] = [
  {
    id: "collect_brief",
    label: "收集需求",
    description: "尚未确定文档主题或简介",
    priority: 10,
    condition: (state) => !state.title && !state.brief,
  },
  {
    id: "generate_sections",
    label: "生成章节",
    description: "已有简介，尚未生成章节结构",
    priority: 20,
    condition: (state) =>
      Boolean(state.title || state.brief) &&
      (!state.sections || state.sections.length === 0),
  },
  {
    id: "edit_or_export",
    label: "编辑或导出",
    description: "章节已生成，可继续编辑或导出",
    priority: 30,
    condition: (state) => Boolean(state.sections && state.sections.length > 0),
  },
];

export const deriveDocumentStage = (state: DocumentState) =>
  deriveStageFromRules(documentStages, state);
