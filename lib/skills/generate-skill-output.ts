import {
  generateText,
  Output,
  streamText,
  type LanguageModel,
  type ModelMessage,
} from "ai";

import { simpleSkillOutputSchema } from "@/lib/skills/ai-output-schema";
import type { SimpleSkillOutput } from "@/types/skill";

function parseSkillOutputFromText(text: string): SimpleSkillOutput | null {
  const trimmed = text.trim();
  const jsonMatch = trimmed.match(/\{[\s\S]*\}/);

  if (!jsonMatch) {
    return null;
  }

  try {
    const parsed = JSON.parse(jsonMatch[0]) as unknown;
    const result = simpleSkillOutputSchema.safeParse(parsed);

    return result.success ? result.data : null;
  } catch {
    return null;
  }
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "未知错误";
}

export async function generateSkillOutput({
  model,
  system,
  messages,
  onPartialMessage,
  initialMessage,
  suppressPartialMessage = false,
}: {
  model: LanguageModel;
  system: string;
  messages: ModelMessage[];
  onPartialMessage?: (message: string) => void;
  initialMessage?: string;
  suppressPartialMessage?: boolean;
}): Promise<SimpleSkillOutput> {
  if (initialMessage) {
    onPartialMessage?.(initialMessage);
  }

  try {
    const result = streamText({
      model,
      system,
      messages,
      output: Output.object({
        schema: simpleSkillOutputSchema,
      }),
    });

    for await (const partialOutput of result.partialOutputStream) {
      if (!suppressPartialMessage && partialOutput.message) {
        onPartialMessage?.(partialOutput.message);
      }
    }

    return await result.output;
  } catch (streamError) {
    console.warn(
      "streamText structured output failed, falling back to generateText",
      streamError,
    );
  }

  try {
    const result = await generateText({
      model,
      system,
      messages,
      output: Output.object({
        schema: simpleSkillOutputSchema,
      }),
    });

    if (!suppressPartialMessage) {
      onPartialMessage?.(result.output.message);
    }

    return result.output;
  } catch (generateError) {
    console.warn(
      "generateText structured output failed, falling back to text JSON parse",
      generateError,
    );
  }

  const textResult = await generateText({
    model,
    system: `${system}

如果无法使用结构化输出，请仅返回一个 JSON 对象：
{ "message": string, "state": object }`,
    messages,
  });

  const parsed = parseSkillOutputFromText(textResult.text);

  if (parsed) {
    if (!suppressPartialMessage) {
      onPartialMessage?.(parsed.message);
    }

    return parsed;
  }

  throw new Error(
    `模型未返回可解析的结构化结果（${textResult.text.slice(0, 120)}...）`,
  );
}

export function createSkillOutputErrorMessage({
  error,
  streamedMessage,
}: {
  error: unknown;
  streamedMessage: string;
}) {
  const detail = getErrorMessage(error);

  if (streamedMessage.trim()) {
    return `${streamedMessage.trim()}\n\n生成失败：${detail}`;
  }

  return `结构化结果生成失败：${detail}`;
}
