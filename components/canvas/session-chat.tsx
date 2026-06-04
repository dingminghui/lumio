"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import {
  type Dispatch,
  type SetStateAction,
  useCallback,
  useMemo,
  useState,
} from "react";

import {
  Conversation,
  ConversationContent,
  ConversationEmptyState,
  ConversationScrollButton,
} from "@/components/ai-elements/conversation";
import {
  Message,
  MessageContent,
  MessageResponse,
} from "@/components/ai-elements/message";
import {
  PromptInput,
  PromptInputFooter,
  PromptInputSelect,
  PromptInputSelectContent,
  PromptInputSelectItem,
  PromptInputSelectTrigger,
  PromptInputSelectValue,
  PromptInputSubmit,
  PromptInputTextarea,
  PromptInputTools,
} from "@/components/ai-elements/prompt-input";
import { aiOutputSchema } from "@/lib/skills/ai-output-schema";
import {
  getUiMessageText,
  toStoredTextMessages,
  toUiMessage,
  type LumioUIMessage,
} from "@/utils/session-message";
import type { ProjectSessionItem } from "@/db/queries";
import { cn } from "@/lib/utils";
import type { ModelProviderId } from "@/lib/model-providers";
import type { AIOutput, SkillId } from "@/types/skill";

type SessionChatProps = {
  projectId: string;
  session: ProjectSessionItem;
  modelOptions: {
    provider: ModelProviderId;
    label: string;
    model: string;
  }[];
  skillOptions: {
    id: SkillId;
    name: string;
  }[];
  onSessionsChange: Dispatch<SetStateAction<ProjectSessionItem[]>>;
  onSkillOutput?: (output: AIOutput) => void;
};

export function SessionChat({
  projectId,
  session,
  modelOptions,
  skillOptions,
  onSessionsChange,
  onSkillOutput,
}: SessionChatProps) {
  const [selectedProvider, setSelectedProvider] = useState(
    modelOptions[0]?.provider ?? "",
  );
  const [selectedSkillId, setSelectedSkillId] = useState(skillOptions[0]?.id ?? "");
  const initialMessages = useMemo(
    () => session.messages.map(toUiMessage),
    [session.messages],
  );
  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: `/api/projects/${projectId}/sessions/${session.id}/chat`,
      }),
    [projectId, session.id],
  );
  const { messages, sendMessage, status, stop, error, clearError } =
    useChat<LumioUIMessage>({
      id: session.id,
      messages: initialMessages,
      transport,
      dataPartSchemas: {
        "skill-output": aiOutputSchema,
      },
      onData: (dataPart) => {
        if (dataPart.type === "data-skill-output") {
          onSkillOutput?.(dataPart.data);
        }
      },
      onFinish: ({ messages: finishedMessages }) => {
        onSessionsChange((currentSessions) =>
          currentSessions.map((currentSession) =>
            currentSession.id === session.id
              ? {
                  ...currentSession,
                  messages: toStoredTextMessages(finishedMessages),
                }
              : currentSession,
          ),
        );
      },
    });

  const handleSubmit = useCallback(
    async ({ text }: { text: string }) => {
      clearError();
      await sendMessage(
        { text },
        {
          body: {
            provider: selectedProvider,
            skillId: selectedSkillId,
          },
        },
      );
    },
    [clearError, selectedProvider, selectedSkillId, sendMessage],
  );

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      <Conversation className="bg-background">
        <ConversationContent>
          {messages.length ? (
            messages.map((message) => {
              const content = getUiMessageText(message);

              return (
                <Message key={message.id} from={message.role}>
                  <MessageContent
                    className={cn(message.role === "user" && "whitespace-pre-wrap")}
                  >
                    {message.role === "assistant" ? (
                      <MessageResponse>{content}</MessageResponse>
                    ) : (
                      content
                    )}
                  </MessageContent>
                </Message>
              );
            })
          ) : (
            <ConversationEmptyState
              title="暂无消息"
              description="输入内容开始创作问答"
            />
          )}
        </ConversationContent>
        <ConversationScrollButton />
      </Conversation>

      <PromptInput onSubmit={handleSubmit}>
        <PromptInputTextarea
          disabled={status === "submitted" || status === "streaming"}
          placeholder="输入消息，Shift + Enter 换行"
        />
        <PromptInputFooter>
          <PromptInputTools className="flex-wrap gap-2">
            <div className="flex min-w-0 items-center">
              <PromptInputSelect
                value={selectedProvider}
                onValueChange={(value) => setSelectedProvider(value as ModelProviderId)}
              >
                <PromptInputSelectTrigger
                  aria-label="选择模型"
                  size="sm"
                  className="max-w-36 border-transparent bg-muted shadow-none hover:bg-muted/80"
                >
                  <PromptInputSelectValue placeholder="选择模型" />
                </PromptInputSelectTrigger>
                <PromptInputSelectContent>
                  {modelOptions.map((option) => (
                    <PromptInputSelectItem
                      key={option.provider}
                      value={option.provider}
                    >
                      {option.label}
                    </PromptInputSelectItem>
                  ))}
                </PromptInputSelectContent>
              </PromptInputSelect>
            </div>
            <div className="flex min-w-0 items-center">
              <PromptInputSelect
                value={selectedSkillId}
                onValueChange={(value) => setSelectedSkillId(value as SkillId)}
              >
                <PromptInputSelectTrigger
                  aria-label="选择 Skill"
                  size="sm"
                  className="max-w-40 border-transparent bg-muted shadow-none hover:bg-muted/80"
                >
                  <PromptInputSelectValue placeholder="选择 Skill" />
                </PromptInputSelectTrigger>
                <PromptInputSelectContent>
                  {skillOptions.map((option) => (
                    <PromptInputSelectItem key={option.id} value={option.id}>
                      {option.name}
                    </PromptInputSelectItem>
                  ))}
                </PromptInputSelectContent>
              </PromptInputSelect>
            </div>
            <span className="text-xs text-muted-foreground">
              {status === "streaming" ? "正在回复..." : ""}
            </span>
          </PromptInputTools>
          <PromptInputSubmit status={status} onStop={stop} />
        </PromptInputFooter>
      </PromptInput>

      {error ? (
        <p className="text-xs text-destructive">
          消息处理失败：{error.message || "请稍后重试"}
        </p>
      ) : null}
    </div>
  );
}
