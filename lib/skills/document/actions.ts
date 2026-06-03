import type { SkillAction } from "@/types/skill";

export const documentActions: SkillAction[] = [
  { id: "set_brief", label: "设置简介", description: "确定文档主题与要求" },
  { id: "generate_sections", label: "生成章节", description: "生成文档大纲与章节" },
  { id: "update_section", label: "更新章节", description: "重写或修改指定章节" },
  { id: "delete_section", label: "删除章节", description: "删除指定章节" },
  { id: "export_document", label: "导出文档", description: "导出为文件" },
];
