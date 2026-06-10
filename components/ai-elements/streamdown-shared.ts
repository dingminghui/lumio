import { cjk } from "@streamdown/cjk";
import { code } from "@streamdown/code";
import { math } from "@streamdown/math";
import { mermaid } from "@streamdown/mermaid";
import type { ControlsConfig, PluginConfig } from "streamdown";

export const streamdownPlugins: PluginConfig = {
  cjk,
  code,
  math,
  mermaid,
};

export const streamdownControls: ControlsConfig = {
  code: { copy: true, download: false },
};

export const streamdownContentClassName =
  "w-full max-w-full min-w-0 leading-6 [&_a]:text-primary [&_a]:underline [&_code]:rounded [&_code]:bg-muted [&_code]:px-1 [&_code]:py-0.5 [&_ol]:ml-5 [&_ol]:list-decimal [&_p]:my-2 [&_pre]:my-3 [&_ul]:ml-5 [&_ul]:list-disc [&>*:first-child]:mt-0 [&>*:last-child]:mb-0 **:data-[streamdown=code-block]:max-w-full **:data-[streamdown=code-block]:min-w-0 **:data-[streamdown=code-block-body]:max-w-full **:data-[streamdown=code-block-body]:overflow-x-auto [&_[data-streamdown=code-block-body]_pre]:max-w-full";

export const MARKDOWN_PREVIEW_LANGUAGES = ["markdown", "md"] as const;
