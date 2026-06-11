import type { SkillManifest } from "@/types/skill";

export function createSkillSystemPrompt({
  manifest,
  itemState,
  context,
}: {
  manifest: SkillManifest;
  itemState: Record<string, unknown>;
  context?: string;
}) {
  return `${manifest.prompts.system}

${context ? `上游节点内容（来自画布连线）：\n${context}\n` : ""}

当前节点状态（JSON）：
${JSON.stringify(itemState, null, 2)}

输出要求：
- 仅输出一个 JSON 对象：{ "message": string, "state": object }
- state 为更新后的完整节点状态（全量替换，不是 patch）
- state 结构需符合该 Skill 的字段约定`;
}

export function createAnswerSystemPrompt(
  manifest: SkillManifest,
  itemState: Record<string, unknown>,
) {
  return `你是"${manifest.name}"节点的问答助手，用中文简洁回答用户问题。

节点功能：${manifest.description}
当前状态：${JSON.stringify(itemState)}

规则：不输出 JSON，不声称已修改或写入节点。`;
}
