import {
  COMPOSE_SKILL_ID,
  DOCUMENT_SKILL_ID,
  OUTLINE_SKILL_ID,
} from "@/lib/skills/skill-ids";
import type { CanvasItemRow } from "@/types/skill";

type OutlineSection = {
  title?: string;
  bullets?: string[];
};

function formatOutlineSections(sections: unknown): string | null {
  if (!Array.isArray(sections) || sections.length === 0) {
    return null;
  }

  return sections
    .map((section) => {
      const { title, bullets } = section as OutlineSection;
      const bulletLines = bullets?.map((bullet) => `  - ${bullet}`).join("\n") ?? "";

      return `## ${title ?? "无标题"}\n${bulletLines}`;
    })
    .join("\n\n");
}

function extractStateText(
  skillId: string,
  state: Record<string, unknown>,
): string | null {
  if (!state || Object.keys(state).length === 0) {
    return null;
  }

  switch (skillId) {
    case DOCUMENT_SKILL_ID:
    case COMPOSE_SKILL_ID:
      return typeof state.content === "string" && state.content ? state.content : null;
    case OUTLINE_SKILL_ID:
      return formatOutlineSections(state.sections);
    default:
      return JSON.stringify(state, null, 2);
  }
}

/**
 * 将上游节点列表序列化为 prompt 可读的上下文字符串。
 * 只取有内容的节点，跳过空 state。
 */
export function buildUpstreamContext(items: CanvasItemRow[]): string | undefined {
  const parts = items
    .map((item) => {
      const text = extractStateText(item.skillId, item.state);
      if (!text) {
        return null;
      }

      return `[上游节点：${item.skillId} / ${item.id.slice(0, 8)}]\n${text}`;
    })
    .filter((part): part is string => part !== null);

  return parts.length > 0 ? parts.join("\n\n---\n\n") : undefined;
}
