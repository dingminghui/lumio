import type { UIMessage } from "ai";

import { aiOutputSchema } from "@/lib/skills/ai-output-schema";
import type { AIOutput } from "@/types/skill";

export type LumioUIMessage = UIMessage<
  never,
  {
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

export function toUiMessage(message: StoredTextMessage): LumioUIMessage {
  const output =
    message.role === "assistant" ? parseStoredAIOutput(message.content) : null;

  if (output) {
    return {
      id: message.id,
      role: message.role,
      parts: [
        { type: "text", text: output.message },
        ...(output.output
          ? [{ type: "data-skill-output" as const, data: output.output }]
          : []),
      ],
    };
  }

  return {
    id: message.id,
    role: message.role,
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

function getSkillOutput(message: LumioUIMessage) {
  const outputPart = message.parts.find((part) => part.type === "data-skill-output");

  return outputPart?.data ?? null;
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
        message.role === "assistant" && getSkillOutput(message)
          ? JSON.stringify(getSkillOutput(message))
          : getUiMessageText(message),
      createdAt: now,
    }));
}
