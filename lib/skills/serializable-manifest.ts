import type {
  DeclarativeStageRule,
  JSONSchemaObject,
  SkillCanvasConfig,
  SkillManifest,
} from "@/types/skill";

export type SerializableSkillManifest = {
  id: string;
  name: string;
  source: SkillManifest["source"];
  category: SkillManifest["category"];
  stateSchema: JSONSchemaObject;
  stages: DeclarativeStageRule[];
  canvas: SkillCanvasConfig;
};

export function toSerializableSkillManifest(
  manifest: SkillManifest,
): SerializableSkillManifest {
  return {
    id: manifest.id,
    name: manifest.name,
    source: manifest.source,
    category: manifest.category,
    stateSchema: manifest.stateSchema,
    stages: manifest.stages,
    canvas: manifest.canvas,
  };
}
