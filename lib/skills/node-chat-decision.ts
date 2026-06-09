import { generateText, Output, type LanguageModel, type ModelMessage } from "ai";

import {
  nodeChatDecisionSchema,
  type NodeChatDecision,
} from "@/lib/skills/node-chat-schema";
import type { SkillManifest } from "@/types/skill";

function createDecisionSystemPrompt({
  manifest,
  itemState,
}: {
  manifest: SkillManifest;
  itemState: Record<string, unknown>;
}) {
  return `你是 Lumio 节点会话的动作路由器。你只判断本轮用户消息应该做什么，不生成最终节点内容。

当前节点：
- skillId: ${manifest.id}
- skillName: ${manifest.name}
- description: ${manifest.description}

当前节点状态：
${JSON.stringify(itemState, null, 2)}

action 只能是：
- answer：用户只是提问、咨询、解释、评估、建议，或请求不属于当前节点能力。
- update_node：用户要求创建、修改、整理、优化当前节点内容。

write 只能是：
- answer 使用 "none"。
- update_node 使用 "commit"。

判定规则：
- 用户问"这个节点现在是什么状态/能做什么/怎么做"时，用 answer。
- 用户要求生成、修订、优化文档内容时，用 update_node。
- 不要把创建节点、连线、跨节点编排判定为当前节点写入；这类请求用 answer。

message 用一句中文说明判断。`;
}

function normalizeDecision(decision: NodeChatDecision): NodeChatDecision {
  if (decision.action === "answer") {
    return { ...decision, write: "none" };
  }

  return { ...decision, write: "commit" };
}

export async function decideNodeChatAction({
  model,
  messages,
  manifest,
  itemState,
}: {
  model: LanguageModel;
  messages: ModelMessage[];
  manifest: SkillManifest;
  itemState: Record<string, unknown>;
  latestUserMessage?: string;
}): Promise<NodeChatDecision> {
  try {
    const result = await generateText({
      model,
      system: createDecisionSystemPrompt({ manifest, itemState }),
      messages,
      output: Output.object({
        schema: nodeChatDecisionSchema,
      }),
    });

    return normalizeDecision(result.output);
  } catch (error) {
    console.warn("Failed to decide node chat action", error);

    return {
      action: "answer",
      write: "none",
      message: "暂时无法可靠判断是否应该写入节点，因此先按普通问答处理。",
    };
  }
}
