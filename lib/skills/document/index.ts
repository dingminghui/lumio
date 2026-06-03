import { documentActions } from "@/lib/skills/document/actions";
import { documentInitialState } from "@/lib/skills/document/initial-state";
import { documentMeta } from "@/lib/skills/document/meta";
import { documentStateSchema } from "@/lib/skills/document/state-schema";
import { deriveDocumentStage, documentStages } from "@/lib/skills/document/stages";
import type { DocumentState, SkillDefinition } from "@/types/skill";

import systemPrompt from "./system-prompt.md";

export const documentSkill: SkillDefinition<DocumentState> = {
  ...documentMeta,
  systemPrompt,
  stateSchema: documentStateSchema,
  initialState: documentInitialState,
  actions: documentActions,
  stages: documentStages,
  deriveStage: deriveDocumentStage,
};
