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

${context ? `额外上下文：\n${context}\n` : ""}

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
  return `你是 Lumio 的节点会话助手。请用中文自然回答用户的问题。

当前节点：
- skillId: ${manifest.id}
- skillName: ${manifest.name}
- description: ${manifest.description}

当前节点状态：
${JSON.stringify(itemState, null, 2)}

规则：
- 只回答用户问题，不输出 JSON。
- 不要声称已经修改、保存或写入节点。
- 如果用户想调用的能力不属于当前节点，简短说明应该切换到对应节点。`;
}
