"use client";

import type { ChatStatus } from "ai";
import { CornerDownLeftIcon, LoaderCircleIcon, SquareIcon, XIcon } from "lucide-react";
import type {
  ComponentProps,
  FormEvent,
  FormEventHandler,
  HTMLAttributes,
  KeyboardEventHandler,
  MouseEvent,
} from "react";
import { useCallback, useState } from "react";

import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupTextarea,
} from "@/components/ui/input-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

export type PromptInputMessage = {
  text: string;
};

export type PromptInputProps = Omit<
  HTMLAttributes<HTMLFormElement>,
  "onSubmit" | "onError"
> & {
  onSubmit: (
    message: PromptInputMessage,
    event: FormEvent<HTMLFormElement>,
  ) => void | Promise<void>;
};

export function PromptInput({
  className,
  onSubmit,
  children,
  ...props
}: PromptInputProps) {
  const handleSubmit: FormEventHandler<HTMLFormElement> = useCallback(
    async (event) => {
      event.preventDefault();

      const formData = new FormData(event.currentTarget);
      const text = String(formData.get("message") ?? "").trim();

      if (!text) {
        return;
      }

      const form = event.currentTarget;
      form.reset();
      await onSubmit({ text }, event);
    },
    [onSubmit],
  );

  return (
    <form className={cn("w-full", className)} onSubmit={handleSubmit} {...props}>
      <InputGroup className="h-auto overflow-hidden">{children}</InputGroup>
    </form>
  );
}

export type PromptInputTextareaProps = ComponentProps<typeof InputGroupTextarea>;

export function PromptInputTextarea({
  onKeyDown,
  className,
  placeholder = "输入消息",
  ...props
}: PromptInputTextareaProps) {
  const [isComposing, setIsComposing] = useState(false);

  const handleKeyDown: KeyboardEventHandler<HTMLTextAreaElement> = useCallback(
    (event) => {
      onKeyDown?.(event);

      if (event.defaultPrevented || event.key !== "Enter") {
        return;
      }

      if (event.shiftKey || isComposing || event.nativeEvent.isComposing) {
        return;
      }

      event.preventDefault();
      event.currentTarget.form?.requestSubmit();
    },
    [isComposing, onKeyDown],
  );

  return (
    <InputGroupTextarea
      className={cn("min-h-20 resize-none py-3", className)}
      name="message"
      onCompositionEnd={() => setIsComposing(false)}
      onCompositionStart={() => setIsComposing(true)}
      onKeyDown={handleKeyDown}
      placeholder={placeholder}
      {...props}
    />
  );
}

export type PromptInputFooterProps = Omit<
  ComponentProps<typeof InputGroupAddon>,
  "align"
>;

export function PromptInputFooter({ className, ...props }: PromptInputFooterProps) {
  return (
    <InputGroupAddon
      align="block-end"
      className={cn("justify-between gap-2", className)}
      {...props}
    />
  );
}

export type PromptInputToolsProps = HTMLAttributes<HTMLDivElement>;

export function PromptInputTools({ className, ...props }: PromptInputToolsProps) {
  return (
    <div className={cn("flex min-w-0 items-center gap-1", className)} {...props} />
  );
}

export const PromptInputSelect = Select;
export const PromptInputSelectContent = SelectContent;
export const PromptInputSelectItem = SelectItem;
export const PromptInputSelectTrigger = SelectTrigger;
export const PromptInputSelectValue = SelectValue;

export type PromptInputButtonProps = ComponentProps<typeof InputGroupButton>;

export function PromptInputButton({
  variant = "ghost",
  size = "icon-sm",
  className,
  ...props
}: PromptInputButtonProps) {
  return (
    <InputGroupButton
      className={cn(className)}
      size={size}
      type="button"
      variant={variant}
      {...props}
    />
  );
}

export type PromptInputSubmitProps = ComponentProps<typeof InputGroupButton> & {
  status?: ChatStatus;
  onStop?: () => void;
};

export function PromptInputSubmit({
  className,
  variant = "default",
  size = "icon-sm",
  status,
  onStop,
  onClick,
  children,
  ...props
}: PromptInputSubmitProps) {
  const isGenerating = status === "submitted" || status === "streaming";

  const handleClick = useCallback(
    (event: MouseEvent<HTMLButtonElement>) => {
      if (isGenerating && onStop) {
        event.preventDefault();
        onStop();
        return;
      }

      onClick?.(event);
    },
    [isGenerating, onClick, onStop],
  );

  let icon = <CornerDownLeftIcon />;

  if (status === "submitted") {
    icon = <LoaderCircleIcon className="animate-spin" />;
  } else if (status === "streaming") {
    icon = <SquareIcon />;
  } else if (status === "error") {
    icon = <XIcon />;
  }

  return (
    <InputGroupButton
      aria-label={isGenerating ? "停止" : "发送"}
      className={cn(className)}
      onClick={handleClick}
      size={size}
      type={isGenerating && onStop ? "button" : "submit"}
      variant={variant}
      {...props}
    >
      {children ?? icon}
    </InputGroupButton>
  );
}
