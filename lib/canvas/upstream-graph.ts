import type { CanvasEdgeRow } from "@/types/skill";

export function getIncomingEdgesByTarget(edges: CanvasEdgeRow[]) {
  const incomingEdgesByTarget = new Map<string, CanvasEdgeRow[]>();

  for (const edge of edges) {
    const incomingEdges = incomingEdgesByTarget.get(edge.targetItemId) ?? [];

    incomingEdges.push(edge);
    incomingEdgesByTarget.set(edge.targetItemId, incomingEdges);
  }

  for (const incomingEdges of incomingEdgesByTarget.values()) {
    incomingEdges.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  }

  return incomingEdgesByTarget;
}

export function getUpstreamItemIds(
  itemId: string,
  incomingEdgesByTarget: Map<string, CanvasEdgeRow[]>,
) {
  const visited = new Set<string>();
  const upstreamItemIds: string[] = [];

  function visit(targetItemId: string) {
    const incomingEdges = incomingEdgesByTarget.get(targetItemId) ?? [];

    for (const edge of incomingEdges) {
      if (visited.has(edge.sourceItemId)) {
        continue;
      }

      visited.add(edge.sourceItemId);
      visit(edge.sourceItemId);
      upstreamItemIds.push(edge.sourceItemId);
    }
  }

  visit(itemId);

  return upstreamItemIds;
}
