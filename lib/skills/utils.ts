import type { AnySkillState, DerivedStage, StageRule } from "@/types/skill";

export function deriveStageFromRules<TState extends AnySkillState>(
  stages: StageRule<TState>[],
  state: TState,
): DerivedStage<TState> {
  const matched = stages
    .filter((rule) => rule.condition(state))
    .sort((a, b) => b.priority - a.priority);

  const stage = matched[0];

  if (!stage) {
    throw new Error("No stage rule matched for current state");
  }

  return stage;
}
