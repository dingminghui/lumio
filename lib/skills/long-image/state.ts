import type { CanvasItemWithMessages } from "@/db/queries";
import { LONG_IMAGE_SKILL_ID } from "@/lib/skills/long-image/constants";
import type { SimpleSkillOutput } from "@/types/skill";

export const LONG_IMAGE_GENERATE_PROMPT = "生成长图";

export type LongImageSection = {
  title: string;
  body: string;
  quote?: string;
  imageId?: string;
};

export type LongImageAsset = {
  id: string;
  src: string;
  prompt?: string;
};

export type LongImageState = {
  status?: unknown;
  title?: unknown;
  subtitle?: unknown;
  summary?: unknown;
  sections?: unknown;
  images?: unknown;
  error?: unknown;
  generatedAt?: unknown;
};

function getText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

export function hasLongImageContent(state: Record<string, unknown>) {
  return getSections(state.sections).length > 0;
}

export function getSections(value: unknown): LongImageSection[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((section) => {
      if (!section || typeof section !== "object") {
        return null;
      }

      const entry = section as Record<string, unknown>;
      const title = getText(entry.title);
      const body = getText(entry.body);

      if (!title || !body) {
        return null;
      }

      const normalizedSection: LongImageSection = {
        title,
        body,
        quote: getText(entry.quote),
        imageId: getText(entry.imageId),
      };

      return normalizedSection;
    })
    .filter((section): section is LongImageSection => Boolean(section));
}

export function getImages(value: unknown): LongImageAsset[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((image) => {
      if (!image || typeof image !== "object") {
        return null;
      }

      const entry = image as Record<string, unknown>;
      const id = getText(entry.id);
      const src = getText(entry.src);

      if (!id || !src) {
        return null;
      }

      const normalizedImage: LongImageAsset = {
        id,
        src,
        prompt: getText(entry.prompt),
      };

      return normalizedImage;
    })
    .filter((image): image is LongImageAsset => Boolean(image));
}

export function parseLongImageState(state: LongImageState) {
  const sections = getSections(state.sections);

  return {
    title: getText(state.title),
    subtitle: getText(state.subtitle),
    summary: getText(state.summary),
    sections,
    images: getImages(state.images),
    hasContent: sections.length > 0,
    isGenerating: state.status === "generating",
    statusText: getStatusText(state, sections.length),
    showGenerateButton: sections.length === 0 && state.status !== "generating",
  };
}

export function getStatusText(state: LongImageState, sectionCount: number) {
  if (state.status === "generating") {
    return "生成中";
  }

  if (sectionCount > 0) {
    return "已生成";
  }

  return "待生成";
}

export function createLongImageFileName(title: string) {
  const normalized = title
    .trim()
    .replace(/[\\/:*?"<>|]/g, "")
    .replace(/\s+/g, "-")
    .slice(0, 40);

  return `${normalized || "long-image"}.png`;
}

export function splitLongImageParagraphs(body: string) {
  return body
    .split(/\n+/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);
}

export function markLongImageGenerating(
  item: CanvasItemWithMessages,
): CanvasItemWithMessages {
  return {
    ...item,
    state: { ...item.state, status: "generating", error: "" },
  };
}

export function revertLongImageGenerating(
  item: CanvasItemWithMessages,
): CanvasItemWithMessages {
  if (item.skillId !== LONG_IMAGE_SKILL_ID || item.state.status !== "generating") {
    return item;
  }

  const hasContent = hasLongImageContent(item.state);

  return {
    ...item,
    state: {
      ...item.state,
      status: hasContent ? "ready" : "empty",
      error: "",
    },
  };
}

export function shouldApplyLongImageOutput(output: SimpleSkillOutput) {
  return output.state.status !== "error";
}

export function isLongImageSkill(skillId: string) {
  return skillId === LONG_IMAGE_SKILL_ID;
}
