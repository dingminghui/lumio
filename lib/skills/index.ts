import { documentSkill } from "@/lib/skills/document";
import type { AnySkillDefinition, SkillCategoryFilter, SkillId } from "@/types/skill";

export const SKILL_REGISTRY: AnySkillDefinition[] = [documentSkill];

export function getSkillById(id: SkillId): AnySkillDefinition | undefined {
  return SKILL_REGISTRY.find((skill) => skill.id === id);
}

export function listSkillsByCategory(
  category: SkillCategoryFilter,
): AnySkillDefinition[] {
  if (category === "all") {
    return SKILL_REGISTRY;
  }

  return SKILL_REGISTRY.filter((skill) => skill.category === category);
}

export { documentSkill };
