import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import { convertToModelMessages, streamText, type UIMessage } from "ai";

import { createSessionMessage } from "@/db/queries";
import { getUiMessageText } from "@/utils/session-message";

export const maxDuration = 60;

type RouteContext = {
  params: Promise<{
    projectId: string;
    sessionId: string;
  }>;
};

export async function POST(request: Request, { params }: RouteContext) {
  const apiKey = process.env.DEEPSEEK_API_KEY;
  const baseURL = process.env.DEEPSEEK_BASE_URL;
  const model = process.env.DEEPSEEK_MODEL;

  if (!apiKey) {
    return Response.json({ error: "Missing DEEPSEEK_API_KEY" }, { status: 500 });
  }

  if (!baseURL) {
    return Response.json({ error: "Missing DEEPSEEK_BASE_URL" }, { status: 500 });
  }

  if (!model) {
    return Response.json({ error: "Missing DEEPSEEK_MODEL" }, { status: 500 });
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

  const deepseek = createOpenAICompatible({
    name: "deepseek",
    apiKey,
    baseURL,
    transformRequestBody: (requestBody) => ({
      ...requestBody,
      thinking: { type: "disabled" },
    }),
  });

  const result = streamText({
    model: deepseek.chatModel(model),
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
