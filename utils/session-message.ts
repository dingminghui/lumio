import type { UIMessage } from "ai";

import { aiOutputSchema } from "@/lib/skills/ai-output-schema";
import {
  nodeChatResultSchema,
  type NodeChatResult,
} from "@/lib/skills/node-chat-schema";
import type { AIOutput } from "@/types/skill";

type LumioMessageMetadata = {
  createdAt?: string;
};

export type LumioUIMessage = UIMessage<
  LumioMessageMetadata,
  {
    "node-chat-result": NodeChatResult;
    "skill-output": AIOutput;
  }
>;

export const SESSION_MESSAGE_ROLES = ["user", "assistant"] as const;

export type StoredMessageRole = (typeof SESSION_MESSAGE_ROLES)[number];

export type StoredTextMessage = {
  id: string;
  role: StoredMessageRole;
  content: string;
  createdAt: string;
};

export function isStoredMessageRole(
  role: UIMessage["role"],
): role is StoredMessageRole {
  return role === "user" || role === "assistant";
}

function parseStoredAIOutput(content: string) {
  try {
    const parsed = JSON.parse(content);
    const result = aiOutputSchema.safeParse(parsed);

    if (result.success) {
      return {
        message: result.data.message,
        output: result.data,
      };
    }

    if (
      parsed &&
      typeof parsed === "object" &&
      "message" in parsed &&
      typeof parsed.message === "string"
    ) {
      return {
        message: parsed.message,
        output: null,
      };
    }
  } catch {
    return null;
  }

  return null;
}

function parseStoredNodeChatResult(content: string) {
  try {
    const parsed = JSON.parse(content);
    const result = nodeChatResultSchema.safeParse(parsed);

    return result.success ? result.data : null;
  } catch {
    return null;
  }
}

function formatNodeChatResultText(result: NodeChatResult) {
  const progress = result.toolCalls.flatMap((toolCall) => toolCall.progress);

  return [...progress, result.message].filter(Boolean).join("\n\n");
}

function getAssistantDisplayText(content: string) {
  const nodeChatResult = parseStoredNodeChatResult(content);

  if (nodeChatResult) {
    return formatNodeChatResultText(nodeChatResult);
  }

  const parsed = parseStoredAIOutput(content);

  if (parsed?.message) {
    return parsed.message;
  }

  try {
    const value = JSON.parse(content) as { message?: unknown };

    if (typeof value.message === "string" && value.message.trim()) {
      return value.message;
    }
  } catch {
    return content;
  }

  return content;
}

export function toUiMessage(message: StoredTextMessage): LumioUIMessage {
  const nodeChatResult =
    message.role === "assistant" ? parseStoredNodeChatResult(message.content) : null;

  if (nodeChatResult) {
    return {
      id: message.id,
      role: message.role,
      metadata: { createdAt: message.createdAt },
      parts: [
        { type: "text", text: formatNodeChatResultText(nodeChatResult) },
        { type: "data-node-chat-result", data: nodeChatResult },
        ...(nodeChatResult.output
          ? [{ type: "data-skill-output" as const, data: nodeChatResult.output }]
          : []),
      ],
    };
  }

  const output =
    message.role === "assistant" ? parseStoredAIOutput(message.content) : null;

  if (output) {
    return {
      id: message.id,
      role: message.role,
      metadata: { createdAt: message.createdAt },
      parts: [
        { type: "text", text: output.message },
        ...(output.output
          ? [{ type: "data-skill-output" as const, data: output.output }]
          : []),
      ],
    };
  }

  if (message.role === "assistant") {
    return {
      id: message.id,
      role: message.role,
      metadata: { createdAt: message.createdAt },
      parts: [{ type: "text", text: getAssistantDisplayText(message.content) }],
    };
  }

  return {
    id: message.id,
    role: message.role,
    metadata: { createdAt: message.createdAt },
    parts: [{ type: "text", text: message.content }],
  };
}

function isTextPart(part: unknown): part is { type: "text"; text: string } {
  if (!part || typeof part !== "object") {
    return false;
  }

  const record = part as Record<string, unknown>;

  return record.type === "text" && typeof record.text === "string";
}

export function getUiMessageText(message: UIMessage | LumioUIMessage) {
  return message.parts.map((part) => (isTextPart(part) ? part.text : "")).join("");
}

/** 发给模型时只保留文本，避免 data-skill-output 等自定义 part 干扰结构化输出 */
export function toTextOnlyUiMessages(messages: LumioUIMessage[]): LumioUIMessage[] {
  const textOnlyMessages: LumioUIMessage[] = [];

  for (const message of messages) {
    const text =
      message.role === "assistant"
        ? getNodeChatResult(message)?.message?.trim() || getUiMessageText(message).trim()
        : getUiMessageText(message).trim();

    if (!text || message.role === "system") {
      continue;
    }

    textOnlyMessages.push({
      id: message.id,
      role: message.role,
      metadata: message.metadata,
      parts: [{ type: "text", text }],
    });
  }

  return textOnlyMessages;
}

function getSkillOutput(message: LumioUIMessage) {
  const outputPart = message.parts.find((part) => part.type === "data-skill-output");

  return outputPart?.data ?? null;
}

function getNodeChatResult(message: LumioUIMessage) {
  const resultPart = message.parts.find(
    (part) => part.type === "data-node-chat-result",
  );

  return resultPart?.data ?? null;
}

export function getSkillOutputFromNodeChatResult(
  result: NodeChatResult,
): AIOutput | null {
  if (result.write === "commit" && result.output) {
    return result.output;
  }

  return null;
}

/** 从 UI 消息中提取应写入画布的 skill output（优先 data-skill-output，其次 commit 的 node-chat-result） */
export function getSkillOutputFromUiMessage(
  message: LumioUIMessage,
): AIOutput | null {
  const skillOutput = getSkillOutput(message);

  if (skillOutput) {
    return skillOutput;
  }

  const nodeChatResult = getNodeChatResult(message);

  return nodeChatResult ? getSkillOutputFromNodeChatResult(nodeChatResult) : null;
}

export function toStoredTextMessages(messages: LumioUIMessage[]): StoredTextMessage[] {
  const now = new Date().toISOString();

  return messages
    .filter((message): message is LumioUIMessage & { role: StoredMessageRole } =>
      isStoredMessageRole(message.role),
    )
    .map((message) => ({
      id: message.id,
      role: message.role,
      content:
        message.role === "assistant" && getNodeChatResult(message)
          ? JSON.stringify(getNodeChatResult(message))
          : message.role === "assistant" && getSkillOutput(message)
            ? JSON.stringify(getSkillOutput(message))
            : getUiMessageText(message).trim(),
      createdAt: message.metadata?.createdAt ?? now,
    }))
    .filter((message) => message.content.length > 0);
}
