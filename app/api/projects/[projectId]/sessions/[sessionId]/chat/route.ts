import {
  Output,
  convertToModelMessages,
  createUIMessageStream,
  createUIMessageStreamResponse,
  streamText,
} from "ai";

import {
  applyProjectStatePatch,
  createSessionMessage,
  getProjectStateForSkill,
} from "@/db/queries";
import { getDecryptedModelConfig } from "@/db/profile-queries";
import { createConfiguredProvider, type ModelProviderId } from "@/lib/model-providers";
import { aiOutputSchema } from "@/lib/skills/ai-output-schema";
import { createSkillSystemPrompt } from "@/lib/skills/system-prompt";
import { SKILL_REGISTRY, getSkillById } from "@/lib/skills";
import type { SkillId } from "@/types/skill";
import { getUiMessageText, type LumioUIMessage } from "@/utils/session-message";

export const maxDuration = 60;

type RouteContext = {
  params: Promise<{
    projectId: string;
    sessionId: string;
  }>;
};

export async function POST(request: Request, { params }: RouteContext) {
  const body = (await request.json()) as {
    messages?: LumioUIMessage[];
    provider?: string;
    skillId?: string;
  };
  const provider = body.provider as ModelProviderId;
  const skill = getSkillById(body.skillId as SkillId) ?? SKILL_REGISTRY[0];
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

  if (!skill) {
    return Response.json({ error: "Skill is required" }, { status: 400 });
  }

  const { projectId, sessionId } = await params;
  const messages = body.messages ?? [];
  const projectState = await getProjectStateForSkill(projectId, skill);
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

  const configuredProvider = createConfiguredProvider({
    provider: modelConfig.provider,
    apiKey: modelConfig.apiKey,
    baseUrl: modelConfig.baseUrl,
  });

  const stream = createUIMessageStream<LumioUIMessage>({
    async execute({ writer }) {
      const result = streamText({
        model: configuredProvider.chatModel(modelConfig.model),
        system: createSkillSystemPrompt({ skill, projectState }),
        messages: await convertToModelMessages(messages),
        output: Output.object({
          schema: aiOutputSchema,
        }),
      });

      const messagePartId = "skill-message";
      let streamedMessage = "";
      let hasStartedMessage = false;

      function writeMessageDelta(nextMessage: string) {
        if (!nextMessage || nextMessage === streamedMessage) {
          return;
        }

        if (!nextMessage.startsWith(streamedMessage)) {
          return;
        }

        if (!hasStartedMessage) {
          writer.write({
            type: "text-start",
            id: messagePartId,
          });
          hasStartedMessage = true;
        }

        writer.write({
          type: "text-delta",
          id: messagePartId,
          delta: nextMessage.slice(streamedMessage.length),
        });
        streamedMessage = nextMessage;
      }

      for await (const partialOutput of result.partialOutputStream) {
        writeMessageDelta(partialOutput.message ?? "");
      }

      const output = await result.output;
      writeMessageDelta(output.message);

      if (hasStartedMessage) {
        writer.write({
          type: "text-end",
          id: messagePartId,
        });
      }

      await applyProjectStatePatch({
        projectId,
        skill,
        patch: output.patch,
        lastUserMessage: userContent,
      });

      writer.write({
        type: "data-skill-output",
        id: "skill-output",
        data: output,
      });

      await createSessionMessage({
        sessionId,
        projectId,
        role: "assistant",
        content: JSON.stringify(output),
      });
    },
    originalMessages: messages,
    onError: () => "结构化结果处理失败，未更新项目状态。",
  });

  return createUIMessageStreamResponse({ stream });
}
