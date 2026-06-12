import {
  COMPOSE_SKILL_ID,
  DOCUMENT_SKILL_ID,
  OUTLINE_SKILL_ID,
} from "@/lib/skills/skill-ids";

export function isDocumentSkill(skillId: string) {
  return skillId === DOCUMENT_SKILL_ID;
}

export function isOutlineSkill(skillId: string) {
  return skillId === OUTLINE_SKILL_ID;
}

export function isComposeSkill(skillId: string) {
  return skillId === COMPOSE_SKILL_ID;
}

/** 节点内可用 Plate 编辑 Markdown 的内置 Skill */
export function isMarkdownEditableSkill(skillId: string) {
  return (
    isDocumentSkill(skillId) ||
    isOutlineSkill(skillId) ||
    isComposeSkill(skillId)
  );
}

export function getDocumentMarkdown(state: Record<string, unknown>) {
  return typeof state.content === "string" ? state.content : "";
}

type OutlineSection = {
  title?: string;
  bullets?: string[];
};

export function getOutlineMarkdown(state: Record<string, unknown>): string {
  const sections = state.sections;

  if (!Array.isArray(sections) || sections.length === 0) {
    return "";
  }

  return formatOutlineSectionsToMarkdown(sections);
}

export function formatOutlineSectionsToMarkdown(sections: unknown): string {
  if (!Array.isArray(sections) || sections.length === 0) {
    return "";
  }

  return sections
    .map((section) => {
      const { title, bullets } = section as OutlineSection;
      const bulletLines = bullets?.map((bullet) => `- ${bullet}`).join("\n") ?? "";

      return `## ${title ?? "无标题"}\n\n${bulletLines}`;
    })
    .join("\n\n");
}

/** 将 Plate 编辑后的大纲 Markdown 解析回 sections 结构 */
export function parseOutlineMarkdown(markdown: string): OutlineSection[] {
  const trimmed = markdown.trim();

  if (!trimmed) {
    return [];
  }

  return trimmed
    .split(/^##\s+/m)
    .map((chunk) => chunk.trim())
    .filter(Boolean)
    .map((chunk) => {
      const lines = chunk.split("\n");
      const title = lines[0]?.trim() || "无标题";
      const bullets = lines
        .slice(1)
        .map((line) => line.trim())
        .filter((line) => /^[-*]\s+/.test(line))
        .map((line) => line.replace(/^[-*]\s+/, "").trim())
        .filter(Boolean);

      return { title, bullets };
    });
}

export function getFallbackNodeContent(state: Record<string, unknown>) {
  const entries = Object.entries(state).filter(
    ([, value]) => value !== undefined && value !== null && value !== "",
  );

  if (!entries.length) {
    return "";
  }

  return entries
    .map(([key, value]) => {
      const body = typeof value === "string" ? value : JSON.stringify(value, null, 2);

      return `**${key}**\n\n${body}`;
    })
    .join("\n\n---\n\n");
}

export function getNodeMarkdownContent(
  skillId: string,
  state: Record<string, unknown>,
): string {
  if (isDocumentSkill(skillId) || isComposeSkill(skillId)) {
    return getDocumentMarkdown(state);
  }

  if (isOutlineSkill(skillId)) {
    return getOutlineMarkdown(state);
  }

  return getFallbackNodeContent(state);
}
