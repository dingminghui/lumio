"use client";

import { useCallback } from "react";

import { syncItemMessagesAction } from "@/app/projects/actions";
import { requestItemGeneration } from "@/lib/canvas/request-item-generation";
import type { CanvasItemWithMessages } from "@/db/queries";
import {
  isLongImageSkill,
  LONG_IMAGE_GENERATE_PROMPT,
  markLongImageGenerating,
  revertLongImageGenerating,
  shouldApplyLongImageOutput,
} from "@/lib/skills/long-image/state";
import { toStoredTextMessages } from "@/utils/session-message";
import type { ModelProviderId } from "@/lib/model-providers";
import type { SimpleSkillOutput } from "@/types/skill";

type UseLongImageGenerationOptions = {
  projectId: string;
  modelProvider?: ModelProviderId;
  onActivateItem: (itemId: string) => void;
  setItems: React.Dispatch<React.SetStateAction<CanvasItemWithMessages[]>>;
};

function updateItemById<T extends { id: string }>(
  items: T[],
  itemId: string,
  patch: Partial<T>,
) {
  return items.map((item) => (item.id === itemId ? { ...item, ...patch } : item));
}

export function useLongImageGeneration({
  projectId,
  modelProvider,
  onActivateItem,
  setItems,
}: UseLongImageGenerationOptions) {
  const revertGenerating = useCallback(
    (itemId: string) => {
      setItems((current) =>
        current.map((item) =>
          item.id === itemId ? revertLongImageGenerating(item) : item,
        ),
      );
    },
    [setItems],
  );

  const applyItemUpdate = useCallback(
    (itemId: string, output: SimpleSkillOutput) => {
      setItems((current) => {
        const item = current.find((entry) => entry.id === itemId);

        if (
          item &&
          isLongImageSkill(item.skillId) &&
          !shouldApplyLongImageOutput(output)
        ) {
          return current.map((entry) =>
            entry.id === itemId ? revertLongImageGenerating(entry) : entry,
          );
        }

        return updateItemById(current, itemId, { state: output.state });
      });
    },
    [setItems],
  );

  const syncMessages = useCallback(
    async (itemId: string, messages: CanvasItemWithMessages["messages"]) => {
      setItems((current) => updateItemById(current, itemId, { messages }));
    },
    [setItems],
  );

  const startGeneration = useCallback(
    (itemId: string) => {
      onActivateItem(itemId);

      setItems((current) => {
        const item = current.find((entry) => entry.id === itemId);

        if (!item || !modelProvider) {
          return current;
        }

        queueMicrotask(() => {
          void requestItemGeneration({
            projectId,
            itemId,
            provider: modelProvider,
            existingMessages: item.messages,
            prompt: LONG_IMAGE_GENERATE_PROMPT,
          }).then(async (result) => {
            if (result.output && shouldApplyLongImageOutput(result.output)) {
              applyItemUpdate(itemId, result.output);
            } else {
              revertGenerating(itemId);
            }

            try {
              const persisted = await syncItemMessagesAction(
                itemId,
                toStoredTextMessages(result.messages),
              );
              await syncMessages(itemId, persisted);
            } catch {
              await syncMessages(itemId, toStoredTextMessages(result.messages));
            }
          });
        });

        return current.map((entry) =>
          entry.id === itemId ? markLongImageGenerating(entry) : entry,
        );
      });
    },
    [
      applyItemUpdate,
      modelProvider,
      onActivateItem,
      projectId,
      revertGenerating,
      setItems,
      syncMessages,
    ],
  );

  return {
    startGeneration,
    revertGenerating,
    applyItemUpdate,
  };
}
