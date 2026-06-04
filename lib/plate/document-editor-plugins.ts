import { BasicBlocksPlugin, BasicMarksPlugin } from "@platejs/basic-nodes/react";
import { MarkdownPlugin } from "@platejs/markdown";

/** 文档节点：段落/标题/引用 + 基础标记 + Markdown 互转 */
export const documentEditorPlugins = [
  BasicBlocksPlugin,
  BasicMarksPlugin,
  MarkdownPlugin,
];
