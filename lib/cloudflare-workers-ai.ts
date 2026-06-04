import "server-only";

export const CLOUDFLARE_IMAGE_PROVIDER_ID = "cloudflare-workers-ai";
export const CLOUDFLARE_IMAGE_PROVIDER_LABEL = "Cloudflare Workers AI";
export const CLOUDFLARE_IMAGE_MODEL = "@cf/black-forest-labs/flux-1-schnell";

type CloudflareImageRunOptions = {
  accountId: string;
  apiToken: string;
  model?: string;
  prompt: string;
  steps?: number;
  timeoutMs?: number;
};

function getCloudflareErrorMessage(payload: unknown, fallback: string) {
  if (!payload || typeof payload !== "object") {
    return fallback;
  }

  const errors = "errors" in payload ? payload.errors : undefined;

  if (Array.isArray(errors) && errors.length > 0) {
    const messages = errors
      .map((error) => {
        if (!error || typeof error !== "object" || !("message" in error)) {
          return "";
        }

        return typeof error.message === "string" ? error.message : "";
      })
      .filter(Boolean);

    if (messages.length > 0) {
      return messages.join("；");
    }
  }

  return fallback;
}

function getImageFromPayload(payload: unknown) {
  if (!payload || typeof payload !== "object") {
    return null;
  }

  if ("image" in payload && typeof payload.image === "string") {
    return payload.image;
  }

  if (!("result" in payload) || !payload.result || typeof payload.result !== "object") {
    return null;
  }

  return "image" in payload.result && typeof payload.result.image === "string"
    ? payload.result.image
    : null;
}

export async function runCloudflareImageModel({
  accountId,
  apiToken,
  model = CLOUDFLARE_IMAGE_MODEL,
  prompt,
  steps = 4,
  timeoutMs = 60000,
}: CloudflareImageRunOptions) {
  const response = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/run/${model}`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ prompt, steps }),
      signal: AbortSignal.timeout(timeoutMs),
    },
  );
  const payload = (await response.json().catch(() => null)) as unknown;
  const image = getImageFromPayload(payload);

  if (!response.ok || !image) {
    throw new Error(
      getCloudflareErrorMessage(payload, "Cloudflare Workers AI 图片生成失败"),
    );
  }

  return `data:image/jpeg;base64,${image}`;
}

export async function validateCloudflareImageConfig({
  accountId,
  apiToken,
}: {
  accountId: string;
  apiToken: string;
}) {
  await runCloudflareImageModel({
    accountId,
    apiToken,
    prompt: "simple gray square icon",
    steps: 1,
    timeoutMs: 60000,
  });
}
