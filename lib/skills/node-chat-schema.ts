import { z } from "zod";

import { simpleSkillOutputSchema } from "@/lib/skills/ai-output-schema";

export const nodeChatActionSchema = z.enum(["answer", "update_node"]);

export const nodeChatWritePolicySchema = z.enum(["none", "commit"]);

export const nodeChatDecisionSchema = z
  .object({
    action: nodeChatActionSchema,
    write: nodeChatWritePolicySchema,
    message: z.string(),
    reason: z.string().optional(),
  })
  .strict();

export const nodeToolNameSchema = z.enum(["write_node_state"]);

export const nodeToolCallSchema = z
  .object({
    name: nodeToolNameSchema,
    status: z.enum(["success", "error"]),
    progress: z.array(z.string()),
    summary: z.string().optional(),
  })
  .strict();

export const nodeChatResultSchema = z
  .object({
    message: z.string(),
    toolCalls: z.array(nodeToolCallSchema),
    output: simpleSkillOutputSchema.optional(),
    write: nodeChatWritePolicySchema,
  })
  .strict();

export type NodeChatAction = z.infer<typeof nodeChatActionSchema>;
export type NodeChatWritePolicy = z.infer<typeof nodeChatWritePolicySchema>;
export type NodeChatDecision = z.infer<typeof nodeChatDecisionSchema>;
export type NodeToolCall = z.infer<typeof nodeToolCallSchema>;
export type NodeToolName = z.infer<typeof nodeToolNameSchema>;
export type NodeChatResult = z.infer<typeof nodeChatResultSchema>;
