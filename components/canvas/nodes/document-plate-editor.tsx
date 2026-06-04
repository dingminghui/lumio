"use client";

import "./document-plate-editor.css";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Plate, PlateContent, usePlateEditor } from "platejs/react";

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

function DocumentPlateEditorInstance({
  markdown,
  editable = false,
  className,
  placeholder = "暂无内容，选中节点后在右侧对话生成",
  onContentChange,
  onMarkdownEmitted,
}: DocumentPlateEditorInstanceProps) {
  const editorRootRef = useRef<HTMLDivElement>(null);
  const initialValue = useMemo(
    () => createInitialDocumentValue(markdown),
    [markdown],
  );

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
