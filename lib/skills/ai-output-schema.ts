import { z } from "zod";

import type { AIOutput } from "@/types/skill";

const patchSetOperationSchema = z
  .object({
    op: z.literal("set"),
    path: z.string().min(1),
    value: z.unknown(),
  })
  .strict();

const patchMergeOperationSchema = z
  .object({
    op: z.literal("merge"),
    path: z.string().min(1),
    value: z.record(z.string(), z.unknown()),
  })
  .strict();

const patchArrayOpSchema = z.discriminatedUnion("op", [
  z
    .object({
      op: z.literal("push"),
      value: z.unknown(),
    })
    .strict(),
  z
    .object({
      op: z.literal("update"),
      id: z.string().min(1),
      value: z.record(z.string(), z.unknown()),
    })
    .strict(),
  z
    .object({
      op: z.literal("remove"),
      id: z.string().min(1),
    })
    .strict(),
  z
    .object({
      op: z.literal("replace"),
      id: z.string().min(1),
      value: z.unknown(),
    })
    .strict(),
]);

const patchArrayOperationSchema = z
  .object({
    op: z.literal("array"),
    path: z.string().min(1),
    operations: z.array(patchArrayOpSchema),
  })
  .strict();

export const statePatchSchema = z
  .object({
    operations: z.array(
      z.discriminatedUnion("op", [
        patchSetOperationSchema,
        patchMergeOperationSchema,
        patchArrayOperationSchema,
      ]),
    ),
  })
  .strict();

export const aiOutputSchema: z.ZodType<AIOutput> = z
  .object({
    action: z.string().min(1),
    patch: statePatchSchema,
    message: z.string(),
    nextAction: z.string().min(1).optional(),
  })
  .strict();
