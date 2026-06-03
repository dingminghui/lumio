import type { LucideIcon } from "lucide-react";

// ---------------------------------------------------------------------------
// Skill categories
// ---------------------------------------------------------------------------

export const SKILL_CATEGORIES = ["all", "document"] as const;

export type SkillCategory = Exclude<(typeof SKILL_CATEGORIES)[number], "all">;

export type SkillCategoryFilter = (typeof SKILL_CATEGORIES)[number];

// ---------------------------------------------------------------------------
// Skill-specific state shapes
// ---------------------------------------------------------------------------

export type DocumentSection = {
  id: string;
  title: string;
  content: string;
  order: number;
};

export type DocumentState = {
  title?: string;
  brief?: string;
  sections?: DocumentSection[];
  exportUrl?: string;
};

/** Skill state shapes keyed by skill id */
export type SkillStateMap = {
  document: DocumentState;
};

export type SkillId = keyof SkillStateMap;

export type AnySkillState = SkillStateMap[SkillId];

// ---------------------------------------------------------------------------
// Project state (single source of truth in DB)
// ---------------------------------------------------------------------------

export type Artifact = {
  id: string;
  type: "file" | "export" | "preview";
  name: string;
  url?: string;
  mimeType?: string;
  createdAt: string;
};

export type ProjectMetadata = {
  lastUserMessage?: string;
  lastStage?: string;
  [key: string]: unknown;
};

/**
 * Unified project state persisted per project.
 * `state` holds skill-specific data; version increments on each patch apply.
 */
export type ProjectState<TState extends AnySkillState = AnySkillState> = {
  /** Skill id this project is bound to */
  skill: SkillId;
  /** Skill-specific structured state */
  state: TState;
  /** Monotonic version for optimistic concurrency / audit */
  version: number;
  /** Generated outputs (exports, files, previews) */
  artifacts: Artifact[];
  /** Cross-cutting metadata (not used for stage derivation) */
  metadata: ProjectMetadata;
};

// ---------------------------------------------------------------------------
// Stage derivation (pure functions, no AI)
// ---------------------------------------------------------------------------

export type StageRule<TState extends AnySkillState> = {
  id: string;
  label: string;
  description: string;
  priority: number;
  condition: (state: TState) => boolean;
};

export type DerivedStage<TState extends AnySkillState> = StageRule<TState>;

// ---------------------------------------------------------------------------
// Patch system
// ---------------------------------------------------------------------------

export type PatchSetOperation = {
  op: "set";
  path: string;
  value: unknown;
};

export type PatchMergeOperation = {
  op: "merge";
  path: string;
  value: Record<string, unknown>;
};

export type PatchArrayOp =
  | { op: "push"; value: unknown }
  | { op: "update"; id: string; value: Record<string, unknown> }
  | { op: "remove"; id: string }
  | { op: "replace"; id: string; value: unknown };

export type PatchArrayOperation = {
  op: "array";
  path: string;
  operations: PatchArrayOp[];
};

export type StatePatchOperation =
  | PatchSetOperation
  | PatchMergeOperation
  | PatchArrayOperation;

/** Partial update to project state; applied via applyPatch (future) */
export type StatePatch = {
  operations: StatePatchOperation[];
};

// ---------------------------------------------------------------------------
// AI output (structured response; not implemented in chat yet)
// ---------------------------------------------------------------------------

export type AIOutput = {
  action: string;
  patch: StatePatch;
  message: string;
  nextAction?: string;
};

// ---------------------------------------------------------------------------
// Skill definition
// ---------------------------------------------------------------------------

export type SkillAction = {
  id: string;
  label: string;
  description?: string;
};

export type SkillDefinition<TState extends AnySkillState = AnySkillState> = {
  id: SkillId;
  name: string;
  description: string;
  category: SkillCategory;
  icon: LucideIcon;
  systemPrompt: string;
  /** JSON-schema-like description for docs / future validation */
  stateSchema: Record<string, unknown>;
  initialState: TState;
  actions: SkillAction[];
  stages: StageRule<TState>[];
  deriveStage: (state: TState) => DerivedStage<TState>;
};

export type AnySkillDefinition = SkillDefinition<DocumentState>;
