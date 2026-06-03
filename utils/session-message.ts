import type { UIMessage } from "ai";

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

export function toUiMessage(message: StoredTextMessage): UIMessage {
  return {
    id: message.id,
    role: message.role,
    parts: [{ type: "text", text: message.content }],
  };
}

export function getUiMessageText(message: UIMessage) {
  return message.parts
    .filter((part) => part.type === "text")
    .map((part) => part.text)
    .join("");
}

export function toStoredTextMessages(messages: UIMessage[]): StoredTextMessage[] {
  const now = new Date().toISOString();

  return messages
    .filter((message): message is UIMessage & { role: StoredMessageRole } =>
      isStoredMessageRole(message.role),
    )
    .map((message) => ({
      id: message.id,
      role: message.role,
      content: getUiMessageText(message),
      createdAt: now,
    }));
}
