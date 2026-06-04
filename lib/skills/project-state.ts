import type {
  AnySkillDefinition,
  AnySkillState,
  ProjectMetadata,
  ProjectState,
  StatePatch,
  StatePatchOperation,
} from "@/types/skill";

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function cloneProjectState(projectState: ProjectState): ProjectState {
  return structuredClone(projectState);
}

export function createInitialProjectState(skill: AnySkillDefinition): ProjectState {
  return {
    skill: skill.id,
    state: structuredClone(skill.initialState),
    version: 0,
    artifacts: [],
    metadata: {},
  };
}

export function normalizeProjectStateForSkill(
  value: unknown,
  skill: AnySkillDefinition,
): ProjectState {
  if (!isRecord(value)) {
    return createInitialProjectState(skill);
  }

  const projectState = value as Partial<ProjectState>;

  if (
    projectState.skill !== skill.id ||
    !isRecord(projectState.state) ||
    typeof projectState.version !== "number" ||
    !Array.isArray(projectState.artifacts) ||
    !isRecord(projectState.metadata)
  ) {
    return createInitialProjectState(skill);
  }

  return {
    skill: projectState.skill,
    state: projectState.state as AnySkillState,
    version: projectState.version,
    artifacts: projectState.artifacts,
    metadata: projectState.metadata as ProjectMetadata,
  };
}

function splitPatchPath(path: string) {
  return path
    .split(".")
    .map((part) => part.trim())
    .filter(Boolean);
}

function resolvePatchPath(projectState: ProjectState, path: string) {
  const parts = splitPatchPath(path);
  const [scope, ...rest] = parts;

  if (scope === "metadata") {
    return {
      root: projectState.metadata as Record<string, unknown>,
      parts: rest,
    };
  }

  if (scope === "state") {
    return {
      root: projectState.state as Record<string, unknown>,
      parts: rest,
    };
  }

  return {
    root: projectState.state as Record<string, unknown>,
    parts,
  };
}

function getParentContainer(
  root: Record<string, unknown>,
  parts: string[],
  createMissing: boolean,
) {
  if (parts.length === 0) {
    return { parent: null, key: "" };
  }

  let current = root;

  for (const part of parts.slice(0, -1)) {
    const next = current[part];

    if (next === undefined && createMissing) {
      current[part] = {};
    } else if (!isRecord(next)) {
      throw new Error(`Invalid patch path: ${parts.join(".")}`);
    }

    current = current[part] as Record<string, unknown>;
  }

  return {
    parent: current,
    key: parts[parts.length - 1],
  };
}

function setPatchValue(projectState: ProjectState, operation: StatePatchOperation) {
  const target = resolvePatchPath(projectState, operation.path);

  if (target.parts.length === 0) {
    if (operation.op === "set") {
      if (operation.path === "metadata") {
        if (!isRecord(operation.value)) {
          throw new Error("metadata must be an object");
        }
        projectState.metadata = operation.value;
        return;
      }

      if (!isRecord(operation.value)) {
        throw new Error("state must be an object");
      }
      projectState.state = operation.value as AnySkillState;
      return;
    }

    if (operation.op === "merge") {
      Object.assign(target.root, operation.value);
      return;
    }
  }

  const { parent, key } = getParentContainer(target.root, target.parts, true);

  if (!parent) {
    throw new Error(`Invalid patch path: ${operation.path}`);
  }

  if (operation.op === "set") {
    parent[key] = operation.value;
    return;
  }

  if (operation.op === "merge") {
    const existingValue = parent[key];

    if (existingValue === undefined) {
      parent[key] = {};
    } else if (!isRecord(existingValue)) {
      throw new Error(`Patch merge target is not an object: ${operation.path}`);
    }

    Object.assign(parent[key] as Record<string, unknown>, operation.value);
  }
}

function getArrayTarget(projectState: ProjectState, path: string) {
  const target = resolvePatchPath(projectState, path);
  const { parent, key } = getParentContainer(target.root, target.parts, true);

  if (!parent) {
    throw new Error(`Invalid array patch path: ${path}`);
  }

  if (parent[key] === undefined) {
    parent[key] = [];
  }

  if (!Array.isArray(parent[key])) {
    throw new Error(`Patch array target is not an array: ${path}`);
  }

  return parent[key] as unknown[];
}

function getArrayItemId(item: unknown) {
  if (isRecord(item) && typeof item.id === "string") {
    return item.id;
  }

  return null;
}

export function applyStatePatchToProjectState(
  currentProjectState: ProjectState,
  patch: StatePatch,
  metadata: ProjectMetadata,
) {
  const nextProjectState = cloneProjectState(currentProjectState);

  for (const operation of patch.operations) {
    if (operation.op === "set" || operation.op === "merge") {
      setPatchValue(nextProjectState, operation);
      continue;
    }

    const targetArray = getArrayTarget(nextProjectState, operation.path);

    for (const arrayOperation of operation.operations) {
      if (arrayOperation.op === "push") {
        targetArray.push(arrayOperation.value);
        continue;
      }

      const targetIndex = targetArray.findIndex(
        (item) => getArrayItemId(item) === arrayOperation.id,
      );

      if (targetIndex < 0) {
        throw new Error(`Array item not found: ${arrayOperation.id}`);
      }

      if (arrayOperation.op === "remove") {
        targetArray.splice(targetIndex, 1);
        continue;
      }

      if (arrayOperation.op === "replace") {
        targetArray[targetIndex] = arrayOperation.value;
        continue;
      }

      const existingItem = targetArray[targetIndex];

      if (!isRecord(existingItem)) {
        throw new Error(`Array item is not an object: ${arrayOperation.id}`);
      }

      targetArray[targetIndex] = {
        ...existingItem,
        ...arrayOperation.value,
      };
    }
  }

  nextProjectState.version += 1;
  nextProjectState.metadata = {
    ...nextProjectState.metadata,
    ...metadata,
  };

  return nextProjectState;
}
