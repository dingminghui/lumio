import { convertToModelMessages, streamText, type UIMessage } from "ai";

import { createSessionMessage } from "@/db/queries";
import { getDecryptedModelConfig } from "@/db/profile-queries";
import { createConfiguredProvider } from "@/lib/model-providers";
import { getUiMessageText } from "@/utils/session-message";

export const maxDuration = 60;

type RouteContext = {
  params: Promise<{
    projectId: string;
    sessionId: string;
  }>;
};

export async function POST(request: Request, { params }: RouteContext) {
  let modelConfig;

  try {
    modelConfig = await getDecryptedModelConfig("deepseek");
  } catch {
    return Response.json(
      { error: "Missing MODEL_CONFIG_SECRET or invalid saved model config" },
      { status: 500 },
    );
  }

  if (!modelConfig?.validatedAt) {
    return Response.json(
      { error: "请先在我的 / 模型配置中完成 DeepSeek 配置" },
      { status: 500 },
    );
  }

  const { projectId, sessionId } = await params;
  const body = (await request.json()) as { messages?: UIMessage[] };
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

  await createSessionMessage({
    sessionId,
    projectId,
    role: "user",
    content: userContent,
  });

  const deepseek = createConfiguredProvider({
    provider: "deepseek",
    apiKey: modelConfig.apiKey,
    baseUrl: modelConfig.baseUrl,
  });

  const result = streamText({
    model: deepseek.chatModel(modelConfig.model),
    messages: await convertToModelMessages(messages),
    onFinish: async ({ text }) => {
      if (!text.trim()) {
        return;
      }

      await createSessionMessage({
        sessionId,
        projectId,
        role: "assistant",
        content: text,
      });
    },
  });

  return result.toUIMessageStreamResponse();
}
