"use client";

import "./document-plate-editor.css";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Bold,
  Heading1,
  Heading2,
  Italic,
  List,
  ListOrdered,
  type LucideIcon,
  Quote,
  Redo2,
  Undo2,
} from "lucide-react";
import type { PlateEditor } from "platejs/react";
import { Plate, PlateContent, usePlateEditor } from "platejs/react";

import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { DOCUMENT_EDIT_FOCUS_DELAY_MS } from "@/lib/canvas/document-node-focus";
import { handleNodeContentWheel } from "@/lib/canvas/node-wheel";
import { documentEditorPlugins } from "@/lib/plate/document-editor-plugins";
import {
  createInitialDocumentValue,
  plateValueToMarkdown,
} from "@/lib/plate/markdown-value";
import { LUMIO_SCROLLBAR_CLASS } from "@/lib/ui/scroll";
import { cn } from "@/lib/utils";

type DocumentPlateEditorProps = {
  markdown: string;
  editable?: boolean;
  className?: string;
  placeholder?: string;
  onContentChange?: (markdown: string) => void;
};

type DocumentPlateEditorInstanceProps = DocumentPlateEditorProps & {
  onMarkdownEmitted: (markdown: string) => void;
};

type ToolbarCommand = {
  icon: LucideIcon;
  label: string;
  run: (editor: PlateEditor) => void;
};

function focusPlateContent(root: HTMLElement | null) {
  const editableEl = root?.querySelector(
    '[contenteditable="true"]',
  ) as HTMLElement | null;

  if (!editableEl) {
    return;
  }

  editableEl.focus({ preventScroll: false });
  editableEl.scrollTop = 0;
}

function toggleListMarker(editor: PlateEditor, marker: "ordered" | "unordered") {
  const block = editor.api.block();

  if (!block) {
    editor.tf.insertText(marker === "ordered" ? "1. " : "- ");

    return;
  }

  const [, path] = block;
  const text = editor.api.string(path);
  const orderedPattern = /^\d+\.\s+/;
  const unorderedPattern = /^[-*]\s+/;
  const pattern = marker === "ordered" ? orderedPattern : unorderedPattern;
  const prefix = marker === "ordered" ? "1. " : "- ";
  const nextText = pattern.test(text) ? text.replace(pattern, "") : `${prefix}${text}`;
  const start = editor.api.start(path);
  const end = editor.api.end(path);

  if (!start || !end) {
    return;
  }

  editor.tf.select({
    anchor: start,
    focus: end,
  });
  editor.tf.delete();
  editor.tf.insertText(nextText);
}

const TOOLBAR_COMMANDS: ToolbarCommand[] = [
  {
    icon: Heading1,
    label: "一级标题",
    run: (editor) => {
      editor.tf.toggleBlock("h1");
    },
  },
  {
    icon: Heading2,
    label: "二级标题",
    run: (editor) => {
      editor.tf.toggleBlock("h2");
    },
  },
  {
    icon: Bold,
    label: "粗体",
    run: (editor) => {
      editor.tf.toggleMark("bold");
    },
  },
  {
    icon: Italic,
    label: "斜体",
    run: (editor) => {
      editor.tf.toggleMark("italic");
    },
  },
  {
    icon: Quote,
    label: "引用",
    run: (editor) => {
      editor.tf.toggleBlock("blockquote");
    },
  },
  {
    icon: List,
    label: "无序列表",
    run: (editor) => {
      toggleListMarker(editor, "unordered");
    },
  },
  {
    icon: ListOrdered,
    label: "有序列表",
    run: (editor) => {
      toggleListMarker(editor, "ordered");
    },
  },
  {
    icon: Undo2,
    label: "撤销",
    run: (editor) => {
      editor.tf.undo();
    },
  },
  {
    icon: Redo2,
    label: "重做",
    run: (editor) => {
      editor.tf.redo();
    },
  },
];

function DocumentToolbar({
  editor,
  editorRootRef,
}: {
  editor: PlateEditor;
  editorRootRef: React.RefObject<HTMLDivElement | null>;
}) {
  const runCommand = useCallback(
    (command: ToolbarCommand) => {
      command.run(editor);
      requestAnimationFrame(() => {
        focusPlateContent(editorRootRef.current);
      });
    },
    [editor, editorRootRef],
  );

  return (
    <div className="nodrag nowheel flex shrink-0 items-center gap-1 border-b border-border/60 py-0.5">
      {TOOLBAR_COMMANDS.map((command, index) => {
        const Icon = command.icon;
        const showDivider = index === 2 || index === 5 || index === 7;

        return (
          <div key={command.label} className="flex items-center gap-1">
            {showDivider ? (
              <Separator
                orientation="vertical"
                className="h-4 bg-border/70 data-vertical:self-center"
              />
            ) : null}
            <Button
              type="button"
              variant="ghost"
              size="icon-xs"
              aria-label={command.label}
              title={command.label}
              onMouseDown={(event) => {
                event.preventDefault();
              }}
              onClick={(event) => {
                event.stopPropagation();
                runCommand(command);
              }}
            >
              <Icon className="size-3.5" />
            </Button>
          </div>
        );
      })}
    </div>
  );
}

function DocumentPlateEditorInstance({
  markdown,
  editable = false,
  className,
  placeholder = "暂无内容，选中节点后在右侧对话生成",
  onContentChange,
  onMarkdownEmitted,
}: DocumentPlateEditorInstanceProps) {
  const editorRootRef = useRef<HTMLDivElement>(null);
  const initialValue = useMemo(() => createInitialDocumentValue(markdown), [markdown]);

  const editor = usePlateEditor({
    plugins: documentEditorPlugins,
    value: initialValue,
  });

  useEffect(() => {
    if (!editable) {
      return;
    }

    const timeout = window.setTimeout(() => {
      focusPlateContent(editorRootRef.current);
    }, DOCUMENT_EDIT_FOCUS_DELAY_MS);

    return () => {
      window.clearTimeout(timeout);
    };
  }, [editable]);

  return (
    <div ref={editorRootRef} className="flex min-h-0 flex-1 flex-col">
      <Plate
        editor={editor}
        readOnly={!editable}
        onValueChange={({ value }) => {
          if (!editable || !onContentChange) {
            return;
          }

          const nextMarkdown = plateValueToMarkdown(editor, value);

          onMarkdownEmitted(nextMarkdown);
          onContentChange(nextMarkdown);
        }}
      >
        {editable ? (
          <DocumentToolbar editor={editor} editorRootRef={editorRootRef} />
        ) : null}
        <PlateContent
          className={cn(
            LUMIO_SCROLLBAR_CLASS,
            "lumio-document-plate-editor min-h-0 flex-1 overflow-y-auto text-sm outline-none",
            editable && "nodrag nowheel",
            className,
          )}
          placeholder={placeholder}
          onWheel={editable ? handleNodeContentWheel : undefined}
        />
      </Plate>
    </div>
  );
}

export function DocumentPlateEditor({
  markdown,
  editable = false,
  className,
  placeholder,
  onContentChange,
}: DocumentPlateEditorProps) {
  const lastEmittedMarkdownRef = useRef(markdown);
  const [instanceKey, setInstanceKey] = useState(0);

  useEffect(() => {
    if (markdown === lastEmittedMarkdownRef.current) {
      return;
    }

    lastEmittedMarkdownRef.current = markdown;
    setInstanceKey((key) => key + 1);
  }, [markdown]);

  const handleMarkdownEmitted = useCallback((content: string) => {
    lastEmittedMarkdownRef.current = content;
  }, []);

  return (
    <DocumentPlateEditorInstance
      key={instanceKey}
      markdown={markdown}
      editable={editable}
      className={className}
      placeholder={placeholder}
      onContentChange={onContentChange}
      onMarkdownEmitted={handleMarkdownEmitted}
    />
  );
}
