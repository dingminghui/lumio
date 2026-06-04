import { BasicBlocksPlugin, BasicMarksPlugin } from "@platejs/basic-nodes/react";
import { IndentPlugin } from "@platejs/indent/react";
import { BulletedListRules, OrderedListRules } from "@platejs/list";
import { ListPlugin } from "@platejs/list/react";
import { MarkdownPlugin } from "@platejs/markdown";
import { KEYS } from "platejs";

const documentListTargetPlugins = [...KEYS.heading, KEYS.p, KEYS.blockquote];

/** 文档节点：段落/标题/引用/列表 + 基础标记 + Markdown 互转 */
export const documentEditorPlugins = [
  BasicBlocksPlugin,
  BasicMarksPlugin,
  IndentPlugin.configure({
    inject: {
      targetPlugins: documentListTargetPlugins,
    },
  }),
  ListPlugin.configure({
    inputRules: [
      BulletedListRules.markdown({ variant: "-" }),
      BulletedListRules.markdown({ variant: "*" }),
      OrderedListRules.markdown({ variant: "." }),
    ],
    inject: {
      targetPlugins: documentListTargetPlugins,
    },
  }),
  MarkdownPlugin,
];
