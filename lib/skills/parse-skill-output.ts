import type { SimpleSkillOutput } from "@/types/skill";

export function parseSkillOutputJson(text: string): SimpleSkillOutput | null {
  const trimmed = text.trim();

  const fenced = trimmed.match(/^```(?:json)?\s*([\s\S]*?)```$/i);
  const candidate = fenced ? fenced[1].trim() : trimmed;

  const start = candidate.indexOf("{");
  const end = candidate.lastIndexOf("}");

  if (start === -1 || end === -1 || end <= start) {
    return null;
  }

  try {
    const parsed = JSON.parse(candidate.slice(start, end + 1)) as unknown;

    if (
      !parsed ||
      typeof parsed !== "object" ||
      typeof (parsed as SimpleSkillOutput).message !== "string" ||
      !(parsed as SimpleSkillOutput).state ||
      typeof (parsed as SimpleSkillOutput).state !== "object"
    ) {
      return null;
    }

    return {
      message: (parsed as SimpleSkillOutput).message,
      state: (parsed as SimpleSkillOutput).state as Record<string, unknown>,
    };
  } catch {
    return null;
  }
}
