import {
  convertToModelMessages,
  createUIMessageStream,
  createUIMessageStreamResponse,
} from "ai";

import { createItemMessage, getCanvasItem, updateCanvasItemState } from "@/db/queries";
import { getDecryptedModelConfig } from "@/db/profile-queries";
import { documentGraph } from "@/lib/graph/document-graph";
import { createConfiguredProvider, type ModelProviderId } from "@/lib/model-providers";
import { bootstrapSkillRegistry, getSkillRegistry } from "@/lib/skills/bootstrap";
import type { NodeChatResult, NodeToolCall } from "@/lib/skills/node-chat-schema";
import {
  getUiMessageText,
  toTextOnlyUiMessages,
  type LumioUIMessage,
} from "@/utils/session-message";

export const maxDuration = 60;

type RouteContext = {
  params: Promise<{
    projectId: string;
    itemId: string;
  }>;
};

function createWriteToolCall({
  status,
  message,
}: {
  status: NodeToolCall["status"];
  message: string;
}): NodeToolCall {
  return {
    name: "write_node_state",
    status,
    progress: [message],
    summary: message,
  };
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
    projectId,
    role: "user",
    content: userContent,
  });

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
  const model = configuredProvider.chatModel(modelConfig.model);
  const modelMessages = await convertToModelMessages(toTextOnlyUiMessages(messages));

  const stream = createUIMessageStream<LumioUIMessage>({
    async execute({ writer }) {
      const messagePartId = "skill-message";
      let streamedMessage = "";

      function writeDelta(delta: string) {
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

      writer.write({ type: "text-start", id: messagePartId });

      const graphState = await documentGraph.invoke(
        {
          messages: modelMessages,
          manifest,
          itemState: item.state,
          model,
          latestUserMessage: userContent,
        },
        { configurable: { onText: writeDelta } },
      );

      const graphResult = graphState.result;

      if (!graphResult) {
        writer.write({ type: "text-end", id: messagePartId });
        return;
      }

      const finalResult: NodeChatResult = {
        ...graphResult,
        toolCalls: [...graphResult.toolCalls],
      };
      let shouldSendSkillOutput =
        finalResult.write === "none" && Boolean(finalResult.output);

      if (finalResult.write === "commit" && finalResult.output) {
        try {
          await updateCanvasItemState(itemId, finalResult.output.state);
          const message = "节点状态已写入";

          writeDelta(`\n${message}`);
          finalResult.toolCalls.push(
            createWriteToolCall({ status: "success", message }),
          );
          shouldSendSkillOutput = true;
        } catch (error) {
          const message =
            error instanceof Error
              ? `节点状态写入失败：${error.message}`
              : "节点状态写入失败";

          writeDelta(`\n${message}`);
          finalResult.toolCalls.push(createWriteToolCall({ status: "error", message }));
          finalResult.output = undefined;
          console.error("Failed to update canvas item state", error);
        }
      }

      if (!streamedMessage.trim()) {
        writeDelta(finalResult.message);
      }

      writer.write({ type: "text-end", id: messagePartId });

      writer.write({
        type: "data-node-chat-result",
        id: "node-chat-result",
        data: finalResult,
      });

      if (shouldSendSkillOutput && finalResult.output) {
        writer.write({
          type: "data-skill-output",
          id: "skill-output",
          data: finalResult.output,
        });
      }
    },
    originalMessages: messages,
    onError: () => "消息处理失败，请重试。",
  });

  return createUIMessageStreamResponse({ stream });
}
