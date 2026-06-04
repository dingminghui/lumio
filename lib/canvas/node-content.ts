import { DOCUMENT_SKILL_ID } from "@/lib/canvas/constants";

export function isDocumentSkill(skillId: string) {
  return skillId === DOCUMENT_SKILL_ID;
}

export function getDocumentMarkdown(state: Record<string, unknown>) {
  return typeof state.content === "string" ? state.content : "";
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
