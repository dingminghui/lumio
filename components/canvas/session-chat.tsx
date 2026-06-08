"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { useCallback, useMemo, useState } from "react";

import { syncItemMessagesAction } from "@/app/projects/actions";

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
import { simpleSkillOutputSchema } from "@/lib/skills/ai-output-schema";
import {
  getUiMessageText,
  toStoredTextMessages,
  toUiMessage,
  type LumioUIMessage,
} from "@/utils/session-message";
import { cn } from "@/lib/utils";
import type { ModelProviderId } from "@/lib/model-providers";
import type { SimpleSkillOutput } from "@/types/skill";
import type { StoredTextMessage } from "@/utils/session-message";

type ItemChatProps = {
  projectId: string;
  itemId: string;
  skillName: string;
  initialMessages: StoredTextMessage[];
  modelOptions: {
    provider: ModelProviderId;
    label: string;
    model: string;
  }[];
  onItemUpdate: (output: SimpleSkillOutput) => void;
  onMessagesSync: (messages: StoredTextMessage[]) => void;
  onGenerationRevert?: () => void;
};

export function ItemChat({
  projectId,
  itemId,
  skillName,
  initialMessages,
  modelOptions,
  onItemUpdate,
  onMessagesSync,
  onGenerationRevert,
}: ItemChatProps) {
  const [selectedProvider, setSelectedProvider] = useState(
    modelOptions[0]?.provider ?? "",
  );
  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: `/api/projects/${projectId}/items/${itemId}/chat`,
      }),
    [projectId, itemId],
  );
  const { messages, sendMessage, status, stop, error, clearError } =
    useChat<LumioUIMessage>({
      id: itemId,
      messages: initialMessages.map(toUiMessage),
      transport,
      dataPartSchemas: {
        "skill-output": simpleSkillOutputSchema,
      },
      onData: (dataPart) => {
        if (dataPart.type === "data-skill-output") {
          onItemUpdate(dataPart.data);
        }
      },
      onFinish: async ({ messages: finishedMessages, isError, isAbort }) => {
        if (isError || isAbort) {
          onGenerationRevert?.();
          return;
        }

        try {
          const persisted = await syncItemMessagesAction(
            itemId,
            toStoredTextMessages(finishedMessages),
          );
          onMessagesSync(persisted);
        } catch {
          onMessagesSync(toStoredTextMessages(finishedMessages));
        }
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
          },
        },
      );
    },
    [clearError, selectedProvider, sendMessage],
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
              description="输入内容，AI 将更新左侧节点"
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
            <span className="text-xs text-muted-foreground">{skillName}</span>
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
