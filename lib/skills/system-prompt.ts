import type { SkillManifest } from "@/types/skill";

export function createSkillSystemPrompt({
  manifest,
  itemState,
}: {
  manifest: SkillManifest;
  itemState: Record<string, unknown>;
}) {
  return `${manifest.prompts.system}

当前节点状态（JSON）：
${JSON.stringify(itemState, null, 2)}

输出要求：
- 仅输出一个 JSON 对象：{ "message": string, "state": object }
- state 为更新后的完整节点状态（全量替换，不是 patch）
- state 结构需符合该 Skill 的字段约定`;
}
