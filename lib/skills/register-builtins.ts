import { composeManifest } from "@/lib/skills/compose";
import { documentManifest } from "@/lib/skills/document";
import { outlineManifest } from "@/lib/skills/outline";
import { skillRegistry } from "@/lib/skills/core/registry";

let builtinsRegistered = false;

export function getSkillRegistry() {
  if (!builtinsRegistered) {
    skillRegistry.register(documentManifest);
    skillRegistry.register(outlineManifest);
    skillRegistry.register(composeManifest);
    builtinsRegistered = true;
  }

  return skillRegistry;
}
