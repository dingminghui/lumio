import { z } from "zod";

import type { SimpleSkillOutput } from "@/types/skill";

export const simpleSkillOutputSchema: z.ZodType<SimpleSkillOutput> = z.object({
  message: z.string(),
  state: z.record(z.string(), z.unknown()),
});

/** @deprecated Use simpleSkillOutputSchema */
export const aiOutputSchema = simpleSkillOutputSchema;
