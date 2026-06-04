import type { LucideIcon } from "lucide-react";

// ---------------------------------------------------------------------------
// Skill categories
// ---------------------------------------------------------------------------

export const SKILL_CATEGORIES = ["all", "document", "image"] as const;

export type SkillCategory = Exclude<(typeof SKILL_CATEGORIES)[number], "all">;

export type SkillCategoryFilter = (typeof SKILL_CATEGORIES)[number];

// ---------------------------------------------------------------------------
// JSON Schema (manifest)
// ---------------------------------------------------------------------------

export type JSONSchemaObject = {
  type?: string;
  properties?: Record<string, JSONSchemaProperty>;
  items?: JSONSchemaObject;
  [key: string]: unknown;
};

export type JSONSchemaProperty = {
  type?: string;
  title?: string;
  description?: string;
  items?: JSONSchemaObject;
  [key: string]: unknown;
};

export type SkillId = string;

export type BaseSkillState = Record<string, unknown>;

// ---------------------------------------------------------------------------
// Stage derivation (declarative only)
// ---------------------------------------------------------------------------

export type DeclarativeStageConditionOp =
  | "missing"
  | "present"
  | "array_empty"
  | "array_nonempty";

export type DeclarativeStageCondition = {
  op: DeclarativeStageConditionOp;
  paths: string[];
  and?: DeclarativeStageCondition[];
};

export type DeclarativeStageRule = {
  id: string;
  label: string;
  description: string;
  priority: number;
  condition: DeclarativeStageCondition;
};

export type SkillStage = {
  id: string;
  label: string;
  description: string;
  priority: number;
};

// ---------------------------------------------------------------------------
// AI output
// ---------------------------------------------------------------------------

export type SimpleSkillOutput = {
  message: string;
  state: Record<string, unknown>;
};

/** @deprecated Use SimpleSkillOutput */
export type AIOutput = SimpleSkillOutput;

// ---------------------------------------------------------------------------
// Skill manifests
// ---------------------------------------------------------------------------

export type SkillAction = {
  id: string;
  label: string;
  description?: string;
};

export type SkillCanvasConfig = {
  nodeType: string;
  defaultSize?: { w: number; h: number };
  isComposer?: boolean;
};

export type SkillManifest = {
  source: "builtin";
  id: string;
  version: string;
  name: string;
  description: string;
  category: SkillCategory;
  icon?: LucideIcon;
  stateSchema: JSONSchemaObject;
  initialState: Record<string, unknown>;
  stages: DeclarativeStageRule[];
  actions: SkillAction[];
  prompts: { system: string };
  canvas: SkillCanvasConfig;
};

// ---------------------------------------------------------------------------
// Canvas item (runtime / DB row shape)
// ---------------------------------------------------------------------------

export type CanvasItemRow = {
  id: string;
  projectId: string;
  skillId: string;
  state: Record<string, unknown>;
  positionX: number;
  positionY: number;
  width: number;
  height: number;
  createdAt: string;
  updatedAt: string;
};

export type CanvasItemData = Pick<
  CanvasItemRow,
  | "id"
  | "projectId"
  | "skillId"
  | "state"
  | "positionX"
  | "positionY"
  | "width"
  | "height"
>;

export type CanvasEdgeRow = {
  id: string;
  projectId: string;
  sourceItemId: string;
  targetItemId: string;
  createdAt: string;
};
