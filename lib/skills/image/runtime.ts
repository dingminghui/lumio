import { randomUUID } from "node:crypto";

import { getDecryptedImageModelConfig } from "@/db/profile-queries";
import {
  CLOUDFLARE_IMAGE_MODEL,
  runCloudflareImageModel,
} from "@/lib/cloudflare-workers-ai";
import { IMAGE_NODE_IMAGE_LIMIT, IMAGE_SKILL_ID } from "@/lib/skills/image/constants";
import type { SimpleSkillOutput } from "@/types/skill";

type ImageUsage = "cover" | "illustration" | "poster" | "thumbnail";

type ImageNodeImage = {
  id: string;
  src: string;
  prompt: string;
  createdAt: string;
};

type ImageNodeState = Record<string, unknown> & {
  description?: unknown;
  style?: unknown;
  aspectRatio?: unknown;
  usage?: unknown;
  images?: unknown;
  status?: unknown;
  error?: unknown;
  pendingConfirmation?: unknown;
};

const usageLabels: Record<ImageUsage, string> = {
  cover: "封面",
  illustration: "正文插图",
  poster: "海报",
  thumbnail: "缩略图",
};

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function getImages(state: ImageNodeState): ImageNodeImage[] {
  if (!Array.isArray(state.images)) {
    return [];
  }

  return state.images.filter(
    (image): image is ImageNodeImage =>
      Boolean(image) &&
      typeof image === "object" &&
      "src" in image &&
      typeof image.src === "string",
  );
}

function getUsage(value: unknown): ImageUsage | null {
  return value === "cover" ||
    value === "illustration" ||
    value === "poster" ||
    value === "thumbnail"
    ? value
    : null;
}

function buildPrompt(state: ImageNodeState) {
  const usage = getUsage(state.usage);
  const description = isNonEmptyString(state.description)
    ? state.description.trim()
    : "";
  const style = isNonEmptyString(state.style) ? state.style.trim() : "";
  const aspectRatio = isNonEmptyString(state.aspectRatio)
    ? state.aspectRatio.trim()
    : "";

  return [
    description,
    style ? `Visual style: ${style}` : "",
    aspectRatio ? `Aspect ratio: ${aspectRatio}` : "",
    usage ? `Intended use: ${usageLabels[usage]}` : "",
  ]
    .filter(Boolean)
    .join("\n");
}

function isReadyToGenerate(state: ImageNodeState) {
  return (
    state.status === "generating" &&
    isNonEmptyString(state.description) &&
    isNonEmptyString(state.style) &&
    isNonEmptyString(state.aspectRatio) &&
    Boolean(getUsage(state.usage))
  );
}

export async function resolveImageSkillOutput({
  skillId,
  output,
  onMessage,
}: {
  skillId: string;
  output: SimpleSkillOutput;
  onMessage: (message: string) => void;
}): Promise<SimpleSkillOutput> {
  if (skillId !== IMAGE_SKILL_ID) {
    return output;
  }

  const state = output.state as ImageNodeState;
  const images = getImages(state);

  if (images.length >= IMAGE_NODE_IMAGE_LIMIT) {
    const message = `${output.message}\n\n已达到 6 张上限，无法继续生成。`;
    onMessage(message);

    return {
      message,
      state: {
        ...state,
        images,
        status: "limit_reached",
        error: "已达到 6 张上限，无法继续生成。",
        pendingConfirmation: false,
      },
    };
  }

  if (!isReadyToGenerate(state)) {
    return {
      ...output,
      state: {
        ...state,
        images,
      },
    };
  }

  const prompt = buildPrompt(state);
  const generatingMessage = `${output.message}\n\n正在生成图片...`;
  onMessage(generatingMessage);

  let config;

  try {
    config = await getDecryptedImageModelConfig();
  } catch {
    const message = `${generatingMessage}\n\n缺少 MODEL_CONFIG_SECRET，无法读取 Cloudflare API Token。`;
    onMessage(message);

    return {
      message,
      state: {
        ...state,
        images,
        status: "error",
        error: "缺少 MODEL_CONFIG_SECRET，无法读取 Cloudflare API Token。",
        pendingConfirmation: false,
      },
    };
  }

  if (!config?.validatedAt) {
    const message = `${generatingMessage}\n\n请先在我的 / 图片模型中完成 Cloudflare Workers AI 配置。`;
    onMessage(message);

    return {
      message,
      state: {
        ...state,
        images,
        status: "error",
        error: "请先完成 Cloudflare Workers AI 图片模型配置。",
        pendingConfirmation: false,
      },
    };
  }

  try {
    const src = await runCloudflareImageModel({
      accountId: config.accountId,
      apiToken: config.apiToken,
      model: config.model || CLOUDFLARE_IMAGE_MODEL,
      prompt,
    });
    const nextImages = [
      ...images,
      {
        id: randomUUID(),
        src,
        prompt,
        createdAt: new Date().toISOString(),
      },
    ];
    const message = `${generatingMessage}\n\n图片已生成并写入节点。`;
    onMessage(message);

    return {
      message,
      state: {
        ...state,
        images: nextImages,
        status:
          nextImages.length >= IMAGE_NODE_IMAGE_LIMIT ? "limit_reached" : "generated",
        error: "",
        pendingConfirmation: false,
      },
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "图片生成失败";
    const message = `${generatingMessage}\n\n生成失败：${errorMessage}`;
    onMessage(message);

    return {
      message,
      state: {
        ...state,
        images,
        status: "error",
        error: errorMessage,
        pendingConfirmation: false,
      },
    };
  }
}
