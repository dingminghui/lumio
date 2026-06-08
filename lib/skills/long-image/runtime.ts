import { getProjectDetail } from "@/db/queries";
import { DOCUMENT_SKILL_ID } from "@/lib/canvas/constants";
import {
  getIncomingEdgesByTarget,
  getUpstreamItemIds,
} from "@/lib/canvas/upstream-graph";
import { IMAGE_SKILL_ID } from "@/lib/skills/image";
import { hasLongImageContent } from "@/lib/skills/long-image/state";
import type { SimpleSkillOutput } from "@/types/skill";

export type LongImageSourceDocument = {
  id: string;
  title: string;
  content: string;
};

export type LongImageSourceImage = {
  id: string;
  src: string;
  prompt: string;
};

export type LongImageGenerationContext = {
  documents: LongImageSourceDocument[];
  images: LongImageSourceImage[];
};

type ImageStateEntry = {
  id?: unknown;
  src?: unknown;
  prompt?: unknown;
};

const CHINESE_ORDINALS = [
  "一",
  "二",
  "三",
  "四",
  "五",
  "六",
  "七",
  "八",
  "九",
  "十",
] as const;

function getDocumentTitle(content: string, index: number) {
  const heading = content
    .split("\n")
    .map((line) => line.trim())
    .find((line) => /^#{1,6}\s+\S/.test(line));

  return heading?.replace(/^#{1,6}\s+/, "").trim() || `文档 ${index + 1}`;
}

function getImageEntries(value: unknown): ImageStateEntry[] {
  return Array.isArray(value)
    ? value.filter(
        (entry): entry is ImageStateEntry =>
          Boolean(entry) && typeof entry === "object",
      )
    : [];
}

function getChineseOrdinal(index: number) {
  return CHINESE_ORDINALS[index] ?? String(index + 1);
}

export async function getLongImageGenerationContext(
  projectId: string,
  itemId: string,
): Promise<LongImageGenerationContext> {
  const detail = await getProjectDetail(projectId);

  if (!detail) {
    return { documents: [], images: [] };
  }

  const itemsById = new Map(detail.items.map((item) => [item.id, item]));
  const incomingEdgesByTarget = getIncomingEdgesByTarget(detail.edges);
  const upstreamItemIds = getUpstreamItemIds(itemId, incomingEdgesByTarget);
  const documents: LongImageSourceDocument[] = [];
  const images: LongImageSourceImage[] = [];

  for (const upstreamItemId of upstreamItemIds) {
    const source = itemsById.get(upstreamItemId);

    if (!source) {
      continue;
    }

    if (source.skillId === DOCUMENT_SKILL_ID) {
      const content =
        typeof source.state.content === "string" ? source.state.content.trim() : "";

      if (content) {
        documents.push({
          id: source.id,
          title: getDocumentTitle(content, documents.length),
          content,
        });
      }
    }

    if (source.skillId === IMAGE_SKILL_ID) {
      for (const image of getImageEntries(source.state.images)) {
        if (typeof image.src !== "string" || !image.src.trim()) {
          continue;
        }

        const id =
          typeof image.id === "string" && image.id.trim()
            ? image.id
            : `${source.id}-${images.length + 1}`;

        images.push({
          id,
          src: image.src,
          prompt: typeof image.prompt === "string" ? image.prompt : "",
        });
      }
    }
  }

  return { documents, images };
}

export function createLongImageProgressMessage(context: LongImageGenerationContext) {
  const documentMessages = context.documents.map(
    (document, index) =>
      `正在整理总结第${getChineseOrdinal(index)}个文档节点「${document.title}」的内容`,
  );
  const imageMessage =
    context.images.length > 0
      ? `正在整理 ${context.images.length} 张上游图片素材`
      : "";

  return [
    ...documentMessages,
    imageMessage,
    "正在梳理长图",
    "正在生成最终回复中",
  ]
    .filter(Boolean)
    .join("\n");
}

function distributeImagesToSections(
  sections: Record<string, unknown>[],
  images: LongImageSourceImage[],
) {
  if (!images.length || !sections.length) {
    return sections;
  }

  const validImageIds = new Set(images.map((image) => image.id));
  const usedImageIds = new Set<string>();

  const result = sections.map((section) => {
    const imageId =
      typeof section.imageId === "string" ? section.imageId.trim() : "";

    if (imageId && validImageIds.has(imageId)) {
      usedImageIds.add(imageId);
      return section;
    }

    return { ...section, imageId: "" };
  });

  const unusedImages = images.filter((image) => !usedImageIds.has(image.id));

  if (!unusedImages.length) {
    return result;
  }

  const emptySectionIndexes = result
    .map((section, index) => {
      const imageId =
        typeof section.imageId === "string" ? section.imageId.trim() : "";

      return imageId ? -1 : index;
    })
    .filter((index) => index >= 0);

  unusedImages.forEach((image, imageIndex) => {
    const slot = Math.floor(
      ((imageIndex + 0.5) * emptySectionIndexes.length) / unusedImages.length,
    );
    const sectionIndex =
      emptySectionIndexes[Math.min(slot, emptySectionIndexes.length - 1)];

    if (sectionIndex === undefined) {
      return;
    }

    result[sectionIndex] = {
      ...result[sectionIndex],
      imageId: image.id,
    };
  });

  return result;
}

export function createLongImageContextPrompt(context: LongImageGenerationContext) {
  const documentBlocks = context.documents
    .map(
      (document, index) =>
        `【文档 ${index + 1}】${document.title}\n节点 ID：${document.id}\n内容：\n${document.content}`,
    )
    .join("\n\n---\n\n");
  const imageBlocks = context.images
    .map(
      (image, index) =>
        `【图片 ${index + 1}】id=${image.id}\nprompt=${image.prompt || "无"}\nsrc=${image.src}`,
    )
    .join("\n\n");

  return `上游文档节点（必须作为主要依据）：\n${documentBlocks}\n\n上游图片素材（可选使用，仅允许引用 id）：\n${imageBlocks || "无"}`;
}

export function resolveLongImageSkillOutput({
  output,
  context,
}: {
  output: SimpleSkillOutput;
  context: LongImageGenerationContext;
}): SimpleSkillOutput {
  if (!hasLongImageContent(output.state)) {
    const message = "长图内容生成失败：模型没有返回可渲染的章节内容，请重试。";

    return {
      message,
      state: {
        ...output.state,
        status: "error",
        images: context.images,
        error: message,
        generatedAt: new Date().toISOString(),
      },
    };
  }

  const sections = Array.isArray(output.state.sections)
    ? output.state.sections.filter(
        (section): section is Record<string, unknown> =>
          Boolean(section) && typeof section === "object",
      )
    : [];

  return {
    message: output.message,
    state: {
      ...output.state,
      status: "ready",
      sections: distributeImagesToSections(sections, context.images),
      images: context.images,
      error: "",
      generatedAt:
        typeof output.state.generatedAt === "string" && output.state.generatedAt
          ? output.state.generatedAt
          : new Date().toISOString(),
    },
  };
}
