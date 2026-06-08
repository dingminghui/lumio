import { DOCUMENT_SKILL_ID } from "@/lib/canvas/constants";
import {
  getIncomingEdgesByTarget,
  getUpstreamItemIds,
} from "@/lib/canvas/upstream-graph";
import type { CanvasItemWithMessages } from "@/db/queries";
import type { CanvasEdgeRow } from "@/types/skill";

export function computeUpstreamDocumentCounts(
  items: CanvasItemWithMessages[],
  edges: CanvasEdgeRow[],
): Record<string, number> {
  const itemsById = new Map(items.map((item) => [item.id, item]));
  const incomingEdgesByTarget = getIncomingEdgesByTarget(edges);
  const counts: Record<string, number> = {};

  for (const item of items) {
    const upstreamItemIds = getUpstreamItemIds(item.id, incomingEdgesByTarget);
    let documentCount = 0;

    for (const upstreamItemId of upstreamItemIds) {
      const source = itemsById.get(upstreamItemId);

      if (!source || source.skillId !== DOCUMENT_SKILL_ID) {
        continue;
      }

      const content =
        typeof source.state.content === "string" ? source.state.content.trim() : "";

      if (content) {
        documentCount += 1;
      }
    }

    counts[item.id] = documentCount;
  }

  return counts;
}
