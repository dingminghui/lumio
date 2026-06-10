"use client";

import { memo, useContext } from "react";
import {
  CodeBlockContainer,
  type CustomRendererProps,
  type PluginConfig,
  Streamdown,
  StreamdownContext,
} from "streamdown";

import { cn } from "@/lib/utils";

import {
  MARKDOWN_PREVIEW_LANGUAGES,
  streamdownContentClassName,
  streamdownControls,
  streamdownPlugins,
} from "./streamdown-shared";

export const MarkdownPreviewBlock = memo(function MarkdownPreviewBlock({
  code,
  language,
  isIncomplete,
}: CustomRendererProps) {
  const parentContext = useContext(StreamdownContext);

  return (
    <CodeBlockContainer
      className="mb-2 p-0"
      language={language}
      isIncomplete={isIncomplete}
    >
      <div
        className={cn("bg-background p-2", isIncomplete && "opacity-80")}
        data-streamdown="markdown-preview-body"
      >
        <Streamdown
          className={streamdownContentClassName}
          controls={streamdownControls}
          mode={parentContext.mode}
          plugins={markdownPreviewPlugins}
        >
          {code}
        </Streamdown>
      </div>
    </CodeBlockContainer>
  );
});

export const markdownPreviewPlugins: PluginConfig = {
  ...streamdownPlugins,
  renderers: [
    {
      language: [...MARKDOWN_PREVIEW_LANGUAGES],
      component: MarkdownPreviewBlock,
    },
  ],
};
