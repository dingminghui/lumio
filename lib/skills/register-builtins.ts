import { documentManifest } from "@/lib/skills/document";
import { imageManifest } from "@/lib/skills/image";
import { longImageManifest } from "@/lib/skills/long-image";
import { skillRegistry } from "@/lib/skills/core/registry";

let builtinsRegistered = false;

export function getSkillRegistry() {
  if (!builtinsRegistered) {
    skillRegistry.register(documentManifest);
    skillRegistry.register(imageManifest);
    skillRegistry.register(longImageManifest);
    builtinsRegistered = true;
  }

  return skillRegistry;
}
