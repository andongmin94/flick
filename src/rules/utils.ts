import type { ExtractResult } from "../types/global";

type Blocks = ExtractResult["blocks"];

export function normUrl(src: string | null): string {
  if (!src) return "";
  if (src.startsWith("//")) return location.protocol + src;
  if (src.startsWith("/")) return location.origin + src;
  return src;
}

export function cleanText(t: string, maxNewlines = 2): string {
  const repeatedNewlines = new RegExp(`\\n{${maxNewlines + 1},}`, "g");
  return t
    .replace(/\u200B/g, "")
    .replace(/\u00A0/g, " ")
    .replace(/\r/g, "")
    .replace(/[ \t]+/g, " ")
    .replace(repeatedNewlines, "\n".repeat(maxNewlines))
    .trim();
}

export function pushUniqueText(
  blocks: Blocks,
  seenText: Set<string>,
  raw: string,
  maxNewlines = 2
): boolean {
  const text = cleanText(raw, maxNewlines);
  if (!text || seenText.has(text)) return false;
  seenText.add(text);
  blocks.push({ type: "text", text });
  return true;
}

export function pushUniqueImage(
  blocks: Blocks,
  seenImg: Set<string>,
  raw: string | null,
  alt = "",
  skipPattern?: RegExp
): boolean {
  const src = normUrl(raw);
  if (!src || seenImg.has(src)) return false;
  if (skipPattern?.test(src)) return false;
  seenImg.add(src);
  blocks.push({ type: "image", src, alt: alt.trim() });
  return true;
}

export function pushVideo(
  blocks: Blocks,
  raw: string | null,
  poster?: string | null
): boolean {
  const src = normUrl(raw);
  if (!src) return false;
  blocks.push({ type: "video", src, poster: poster || "" });
  return true;
}

export function pushTrustedHtml(blocks: Blocks, html: string): boolean {
  if (!html) return false;
  blocks.push({ type: "trusted-html", html });
  return true;
}

export function appendTextGap(blocks: Blocks): void {
  const last = blocks[blocks.length - 1] as
    | ((typeof blocks)[number] & { type?: string; text?: string })
    | undefined;
  if (!last || last.type !== "text") return;
  const text = last.text || "";
  if (/\n\n$/.test(text)) return;
  last.text = text.replace(/\s+$/g, "") + (/\n$/.test(text) ? "\n" : "\n\n");
}
