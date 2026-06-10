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
- update_node：用户要求生成、创建、修改、整理、优化、保存或写入当前节点内容。

write 只能是：
- answer 使用 "none"。
- update_node 使用 "commit"。

判定规则（按优先级）：
1. 用户明确说"写入节点"、"写入文档"、"保存"、"写入"、"提交"、"更新节点"、"把…写入"等持久化意图时，用 update_node。
2. 用户要求生成、起草、修订、扩写、优化文档内容时，用 update_node。
3. 用户提问、咨询、寻求建议，或询问节点的状态/能力时，用 answer。
4. 用户要求新建画布节点、连接节点、跨节点编排等画布操作（而非编辑节点内容）时，用 answer。

示例（直接参考，不要偏离）：
- "写一篇关于 XX 的文章" → update_node
- "把上面的故事写入当前节点" → update_node
- "请把这段内容写入文档" → update_node
- "写入节点" → update_node
- "写入文档" → update_node
- "保存" → update_node
- "这篇文章写得好吗？" → answer
- "这个节点能做什么？" → answer
- "帮我新建一个节点" → answer

以 JSON 格式输出结果，message 用一句中文说明判断。`;
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
