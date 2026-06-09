import { streamText, type LanguageModel, type ModelMessage } from "ai";

import {
  createSkillOutputErrorMessage,
  generateSkillOutput,
} from "@/lib/skills/generate-skill-output";
import {
  type NodeChatDecision,
  type NodeChatResult,
} from "@/lib/skills/node-chat-schema";
import { createSkillSystemPrompt } from "@/lib/skills/system-prompt";
import type { SkillManifest } from "@/types/skill";

type NodeChatItem = {
  id: string;
  projectId: string;
  skillId: string;
  state: Record<string, unknown>;
};

type ExecuteNodeChatActionOptions = {
  projectId: string;
  item: NodeChatItem;
  manifest: SkillManifest;
  decision: NodeChatDecision;
  model: LanguageModel;
  modelMessages: ModelMessage[];
  onText: (delta: string) => void;
};

function createAnswerSystemPrompt({
  manifest,
  itemState,
}: {
  manifest: SkillManifest;
  itemState: Record<string, unknown>;
}) {
  return `你是 Lumio 的节点会话助手。请用中文自然回答用户的问题。

当前节点：
- skillId: ${manifest.id}
- skillName: ${manifest.name}
- description: ${manifest.description}

当前节点状态：
${JSON.stringify(itemState, null, 2)}

规则：
- 只回答用户问题，不输出 JSON。
- 不要声称已经修改、保存或写入节点。
- 如果用户想调用的能力不属于当前节点，简短说明应该切换到对应节点。`;
}

async function executeAnswer({
  manifest,
  item,
  decision,
  model,
  modelMessages,
  onText,
}: ExecuteNodeChatActionOptions): Promise<NodeChatResult> {
  let message = "";
  const result = streamText({
    model,
    system: createAnswerSystemPrompt({
      manifest,
      itemState: item.state,
    }),
    messages: modelMessages,
  });

  for await (const delta of result.textStream) {
    onText(delta);
    message += delta;
  }

  return {
    message: message.trim() || decision.message,
    toolCalls: [],
    write: "none",
  };
}

async function executeSkillUpdate({
  item,
  manifest,
  decision,
  model,
  modelMessages,
  onText,
}: ExecuteNodeChatActionOptions): Promise<NodeChatResult> {
  let streamedMessage = "";

  function writeMessage(nextMessage: string) {
    if (!nextMessage || nextMessage === streamedMessage) {
      return;
    }

    if (!nextMessage.startsWith(streamedMessage)) {
      return;
    }

    onText(nextMessage.slice(streamedMessage.length));
    streamedMessage = nextMessage;
  }

  try {
    const output = await generateSkillOutput({
      model,
      system: createSkillSystemPrompt({
        manifest,
        itemState: item.state,
      }),
      messages: modelMessages,
      onPartialMessage: writeMessage,
    });

    writeMessage(output.message);

    return {
      message: output.message,
      toolCalls: [],
      output,
      write: decision.write,
    };
  } catch (error) {
    const message = createSkillOutputErrorMessage({ error, streamedMessage });
    const output = {
      message,
      state: {
        ...item.state,
        status: "error",
        error: message,
      },
    };

    writeMessage(message);

    return {
      message,
      toolCalls: [],
      output,
      write: decision.write,
    };
  }
}

export async function executeNodeChatAction(
  options: ExecuteNodeChatActionOptions,
): Promise<NodeChatResult> {
  if (options.decision.action === "answer") {
    return executeAnswer(options);
  }

  return executeSkillUpdate(options);
}
