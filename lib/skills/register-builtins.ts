import { documentManifest } from "@/lib/skills/document";
import { skillRegistry } from "@/lib/skills/core/registry";

let builtinsRegistered = false;

export function getSkillRegistry() {
  if (!builtinsRegistered) {
    skillRegistry.register(documentManifest);
    builtinsRegistered = true;
  }

  return skillRegistry;
}
