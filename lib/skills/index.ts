import { documentManifest, documentSkill } from "@/lib/skills/document";
import { skillRegistry } from "@/lib/skills/core/registry";
import type { SkillCategoryFilter, SkillManifest } from "@/types/skill";

skillRegistry.register(documentManifest);

export { skillRegistry } from "@/lib/skills/core/registry";
export {
  deriveSkillStage,
  getStageById,
  toSkillStage,
} from "@/lib/skills/core/stage-engine";
export { bootstrapSkillRegistry } from "@/lib/skills/bootstrap";
export { getSkillRegistry } from "@/lib/skills/register-builtins";
export { toSerializableSkillManifest } from "@/lib/skills/serializable-manifest";
export { documentManifest, documentSkill };

/** @deprecated Use skillRegistry.list() */
export const SKILL_REGISTRY: SkillManifest[] = [documentManifest];

export function getSkillById(id: string): SkillManifest | undefined {
  return skillRegistry.get(id);
}

export function listSkillsByCategory(category: SkillCategoryFilter): SkillManifest[] {
  return skillRegistry.list(category === "all" ? undefined : { category });
}
