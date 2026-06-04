import { deserializeMd, serializeMd } from "@platejs/markdown";
import { createPlateEditor } from "platejs/react";
import type { Value } from "platejs";

import { documentEditorPlugins } from "@/lib/plate/document-editor-plugins";
import type { PlateEditor } from "platejs/react";

export function createEmptyDocumentValue(): Value {
  return [
    {
      type: "p",
      children: [{ text: "" }],
    },
  ];
}

/** @deprecated Use createEmptyDocumentValue() */
export const EMPTY_DOCUMENT_VALUE = createEmptyDocumentValue();

function clonePlateValue(value: Value): Value {
  return structuredClone(value);
}

export function createInitialDocumentValue(markdown: string): Value {
  const editor = createPlateEditor({ plugins: documentEditorPlugins });

  return clonePlateValue(markdownToPlateValue(editor, markdown));
}

export function markdownToPlateValue(editor: PlateEditor, markdown: string): Value {
  const trimmed = markdown.trim();

  if (!trimmed) {
    return createEmptyDocumentValue();
  }

  try {
    const value = deserializeMd(editor, trimmed);

    return value.length ? clonePlateValue(value) : createEmptyDocumentValue();
  } catch {
    return [
      {
        type: "p",
        children: [{ text: markdown }],
      },
    ];
  }
}

export function plateValueToMarkdown(editor: PlateEditor, value: Value): string {
  return serializeMd(editor, { value });
}
