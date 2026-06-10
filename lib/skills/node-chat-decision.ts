import { generateText, Output, type LanguageModel, type ModelMessage } from "ai";

import {
  nodeChatDecisionSchema,
  type NodeChatDecision,
} from "@/lib/skills/node-chat-schema";
import type { SkillManifest } from "@/types/skill";

function createDecisionSystemPrompt({ manifest }: { manifest: SkillManifest }) {
  return `你是对话路由器，判断用户意图并输出 JSON。

节点：${manifest.name}——${manifest.description}

action 取值：
- update_node：用户要生成、修改、保存、写入节点内容
- answer：用户在提问或咨询

示例：
- "写一篇文章" / "把故事写入节点" / "写入文档" / "保存" → update_node
- "这篇写得好吗" / "节点能做什么" / "帮我新建节点" → answer

输出 JSON：{ "action": "answer"|"update_node", "write": "none"|"commit", "message": "一句中文说明" }
write 与 action 对应：answer→none，update_node→commit。`;
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
}: {
  model: LanguageModel;
  messages: ModelMessage[];
  manifest: SkillManifest;
  itemState?: Record<string, unknown>;
  latestUserMessage?: string;
}): Promise<NodeChatDecision> {
  try {
    const result = await generateText({
      model,
      system: createDecisionSystemPrompt({ manifest }),
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
