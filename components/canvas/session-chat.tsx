"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { type Dispatch, type SetStateAction, useCallback, useMemo } from "react";

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
  PromptInputSubmit,
  PromptInputTextarea,
  PromptInputTools,
} from "@/components/ai-elements/prompt-input";
import {
  getUiMessageText,
  toStoredTextMessages,
  toUiMessage,
} from "@/utils/session-message";
import type { ProjectSessionItem } from "@/db/queries";
import { cn } from "@/lib/utils";

type SessionChatProps = {
  projectId: string;
  session: ProjectSessionItem;
  onSessionsChange: Dispatch<SetStateAction<ProjectSessionItem[]>>;
};

export function SessionChat({
  projectId,
  session,
  onSessionsChange,
}: SessionChatProps) {
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
  const { messages, sendMessage, status, stop, error } = useChat({
    id: session.id,
    messages: initialMessages,
    transport,
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
      await sendMessage({ text });
    },
    [sendMessage],
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
          <PromptInputTools>
            <span className="text-xs text-muted-foreground">
              {status === "streaming" ? "正在回复..." : ""}
            </span>
          </PromptInputTools>
          <PromptInputSubmit status={status} onStop={stop} />
        </PromptInputFooter>
      </PromptInput>

      {error ? (
        <p className="text-xs text-destructive">消息发送失败，请检查 DeepSeek 配置。</p>
      ) : null}
    </div>
  );
}
