import { parseJsonEventStream, readUIMessageStream, uiMessageChunkSchema } from "ai";
import { nanoid } from "nanoid";

import { simpleSkillOutputSchema } from "@/lib/skills/ai-output-schema";
import type { ModelProviderId } from "@/lib/model-providers";
import type { SimpleSkillOutput } from "@/types/skill";
import {
  toUiMessage,
  type LumioUIMessage,
  type StoredTextMessage,
} from "@/utils/session-message";

export async function requestItemGeneration({
  projectId,
  itemId,
  provider,
  existingMessages,
  prompt = "生成长图",
}: {
  projectId: string;
  itemId: string;
  provider: ModelProviderId;
  existingMessages: StoredTextMessage[];
  prompt?: string;
}): Promise<{
  output: SimpleSkillOutput | null;
  messages: LumioUIMessage[];
  error?: string;
}> {
  const uiMessages: LumioUIMessage[] = [
    ...existingMessages.map(toUiMessage),
    {
      id: nanoid(),
      role: "user",
      parts: [{ type: "text", text: prompt }],
    },
  ];

  const response = await fetch(`/api/projects/${projectId}/items/${itemId}/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ messages: uiMessages, provider }),
  });

  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as {
      error?: string;
    } | null;

    return {
      output: null,
      messages: uiMessages,
      error: payload?.error ?? `请求失败（${response.status}）`,
    };
  }

  if (!response.body) {
    return {
      output: null,
      messages: uiMessages,
      error: "响应为空",
    };
  }

  const chunkStream = parseJsonEventStream({
    stream: response.body,
    schema: uiMessageChunkSchema,
  }).pipeThrough(
    new TransformStream({
      transform(chunk, controller) {
        if (!chunk.success) {
          throw chunk.error;
        }

        controller.enqueue(chunk.value);
      },
    }),
  );

  let output: SimpleSkillOutput | null = null;
  let assistantMessage: LumioUIMessage | null = null;

  for await (const message of readUIMessageStream<LumioUIMessage>({
    stream: chunkStream,
  })) {
    assistantMessage = message;

    const outputPart = message.parts.find(
      (part) => part.type === "data-skill-output",
    );

    if (outputPart && "data" in outputPart) {
      const parsed = simpleSkillOutputSchema.safeParse(outputPart.data);

      if (parsed.success) {
        output = parsed.data;
      }
    }
  }

  const messages = assistantMessage
    ? [...uiMessages, assistantMessage]
    : uiMessages;

  if (!output) {
    return {
      output: null,
      messages,
      error: "未收到有效的节点更新结果",
    };
  }

  return { output, messages };
}
