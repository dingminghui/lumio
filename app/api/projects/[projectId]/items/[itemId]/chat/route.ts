import {
  Output,
  convertToModelMessages,
  createUIMessageStream,
  createUIMessageStreamResponse,
  streamText,
} from "ai";

import { createItemMessage, getCanvasItem, updateCanvasItemState } from "@/db/queries";
import { getDecryptedModelConfig } from "@/db/profile-queries";
import { createConfiguredProvider, type ModelProviderId } from "@/lib/model-providers";
import { bootstrapSkillRegistry, getSkillRegistry } from "@/lib/skills/bootstrap";
import { simpleSkillOutputSchema } from "@/lib/skills/ai-output-schema";
import { createSkillSystemPrompt } from "@/lib/skills/system-prompt";
import { getUiMessageText, type LumioUIMessage } from "@/utils/session-message";

export const maxDuration = 60;

type RouteContext = {
  params: Promise<{
    projectId: string;
    itemId: string;
  }>;
};

export async function POST(request: Request, { params }: RouteContext) {
  const body = (await request.json()) as {
    messages?: LumioUIMessage[];
    provider?: string;
  };
  const provider = body.provider as ModelProviderId;
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

  const configuredProvider = createConfiguredProvider({
    provider: modelConfig.provider,
    apiKey: modelConfig.apiKey,
    baseUrl: modelConfig.baseUrl,
  });

  const stream = createUIMessageStream<LumioUIMessage>({
    async execute({ writer }) {
      const result = streamText({
        model: configuredProvider.chatModel(modelConfig.model),
        system: createSkillSystemPrompt({
          manifest,
          itemState: item.state,
        }),
        messages: await convertToModelMessages(messages),
        output: Output.object({
          schema: simpleSkillOutputSchema,
        }),
      });

      const messagePartId = "skill-message";
      let streamedMessage = "";

      writer.write({ type: "text-start", id: messagePartId });

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

      let output;

      try {
        for await (const partialOutput of result.partialOutputStream) {
          writeMessageDelta(partialOutput.message ?? "");
        }

        output = await result.output;
        writeMessageDelta(output.message);
      } catch (error) {
        const fallbackMessage = streamedMessage.trim()
          ? streamedMessage
          : "结构化结果生成失败，请重试。";

        writeMessageDelta(fallbackMessage);
        writer.write({ type: "text-end", id: messagePartId });

        await createItemMessage({
          itemId,
          role: "assistant",
          content: fallbackMessage,
        });

        console.error("Failed to generate structured skill output", error);
        return;
      }

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
