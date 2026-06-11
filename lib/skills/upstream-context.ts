import type { CanvasItemRow } from "@/types/skill";

/**
 * 将上游节点列表序列化为 prompt 可读的上下文字符串。
 * 只取有内容的节点，跳过空 state。
 */
export function buildUpstreamContext(items: CanvasItemRow[]): string | undefined {
  const parts = items
    .filter((item) => {
      const state = item.state;
      return state && Object.keys(state).length > 0;
    })
    .map((item) => {
      const label = `[上游节点 ${item.skillId} / ${item.id.slice(0, 8)}]`;
      const content = JSON.stringify(item.state, null, 2);
      return `${label}\n${content}`;
    });

  return parts.length > 0 ? parts.join("\n\n") : undefined;
}
