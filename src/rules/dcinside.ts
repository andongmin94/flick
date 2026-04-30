import type { ExtractResult, Rule } from "../types/global";
import {
  appendTextGap,
  cleanText,
  pushUniqueImage,
  pushUniqueText,
  pushVideo,
} from "./utils";

export function extractDcinside(_ruleCfg?: Rule): ExtractResult {
  let title =
    (
      document.querySelector(".title_subject") as HTMLElement | null
    )?.textContent?.trim() ||
    document.title ||
    "제목 없음";

  const content =
    (document.querySelector(".write_div") as Element | null) ||
    (document.querySelector("#container .write_view") as Element | null) ||
    (document.querySelector(".gallview_contents") as Element | null) ||
    (document.querySelector("#dgn_content_de") as Element | null) ||
    (document.querySelector("article") as Element | null) ||
    null;
  if (!content)
    return {
      title,
      blocks: [],
    };

  const blocks: ExtractResult["blocks"] = [];
  const seenImg = new Set<string>();
  const seenText = new Set<string>();

  const SKIP_SELECTOR = [
    ".recomm_box",
    ".user_comment",
    ".bottom_box",
    ".app_bottom_ad",
    "#recomm_layer",
    ".img_comment",
    ".img_comment_box",
    ".comment_wrap",
    ".view_comment",
    ".btn_recommend_box",
    ".recom_bottom_box",
    ".dctrend_ranking",
    ".appending_file_box",
    "#taboola-below-article-thumbnails",
    ".con_banner",
    ".sch_alliance_box",
    ".positionr",
    ".btn_imgcmtopen",
    "#dcappfooter",
  ].join(",");

  function pushImage(raw: string | null, alt?: string) {
    let cleanAlt = (alt || "").trim();
    if (/^[a-f0-9]{24,}$/i.test(cleanAlt) || cleanAlt.length > 120)
      cleanAlt = "";
    pushUniqueImage(blocks, seenImg, raw, cleanAlt, /pixel|ads|banner/i);
  }

  function walk(node: Node | null, buf: string[]) {
    if (!node) return;
    if (node.nodeType === 1) {
      const el = node as HTMLElement;
      if (el.matches(SKIP_SELECTOR)) return;
      const inlineStyle = el.getAttribute("style") || "";
      if (/clear\s*:\s*both/i.test(inlineStyle)) return;
      const tag = el.tagName;
      if (/^(SCRIPT|STYLE|IFRAME|TEMPLATE|NOSCRIPT)$/i.test(tag)) return;
      if (el.classList.contains("num") || el.classList.contains("btn")) return;
      const isBlock = /^(P|DIV|SECTION|ARTICLE|LI|UL|OL|H[1-6])$/.test(tag);
      if (tag === "IMG") {
        flush(buf);
        const src =
          el.getAttribute("data-original") ||
          el.getAttribute("data-src") ||
          el.getAttribute("src");
        pushImage(src, el.getAttribute("alt") || "");
        return;
      }
      if (tag === "VIDEO") {
        flush(buf);
        let vSrc =
          (
            el.querySelector("source[src]") as HTMLSourceElement | null
          )?.getAttribute("src") ||
          el.getAttribute("src") ||
          el.getAttribute("data-original") ||
          "";
        pushVideo(blocks, vSrc);
        return;
      }
      if (tag === "BR") {
        buf.push("\n");
        return;
      }
      if (isBlock) {
        if (buf.length && !/\n$/.test(buf[buf.length - 1])) buf.push("\n");
      }
      const startLen = buf.length;
      let hasChildContent = false;
      for (const child of Array.from(el.childNodes)) {
        const before = buf.length;
        walk(child, buf);
        if (buf.length > before) hasChildContent = true;
      }
      if (isBlock && !hasChildContent) {
        if (!buf.length || !/\n$/.test(buf[buf.length - 1])) buf.push("\n");
      }
      if (
        isBlock &&
        startLen !== buf.length &&
        !/\n$/.test(buf[buf.length - 1])
      ) {
        buf.push("\n");
      }
      return;
    } else if (node.nodeType === 3) {
      const text = (node.nodeValue || "").replace(/\s+/g, " ");
      const trimmed = text.trim();
      if (/^-\s*dc\s+official\s+app$/i.test(trimmed)) return;
      if (trimmed) buf.push(text);
    }
  }

  function flush(buf: string[]) {
    if (!buf.length) return;
    const raw = buf.join("");
    buf.length = 0;
    const cleaned = cleanText(raw);
    if (!cleaned) {
      const nlCount = (raw.match(/\n/g) || []).length;
      if (nlCount) appendTextGap(blocks);
      return;
    }
    pushUniqueText(blocks, seenText, cleaned);
  }

  const buf: string[] = [];
  for (const node of Array.from(content.childNodes)) walk(node, buf);
  flush(buf);

  return { title, blocks };
}

function postDcinsideShortsMounted() {
  document.querySelectorAll(".flick-wrap-injected video").forEach((v) => {
    try {
      const vv = v as HTMLVideoElement;
      vv.autoplay = true;
      vv.loop = true;
      vv.muted = true;
      (vv as any).playsInline = true;
      vv.removeAttribute("controls");
      if (!(vv as any).dataset._flickTried) {
        (vv as any).dataset._flickTried = "1";
        vv.play().catch(() => {});
      }
    } catch (_) {}
  });
}

export const dcinsideRule: Rule = {
  id: "dcinside",
  match: /https?:\/\/gall\.dcinside\.com\//i,
  articleMatch: /board\/view\/\?[^#]*?(?:&|^)no=\d+/i,
  extract: extractDcinside,
  postShortsMounted: postDcinsideShortsMounted,
};
