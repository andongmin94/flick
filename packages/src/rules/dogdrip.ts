import type { ExtractResult, Rule } from "../types/global";

function norm(src: string | null): string {
  if (!src) return "";
  if (src.startsWith("//")) return location.protocol + src;
  if (src.startsWith("/")) return location.origin + src;
  return src;
}

export function extractDogdrip(): ExtractResult {
  let title =
    (document.querySelector('meta[property="og:title"]') as HTMLMetaElement | null)?.getAttribute("content")?.trim() ||
    (document
      .querySelector(
        ".title h1, h1.title, h1.tit, h2.title, .document_title, .ed h4, .ed h3"
      ) as HTMLElement | null)
      ?.textContent?.trim() ||
    document.title ||
    "제목 없음";

  let primary = document.querySelector(
    "div.rhymix_content.xe_content[class*='document_']"
  ) as Element | null;
  const content =
    primary ||
    (document.querySelector(".ed") as Element | null) ||
    (document.querySelector(".document_view") as Element | null) ||
    (document.querySelector(".view_content") as Element | null) ||
    (document.querySelector(".read_body") as Element | null) ||
    (document.querySelector(".content_body") as Element | null) ||
    (document.querySelector("article") as Element | null) ||
    (document.querySelector("#content") as Element | null) ||
    document.body;

  const blocks: ExtractResult["blocks"] = [];
  const seenImg = new Set<string>();
  const seenText = new Set<string>();

  const SKIP_SELECTOR = [
    ".comment",
    ".comments",
    ".reply",
    "#comment",
    "#comments",
    ".comment_box",
    ".comment-list",
    ".replies",
    ".board_list",
    ".list_wrap",
    ".tag_list",
    ".related_list",
    ".share",
    ".sns",
    ".ad",
    ".advertise",
    ".banner",
    ".pagination",
    ".aside",
    "script",
    "style",
    "iframe",
    "noscript",
  ].join(",");

  function pushImage(raw: string | null, alt?: string) {
    let src = raw || "";
    if (!src) return;
    src = norm(src);
    if (!src || seenImg.has(src)) return;
    if (/pixel|ads|banner|doubleclick/i.test(src)) return;
    seenImg.add(src);
    blocks.push({ type: "image", src, alt: (alt || "").trim() });
  }

  function cleanText(t: string) {
    return t
      .replace(/\u00A0/g, " ")
      .replace(/[ \t]+/g, " ")
      .replace(/\n{3,}/g, "\n\n")
      .trim();
  }

  function flush(buf: string[]) {
    if (!buf.length) return;
    const raw = buf.join("");
    buf.length = 0;
    const cleaned = cleanText(raw);
    if (!cleaned) return;
    if (seenText.has(cleaned)) return;
    seenText.add(cleaned);
    const html = cleaned
      .replace(/\n{3,}/g, "\n\n")
      .replace(/\n\n/g, "<br><br>")
      .replace(/\n/g, "<br>");
    if (html) blocks.push({ type: "html", html });
  }

  function walk(node: Node | null, buf: string[]) {
    if (!node) return;
    if (node.nodeType === 1) {
      const el = node as HTMLElement;
      const tag = el.tagName;
      if (el.matches(SKIP_SELECTOR)) return;
      if (/^(SCRIPT|STYLE|IFRAME|TEMPLATE|NOSCRIPT)$/i.test(tag)) return;
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
          (el.querySelector("source[src]") as HTMLSourceElement | null)?.getAttribute("src") ||
          el.getAttribute("src") ||
          el.getAttribute("data-src") ||
          "";
        if (vSrc)
          blocks.push({
            type: "video",
            src: norm(vSrc),
            poster: el.getAttribute("poster") || "",
          });
        return;
      }
      if (tag === "BR") {
        buf.push("\n");
        return;
      }
      const isBlock = /^(P|DIV|SECTION|ARTICLE|LI|UL|OL|H[1-6]|BLOCKQUOTE)$/i.test(tag);
      if (isBlock) {
        if (buf.length && !/\n$/.test(buf[buf.length - 1])) buf.push("\n");
      }
      const startLen = buf.length;
      for (const child of Array.from(el.childNodes)) walk(child, buf);
      if (isBlock && startLen !== buf.length && !/\n$/.test(buf[buf.length - 1])) buf.push("\n");
      return;
    } else if (node.nodeType === 3) {
      const text = (node.nodeValue || "").replace(/\s+/g, " ");
      const trimmed = text.trim();
      if (!trimmed) return;
      if (/^\[?레벨:?\d+]?$/i.test(trimmed)) return;
      buf.push(text);
    }
  }

  if (primary) {
    primary
      .querySelectorAll(".addon_addvote, .wgtRv, .tag_list, .related_list")
      .forEach((n) => n.remove());
    const pending: string[] = [];
    function flushPending() {
      if (!pending.length) return;
      let raw = pending.join("\n").replace(/\n{3,}/g, "\n\n").trim();
      if (!raw) {
        pending.length = 0;
        return;
      }
      const cleaned = cleanText(raw);
      if (!cleaned || seenText.has(cleaned)) {
        pending.length = 0;
        return;
      }
      seenText.add(cleaned);
      const html = cleaned
        .replace(/\n{3,}/g, "\n\n")
        .replace(/\n\n/g, "<br><br>")
        .replace(/\n/g, "<br>");
      if (html) blocks.push({ type: "html", html });
      pending.length = 0;
    }
    function isBlankPara(text: string) {
      if (!text) return true;
      const t = text
        .replace(/[\u200B\u200C\u200D\uFEFF]/g, "")
        .replace(/\u00A0/g, " ")
        .replace(/&nbsp;/gi, " ")
        .trim();
      return !t;
    }
    function isLinkNoiseLine(line: string) {
      if (!line) return false;
      const t = line.trim();
      if (!t) return true;
      if (/\s/.test(t)) return false;
      if (/^(https?:\/\/|www\.)\S+$/i.test(t)) return true;
      return false;
    }
    const pNodes = Array.from(primary.querySelectorAll("p")).slice(0, 400);

    pNodes.forEach((p) => {
      const imgs = p.querySelectorAll("img[src]");
      if (imgs.length) {
        flushPending();
        imgs.forEach((img) => {
          const src =
            img.getAttribute("data-original") ||
            img.getAttribute("data-src") ||
            img.getAttribute("src");
          let alt = img.getAttribute("alt") || "";
          if (/^\?scode=/i.test(alt) || alt.length > 80) alt = "";
          pushImage(src, alt);
        });
        return;
      }
      const raw = (p.textContent || "")
        .replace(/[\u200B\u200C\u200D\uFEFF]/g, "")
        .replace(/\u00A0/g, " ")
        .replace(/&nbsp;/gi, " ");
      if (isBlankPara(raw)) {
        if (pending.length && pending[pending.length - 1] !== "") pending.push("");
        pending.push("");
        return;
      }
      const trimmed = raw.trim();
      if (isLinkNoiseLine(trimmed)) return;
      pending.push(trimmed);
    });
    flushPending();
  } else {
    const buf: string[] = [];
    for (const node of Array.from(content.childNodes)) walk(node, buf);
    flush(buf);
  }

  if (!blocks.length) {
    blocks.push({
      type: "html",
      html: '<div class="flick-empty-placeholder">이 게시물에서 추출할 수 있는 본문이 없습니다.<br>다른 게시물을 확인해 주세요.</div>',
    });
  }

  return { title, blocks };
}

export const dogdripRule: Rule = {
  id: "dogdrip",
  match: /https?:\/\/(?:www\.)?dogdrip\.net\//i,
  articleMatch: /\/(?:((dogdrip|doc)\/)?\d+)(?:$|[?#])/,
  extract: extractDogdrip,
};
