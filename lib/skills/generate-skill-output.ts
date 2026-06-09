import { Output, streamText, type LanguageModel, type ModelMessage } from "ai";

import { simpleSkillOutputSchema } from "@/lib/skills/ai-output-schema";
import type { SimpleSkillOutput } from "@/types/skill";
import { getErrorMessage } from "@/utils/error-message";

export async function generateSkillOutput({
  model,
  system,
  messages,
  onPartialMessage,
}: {
  model: LanguageModel;
  system: string;
  messages: ModelMessage[];
  onPartialMessage?: (message: string) => void;
}): Promise<SimpleSkillOutput> {
  const result = streamText({
    model,
    system,
    messages,
    output: Output.object({
      schema: simpleSkillOutputSchema,
    }),
  });

  for await (const partialOutput of result.partialOutputStream) {
    if (partialOutput.message) {
      onPartialMessage?.(partialOutput.message);
    }
  }

  return await result.output;
}

export function createSkillOutputErrorMessage({
  error,
  streamedMessage,
}: {
  error: unknown;
  streamedMessage: string;
}) {
  const detail = getErrorMessage(error, "未知错误");

  if (streamedMessage.trim()) {
    return `${streamedMessage.trim()}\n\n生成失败：${detail}`;
  }

  return `结构化结果生成失败：${detail}`;
}
