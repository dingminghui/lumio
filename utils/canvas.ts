export function isHexColor(value: unknown): value is string {
  return typeof value === "string" && /^#[0-9a-fA-F]{6}$/.test(value);
}

export function normalizeHex(value: string) {
  const cleaned = value.trim().replace(/^#/, "");
  const normalized = `#${cleaned.toLowerCase()}`;

  if (!isHexColor(normalized)) {
    return null;
  }

  return normalized;
}

export function deriveDotColor(backgroundColor: string) {
  const r = parseInt(backgroundColor.slice(1, 3), 16);
  const g = parseInt(backgroundColor.slice(3, 5), 16);
  const b = parseInt(backgroundColor.slice(5, 7), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;

  return luminance > 0.5 ? "#c4c4c8" : "#6e6e78";
}
