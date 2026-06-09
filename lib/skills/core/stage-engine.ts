import type {
  DeclarativeStageCondition,
  DeclarativeStageRule,
  SkillStage,
} from "@/types/skill";

export type StageInput = {
  id: string;
  stages: DeclarativeStageRule[];
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function getValueAtPath(state: Record<string, unknown>, path: string) {
  const parts = path.split(".").filter(Boolean);
  let current: unknown = state;

  for (const part of parts) {
    if (!isRecord(current)) {
      return undefined;
    }

    current = current[part];
  }

  return current;
}

export function toSkillStage(stage: {
  id: string;
  label: string;
  description: string;
  priority: number;
}): SkillStage {
  return {
    id: stage.id,
    label: stage.label,
    description: stage.description,
    priority: stage.priority,
  };
}

function evaluateCondition(
  state: Record<string, unknown>,
  condition: DeclarativeStageCondition,
): boolean {
  const pathResults = condition.paths.map((path) => {
    const value = getValueAtPath(state, path);

    switch (condition.op) {
      case "missing":
        return value === undefined || value === null || value === "";
      case "present":
        return value !== undefined && value !== null && value !== "";
      case "array_empty":
        return Array.isArray(value) && value.length === 0;
      case "array_nonempty":
        return Array.isArray(value) && value.length > 0;
      default:
        return false;
    }
  });

  const primary = pathResults.every(Boolean);

  if (!condition.and?.length) {
    return primary;
  }

  return primary && condition.and.every((child) => evaluateCondition(state, child));
}

export function deriveSkillStage(manifest: StageInput, state: unknown): SkillStage {
  const record = isRecord(state) ? state : {};
  const matched = manifest.stages
    .filter((rule) => evaluateCondition(record, rule.condition))
    .sort((first, second) => second.priority - first.priority);

  const stage = matched[0];

  if (!stage) {
    const fallback = manifest.stages[manifest.stages.length - 1];

    if (!fallback) {
      throw new Error(`No stage rules defined for skill ${manifest.id}`);
    }

    return toSkillStage(fallback);
  }

  return toSkillStage(stage);
}

export function getStageById(
  manifest: StageInput,
  stageId: string | undefined,
): SkillStage | null {
  if (!stageId) {
    return null;
  }

  const stage = manifest.stages.find((item) => item.id === stageId);

  return stage ? toSkillStage(stage) : null;
}

export type { DeclarativeStageRule };
