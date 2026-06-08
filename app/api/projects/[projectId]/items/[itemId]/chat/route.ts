import { convertToModelMessages, createUIMessageStream, createUIMessageStreamResponse } from "ai";

import { createItemMessage, getCanvasItem, updateCanvasItemState } from "@/db/queries";
import { getDecryptedModelConfig } from "@/db/profile-queries";
import { createConfiguredProvider, type ModelProviderId } from "@/lib/model-providers";
import { bootstrapSkillRegistry, getSkillRegistry } from "@/lib/skills/bootstrap";
import {
  createSkillOutputErrorMessage,
  generateSkillOutput,
} from "@/lib/skills/generate-skill-output";
import { resolveImageSkillOutput } from "@/lib/skills/image/runtime";
import { LONG_IMAGE_SKILL_ID } from "@/lib/skills/long-image";
import {
  createLongImageContextPrompt,
  createLongImageProgressMessage,
  getLongImageGenerationContext,
  resolveLongImageSkillOutput,
  type LongImageGenerationContext,
} from "@/lib/skills/long-image/runtime";
import { createSkillSystemPrompt } from "@/lib/skills/system-prompt";
import {
  getUiMessageText,
  toTextOnlyUiMessages,
  type LumioUIMessage,
} from "@/utils/session-message";
import type { SimpleSkillOutput } from "@/types/skill";

export const maxDuration = 60;

type RouteContext = {
  params: Promise<{
    projectId: string;
    itemId: string;
  }>;
};

function createImmediateSkillOutputResponse({
  messages,
  itemId,
  output,
}: {
  messages: LumioUIMessage[];
  itemId: string;
  output: SimpleSkillOutput;
}) {
  const stream = createUIMessageStream<LumioUIMessage>({
    async execute({ writer }) {
      const messagePartId = "skill-message";

      writer.write({ type: "text-start", id: messagePartId });
      writer.write({
        type: "text-delta",
        id: messagePartId,
        delta: output.message,
      });
      writer.write({ type: "text-end", id: messagePartId });

      await createItemMessage({
        itemId,
        role: "assistant",
        content: output.message,
      });

      await updateCanvasItemState(itemId, output.state);

      writer.write({
        type: "data-skill-output",
        id: "skill-output",
        data: output,
      });
    },
    originalMessages: messages,
    onError: () => "消息处理失败，请重试。",
  });

  return createUIMessageStreamResponse({ stream });
}

export async function POST(request: Request, { params }: RouteContext) {
  const body = (await request.json()) as {
    messages?: LumioUIMessage[];
    provider?: string;
  };
  const provider = body.provider as ModelProviderId;

  const { projectId, itemId } = await params;
  bootstrapSkillRegistry();
  const registry = getSkillRegistry();

  const item = await getCanvasItem(itemId);

  if (!item || item.projectId !== projectId) {
    return Response.json({ error: "Canvas item not found" }, { status: 404 });
  }

  const manifest = registry.get(item.skillId) ?? registry.getBuiltinFallback();
  const messages = body.messages ?? [];
  const latestUserMessage = [...messages]
    .reverse()
    .find((message) => message.role === "user");
  const userContent = latestUserMessage
    ? getUiMessageText(latestUserMessage).trim()
    : "";

  if (!userContent) {
    return Response.json({ error: "Message content is required" }, { status: 400 });
  }

  await createItemMessage({
    itemId,
    role: "user",
    content: userContent,
  });

  let contextPrompt = "";
  let longImageContext: LongImageGenerationContext | null = null;
  let longImageProgressMessage = "";

  if (manifest.id === LONG_IMAGE_SKILL_ID) {
    const context = await getLongImageGenerationContext(projectId, itemId);
    longImageContext = context;

    if (context.documents.length === 0) {
      const message = "请先连接至少一个有内容的文档节点后再生成长图";
      const output: SimpleSkillOutput = {
        message,
        state: {
          ...item.state,
          status: "error",
          error: message,
        },
      };

      return createImmediateSkillOutputResponse({
        messages,
        itemId,
        output,
      });
    }

    contextPrompt = createLongImageContextPrompt(context);
    longImageProgressMessage = createLongImageProgressMessage(context);
  }

  let modelConfig;

  try {
    modelConfig = await getDecryptedModelConfig(provider);
  } catch {
    return Response.json(
      { error: "Missing MODEL_CONFIG_SECRET or invalid saved model config" },
      { status: 500 },
    );
  }

  if (!modelConfig?.validatedAt) {
    return Response.json(
      { error: "请先在我的 / 模型配置中完成 API Key 配置" },
      { status: 500 },
    );
  }

  const configuredProvider = createConfiguredProvider({
    provider: modelConfig.provider,
    apiKey: modelConfig.apiKey,
    baseUrl: modelConfig.baseUrl,
  });

  const stream = createUIMessageStream<LumioUIMessage>({
    async execute({ writer }) {
      const messagePartId = "skill-message";
      let streamedMessage = "";

      writer.write({ type: "text-start", id: messagePartId });

      function appendMessageDelta(delta: string) {
        if (!delta) {
          return;
        }

        writer.write({
          type: "text-delta",
          id: messagePartId,
          delta,
        });
        streamedMessage += delta;
      }

      function writeMessageDelta(nextMessage: string) {
        if (!nextMessage || nextMessage === streamedMessage) {
          return;
        }

        if (!nextMessage.startsWith(streamedMessage)) {
          return;
        }

        writer.write({
          type: "text-delta",
          id: messagePartId,
          delta: nextMessage.slice(streamedMessage.length),
        });
        streamedMessage = nextMessage;
      }

      const modelMessages = await convertToModelMessages(
        toTextOnlyUiMessages(messages),
      );
      const system = createSkillSystemPrompt({
        manifest,
        itemState: item.state,
        context: contextPrompt,
      });
      const suppressPartialMessage = manifest.id === LONG_IMAGE_SKILL_ID;

      let output;

      try {
        output = await generateSkillOutput({
          model: configuredProvider.chatModel(modelConfig.model),
          system,
          messages: modelMessages,
          initialMessage: longImageProgressMessage,
          suppressPartialMessage,
          onPartialMessage: (nextMessage) => {
            if (!suppressPartialMessage) {
              writeMessageDelta(nextMessage);
            } else if (!streamedMessage && longImageProgressMessage) {
              appendMessageDelta(longImageProgressMessage);
            }
          },
        });

        if (!suppressPartialMessage) {
          writeMessageDelta(output.message);
        }
      } catch (error) {
        const fallbackMessage = createSkillOutputErrorMessage({
          error,
          streamedMessage,
        });
        const errorOutput: SimpleSkillOutput = {
          message: fallbackMessage,
          state: {
            ...item.state,
            status: "error",
            error: fallbackMessage,
          },
        };

        writeMessageDelta(
          suppressPartialMessage && streamedMessage
            ? `\n${fallbackMessage}`
            : fallbackMessage,
        );
        writer.write({ type: "text-end", id: messagePartId });

        await createItemMessage({
          itemId,
          role: "assistant",
          content: fallbackMessage,
        });

        writer.write({
          type: "data-skill-output",
          id: "skill-output",
          data: errorOutput,
        });

        try {
          await updateCanvasItemState(itemId, errorOutput.state);
        } catch (updateError) {
          console.error("Failed to update canvas item state after error", updateError);
        }

        console.error("Failed to generate structured skill output", error);
        return;
      }

      if (manifest.id === LONG_IMAGE_SKILL_ID && longImageContext) {
        output = resolveLongImageSkillOutput({
          output,
          context: longImageContext,
        });

        if (output.state.status === "error") {
          appendMessageDelta(`\n${output.message}`);
        }
      }

      output = await resolveImageSkillOutput({
        skillId: manifest.id,
        output,
        onMessage: writeMessageDelta,
      });

      writer.write({ type: "text-end", id: messagePartId });

      await createItemMessage({
        itemId,
        role: "assistant",
        content: JSON.stringify(output),
      });

      writer.write({
        type: "data-skill-output",
        id: "skill-output",
        data: output,
      });

      try {
        await updateCanvasItemState(itemId, output.state);
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "无法更新节点状态";
        writeMessageDelta(`${streamedMessage}\n\n状态更新失败：${errorMessage}`);
        console.error("Failed to update canvas item state", error);
      }
    },
    originalMessages: messages,
    onError: () => "消息处理失败，请重试。",
  });

  return createUIMessageStreamResponse({ stream });
}
