"use client";

import { useCallback, useMemo, useState } from "react";
import { ReactFlowProvider } from "@xyflow/react";
import type { Viewport } from "@xyflow/react";

import {
  createCanvasItemAction,
  deleteCanvasItemAction,
  updateCanvasItemStateAction,
} from "@/app/projects/actions";
import { FlowCanvas } from "@/components/canvas/flow-canvas";
import { ItemPanel } from "@/components/canvas/session-panel";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import { useCanvasItemPanel } from "@/hooks/use-canvas-item-panel";
import { useDebouncedCallback } from "@/hooks/use-debounced-callback";
import { CONTENT_SAVE_DEBOUNCE_MS } from "@/lib/canvas/constants";
import type { CanvasItemWithMessages } from "@/db/queries";
import { deriveSkillStage } from "@/lib/skills/core/stage-engine";
import type { SerializableSkillManifest } from "@/lib/skills/serializable-manifest";
import { cn } from "@/lib/utils";
import type { CanvasEdgeRow, SimpleSkillOutput } from "@/types/skill";

const CANVAS_ONLY_LAYOUT = { canvas: 100 };
const WITH_ITEMS_LAYOUT = { canvas: 60, items: 40 };

type CanvasHomeProps = {
  projectId: string;
  boardName: string;
  initialItems: CanvasItemWithMessages[];
  initialEdges: CanvasEdgeRow[];
  skillManifests: SerializableSkillManifest[];
  skillOptions: { id: string; name: string }[];
  initialViewport: Viewport;
  bgColor: string;
  showDots: boolean;
};

function updateItemById<T extends { id: string }>(
  items: T[],
  itemId: string,
  patch: Partial<T>,
) {
  return items.map((item) => (item.id === itemId ? { ...item, ...patch } : item));
}

export function CanvasHome({
  projectId,
  boardName,
  initialItems,
  initialEdges,
  skillManifests,
  skillOptions,
  initialViewport,
  bgColor,
  showDots,
}: CanvasHomeProps) {
  const [items, setItems] = useState(initialItems);
  const [edges, setEdges] = useState(initialEdges);
  const [activeItemId, setActiveItemId] = useState<string | null>(
    initialItems[0]?.id ?? null,
  );
  const itemPanel = useCanvasItemPanel(Boolean(initialItems[0]));
  const scheduleContentSave = useDebouncedCallback(CONTENT_SAVE_DEBOUNCE_MS);

  const manifestById = useMemo(
    () => new Map(skillManifests.map((manifest) => [manifest.id, manifest])),
    [skillManifests],
  );

  const skillNames = useMemo(
    () =>
      Object.fromEntries(
        skillManifests.map((manifest) => [manifest.id, manifest.name]),
      ),
    [skillManifests],
  );

  const skillNodeTypes = useMemo(
    () =>
      Object.fromEntries(
        skillManifests.map((manifest) => [
          manifest.id,
          manifest.canvas.nodeType || "text",
        ]),
      ),
    [skillManifests],
  );

  const activeItem = items.find((item) => item.id === activeItemId) ?? null;
  const activeManifest = activeItem ? manifestById.get(activeItem.skillId) : undefined;

  const currentStage = useMemo(() => {
    if (!activeItem || !activeManifest) {
      return null;
    }

    return deriveSkillStage(
      { id: activeManifest.id, stages: activeManifest.stages },
      activeItem.state,
    );
  }, [activeItem, activeManifest]);

  const handleItemSelect = useCallback(
    (itemId: string) => {
      setActiveItemId(itemId);
      itemPanel.open();
    },
    [itemPanel],
  );

  const handleItemUpdate = useCallback((itemId: string, output: SimpleSkillOutput) => {
    setItems((current) => updateItemById(current, itemId, { state: output.state }));
  }, []);

  const handleMessagesSync = useCallback(
    (itemId: string, messages: CanvasItemWithMessages["messages"]) => {
      setItems((current) => updateItemById(current, itemId, { messages }));
    },
    [],
  );

  const handleItemContentChange = useCallback(
    (itemId: string, content: string) => {
      setItems((current) =>
        current.map((item) =>
          item.id === itemId ? { ...item, state: { ...item.state, content } } : item,
        ),
      );

      scheduleContentSave(() => {
        void updateCanvasItemStateAction(itemId, { content });
      });
    },
    [scheduleContentSave],
  );

  const handleItemPositionChange = useCallback(
    (
      itemId: string,
      positionX: number,
      positionY: number,
      width: number,
      height: number,
    ) => {
      setItems((current) =>
        updateItemById(current, itemId, {
          positionX,
          positionY,
          width,
          height,
        }),
      );
    },
    [],
  );

  const handleEdgeAdd = useCallback((edge: CanvasEdgeRow) => {
    setEdges((current) => {
      if (current.some((item) => item.id === edge.id)) {
        return current;
      }

      return [...current, edge];
    });
  }, []);

  const handleEdgeRemove = useCallback((edgeId: string) => {
    setEdges((current) => current.filter((edge) => edge.id !== edgeId));
  }, []);

  const handleItemAdd = useCallback(
    async (skillId: string) => {
      const newItem = await createCanvasItemAction(projectId, skillId, {
        x: 120 + items.length * 40,
        y: 120 + items.length * 40,
      });

      const withMessages: CanvasItemWithMessages = { ...newItem, messages: [] };
      setItems((current) => [...current, withMessages]);
      setActiveItemId(newItem.id);
      itemPanel.open();
    },
    [itemPanel, items.length, projectId],
  );

  const handleItemDelete = useCallback(
    async (itemId: string) => {
      try {
        await deleteCanvasItemAction(itemId);
      } catch {
        return;
      }

      setEdges((current) =>
        current.filter(
          (edge) => edge.sourceItemId !== itemId && edge.targetItemId !== itemId,
        ),
      );

      setItems((current) => {
        const next = current.filter((item) => item.id !== itemId);

        if (activeItemId === itemId) {
          const nextActive = next[0]?.id ?? null;
          setActiveItemId(nextActive);

          if (!nextActive) {
            itemPanel.close();
          }
        }

        return next;
      });
    },
    [activeItemId, itemPanel],
  );

  return (
    <main className="fixed inset-0 bg-background">
      <ResizablePanelGroup
        key={itemPanel.isRendered ? "with-items" : "canvas-only"}
        orientation="horizontal"
        defaultLayout={itemPanel.isRendered ? WITH_ITEMS_LAYOUT : CANVAS_ONLY_LAYOUT}
      >
        <ResizablePanel
          id="canvas"
          defaultSize={
            itemPanel.isRendered
              ? `${WITH_ITEMS_LAYOUT.canvas}%`
              : `${CANVAS_ONLY_LAYOUT.canvas}%`
          }
          minSize="50%"
        >
          <ReactFlowProvider>
            <FlowCanvas
              projectId={projectId}
              boardName={boardName}
              items={items}
              edges={edges}
              activeItemId={activeItemId}
              skillOptions={skillOptions}
              skillNames={skillNames}
              skillNodeTypes={skillNodeTypes}
              initialViewport={initialViewport}
              bgColor={bgColor}
              showDots={showDots}
              isItemPanelOpen={itemPanel.isOpen}
              onItemSelect={handleItemSelect}
              onItemAdd={handleItemAdd}
              onItemDelete={handleItemDelete}
              onItemPositionChange={handleItemPositionChange}
              onItemContentChange={handleItemContentChange}
              onEdgeAdd={handleEdgeAdd}
              onEdgeRemove={handleEdgeRemove}
              onToggleItemPanel={itemPanel.toggle}
            />
          </ReactFlowProvider>
        </ResizablePanel>

        {itemPanel.isRendered && activeItem && activeManifest ? (
          <>
            <ResizableHandle
              withHandle
              className={cn(
                "transition-opacity duration-300 ease-out",
                itemPanel.isVisible ? "opacity-100" : "opacity-0",
              )}
            />
            <ResizablePanel
              id="items"
              defaultSize={`${WITH_ITEMS_LAYOUT.items}%`}
              minSize="24%"
              maxSize="50%"
              className={cn(
                "transition-all duration-300 ease-out",
                itemPanel.isVisible
                  ? "translate-x-0 opacity-100"
                  : "pointer-events-none translate-x-3 opacity-0",
              )}
            >
              <ItemPanel
                projectId={projectId}
                item={activeItem}
                skillName={activeManifest.name}
                currentStage={currentStage}
                onItemUpdate={handleItemUpdate}
                onMessagesSync={handleMessagesSync}
                onClose={itemPanel.close}
              />
            </ResizablePanel>
          </>
        ) : null}
      </ResizablePanelGroup>
    </main>
  );
}
