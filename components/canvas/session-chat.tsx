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
import { nodeChatResultSchema } from "@/lib/skills/node-chat-schema";
import {
  getSkillOutputFromNodeChatResult,
  getSkillOutputFromUiMessage,
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
};

function normalizeFinishedMessagesForSync(
  messages: LumioUIMessage[],
  isAbort: boolean,
) {
  if (!isAbort || messages.length === 0) {
    return messages;
  }

  const lastMessage = messages[messages.length - 1];
  const hasNodeResult = lastMessage.parts.some(
    (part) => part.type === "data-node-chat-result",
  );

  if (lastMessage.role === "assistant" && !hasNodeResult) {
    return messages.slice(0, -1);
  }

  return messages;
}

export function ItemChat({
  projectId,
  itemId,
  skillName,
  initialMessages,
  modelOptions,
  onItemUpdate,
  onMessagesSync,
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
        "node-chat-result": nodeChatResultSchema,
        "skill-output": simpleSkillOutputSchema,
      },
      onData: (dataPart) => {
        if (dataPart.type === "data-skill-output") {
          onItemUpdate(dataPart.data);
          return;
        }

        if (dataPart.type === "data-node-chat-result") {
          const output = getSkillOutputFromNodeChatResult(dataPart.data);

          if (output) {
            onItemUpdate(output);
          }
        }
      },
      onFinish: async ({ messages: finishedMessages, isError, isAbort }) => {
        if (isError) {
          return;
        }

        const normalizedMessages = normalizeFinishedMessagesForSync(
          finishedMessages,
          isAbort,
        );

        if (!isAbort) {
          const lastAssistant = [...normalizedMessages]
            .reverse()
            .find((message) => message.role === "assistant");
          const output = lastAssistant
            ? getSkillOutputFromUiMessage(lastAssistant)
            : null;

          if (output) {
            onItemUpdate(output);
          }
        }

        try {
          const persisted = await syncItemMessagesAction(
            itemId,
            toStoredTextMessages(normalizedMessages),
          );
          onMessagesSync(persisted);
        } catch {
          onMessagesSync(toStoredTextMessages(normalizedMessages));
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
    <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-3">
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
