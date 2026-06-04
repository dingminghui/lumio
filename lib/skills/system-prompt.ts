import type { AnySkillDefinition, ProjectState } from "@/types/skill";

export function createSkillSystemPrompt({
  skill,
  projectState,
}: {
  skill: AnySkillDefinition;
  projectState: ProjectState;
}) {
  return `${skill.systemPrompt}

当前 Project State：
${JSON.stringify(projectState)}

Patch path 规则：
- path 默认相对于 Project State 的 state 字段，例如 "title" 等价于 "state.title"。
- 如需写 metadata，只允许使用 "metadata.xxx"。
- 不要修改 skill、version、artifacts 顶层字段。`;
}
