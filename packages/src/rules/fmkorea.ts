import type { ExtractResult, Rule } from "../types/global";

// src/rules/fmkorea.ts
export function extractFmkorea(cfg?: Rule): ExtractResult {
  const root = document.querySelector("#bd_capture");
  const content = (root &&
    ((root.querySelector(".xe_content") as Element) || root)) as Element | null;
  const title =
    (root &&
      (
        (root.querySelector("h1,h2,h3") as HTMLElement | null)?.textContent ||
        ""
      ).trim()) ||
    document.title ||
    "제목 없음";
  if (!content) return { title, blocks: [] };
  const skipSel = cfg && cfg.skipClosest;
  const blocks: ExtractResult["blocks"] = [];
  const seenImg = new Set<string>();
  const seenText = new Set<string>();

  function normSrc(src: string | null): string {
    if (!src) return "";
    if (src.startsWith("//")) return location.protocol + src;
    if (src.startsWith("/")) return location.origin + src;
    return src;
  }

  function pushImage(rawSrc: string | null, alt?: string) {
    const src = normSrc(rawSrc);
    if (!src || seenImg.has(src)) return;
    seenImg.add(src);
    blocks.push({ type: "image", src, alt: alt || "" });
  }

  function cleanText(t: string) {
    return t
      .replace(/\u00A0/g, " ")
      .replace(/\s+$/g, "")
      .replace(/^\s+/g, "")
      .replace(/[ \t]+/g, " ")
      .replace(/\n{2,}/g, "\n")
      .trim();
  }

  function addGap() {
    const last = blocks[blocks.length - 1];
    if (!last || last.type !== "html") return;
    const m = last.html.match(/(?:<br\s*\/? >)+$/i);
    const count = m ? (m[0].match(/<br/gi) || []).length : 0;
    if (count >= 2) return;
    last.html += "<br>";
  }

  function flushBuffer(buf: string[]) {
    const raw = buf.join("");
    const cleaned = cleanText(raw);
    if (!cleaned) {
      if (/\n+/.test(raw)) addGap();
      return;
    }
    if (seenText.has(cleaned)) return;
    seenText.add(cleaned);
    const html = cleaned
      .split(/\n+/)
      .map((line) => line.trim())
      .filter(Boolean)
      .join("<br>");
    if (html) blocks.push({ type: "html", html });
  }

  function isGapElement(el: Element | null) {
    if (!el || el.nodeType !== 1) return false;
    if ((el as Element).querySelector("img,pre")) return false;
    const html = (el as HTMLElement).innerHTML.replace(/\u00A0/g, " ").trim();
    if (!html) return true;
    return /^(?:<br\s*\/? >|\s)+$/i.test(html);
  }

  function walkInline(node: Node | null, buf: string[]) {
    if (!node) return;
    if (node.nodeType === 1) {
      const el = node as HTMLElement;
      if (skipSel && el.closest(skipSel)) return;
      const tag = el.tagName;
      if (tag === "P") {
        flushBuffer(buf);
        buf.length = 0;
        if (isGapElement(el)) {
          addGap();
          return;
        }
        const pBuf: string[] = [];
        for (const child of Array.from(el.childNodes)) walkInline(child, pBuf);
        flushBuffer(pBuf);
        return;
      }
      if (tag === "IMG") {
        flushBuffer(buf);
        buf.length = 0;
        const src =
          el.getAttribute("data-original") ||
          el.getAttribute("data-src") ||
          el.getAttribute("src");
        pushImage(src, el.getAttribute("alt") || "");
        return;
      }
      if (tag === "VIDEO") {
        flushBuffer(buf);
        buf.length = 0;
        let vSrc = "";
        const sourceEl = el.querySelector(
          "source[src]"
        ) as HTMLSourceElement | null;
        if (sourceEl) vSrc = sourceEl.getAttribute("src") || "";
        if (!vSrc) vSrc = el.getAttribute("src") || "";
        if (!vSrc) vSrc = el.getAttribute("data-original") || "";
        if (vSrc) {
          if (vSrc.startsWith("//")) vSrc = location.protocol + vSrc;
          else if (vSrc.startsWith("/")) vSrc = location.origin + vSrc;
          blocks.push({
            type: "video",
            src: vSrc,
            poster: el.getAttribute("poster") || "",
          });
        }
        return;
      }
      if (tag === "PRE") {
        flushBuffer(buf);
        buf.length = 0;
        blocks.push({ type: "html", html: el.outerHTML });
        return;
      }
      if (tag === "BR") {
        buf.push("\n");
        return;
      }
      if (isGapElement(el)) {
        flushBuffer(buf);
        buf.length = 0;
        addGap();
        return;
      }
      for (const child of Array.from(el.childNodes)) {
        walkInline(child, buf);
      }
      return;
    } else if (node.nodeType === 3) {
      const text = (node.nodeValue || "").replace(/\s+/g, " ");
      if (text.trim()) buf.push(text);
    }
  }

  const videoEls = Array.from(content.querySelectorAll("video"));
  if (videoEls.length) {
    const seenVideoSrc = new Set<string>();
    const orderedVideos: {
      el: HTMLVideoElement;
      src: string;
      poster: string;
    }[] = [];
    videoEls.forEach((v) => {
      let vSrc =
        (
          v.querySelector("source[src]") as HTMLSourceElement | null
        )?.getAttribute("src") ||
        v.getAttribute("src") ||
        v.getAttribute("data-original") ||
        "";
      if (vSrc) {
        if (vSrc.startsWith("//")) vSrc = location.protocol + vSrc;
        else if (vSrc.startsWith("/")) vSrc = location.origin + vSrc;
        if (!seenVideoSrc.has(vSrc)) {
          seenVideoSrc.add(vSrc);
          orderedVideos.push({
            el: v,
            src: vSrc,
            poster: v.getAttribute("poster") || "",
          });
        }
      }
    });
    orderedVideos.forEach((obj) => {
      blocks.push({ type: "video", src: obj.src, poster: obj.poster });
    });

    const lastVideo = orderedVideos[orderedVideos.length - 1].el;
    const forbiddenClassRe =
      /(mejs-|mejs__|control|player|volume|progress|time|screen|sr-only|blind|tooltip|aria)/i;
    const textBuf: string[] = [];

    function isNoiseText(t: string) {
      if (!t) return true;
      const s = t.trim();
      if (!s) return true;
      if (s === "/") return true;
      if (/^\/?\s*\d+(?:\.\d+)?x$/i.test(s)) return true;
      if (/^(?:\d{1,2}:)?\d{1,2}:\d{2}$/.test(s)) return true;
      if (
        /^(?:\d{1,2}:)?\d{1,2}:\d{2}\s*\/\s*(?:\d{1,2}:)?\d{1,2}:\d{2}$/.test(s)
      )
        return true;
      if (/\/\s*\d+(?:\.\d+)?x$/i.test(s)) return true;
      if (/^Video Player$/i.test(s)) return true;
      return false;
    }

    function isForbiddenElement(el: Element | null) {
      if (!el || el.nodeType !== 1) return false;
      if (skipSel && (el as HTMLElement).closest(skipSel)) return true;
      const cls = (el as HTMLElement).className || "";
      if (typeof cls === "string" && forbiddenClassRe.test(cls)) return true;
      const tag = el.tagName;
      if (/^(SCRIPT|STYLE|VIDEO|SOURCE|AUDIO|IFRAME)$/i.test(tag)) return true;
      return false;
    }

    function nextNode(node: Node | null, boundary: Element) {
      if (!node) return null;
      if ((node as Element).firstChild)
        return (node as Element).firstChild as Node;
      while (node) {
        if (node === boundary) return null;
        if ((node as Element).nextSibling)
          return (node as Element).nextSibling as Node;
        node = (node as Element).parentNode as Node;
      }
      return null;
    }

    let cur: Node | null = nextNode(lastVideo, content);
    while (cur) {
      if (cur.nodeType === 1) {
        const el = cur as Element;
        if (!isForbiddenElement(el)) {
          if (
            /^(P|DIV|BR|SECTION|ARTICLE|LI|UL|OL|H1|H2|H3|H4|H5|H6)$/i.test(
              el.tagName
            )
          ) {
            if (el.tagName === "BR") textBuf.push("\n");
          }
        }
      } else if (cur.nodeType === 3) {
        const parent = (cur.parentNode as Element) || null;
        if (!isForbiddenElement(parent)) {
          const t = (cur.nodeValue || "").replace(/\s+/g, " ");
          if (t.trim() && !isNoiseText(t)) textBuf.push(t);
        }
      }
      cur = nextNode(cur, content);
    }

    const rawTrailing = textBuf.join("").replace(/\n{3,}/g, "\n\n");
    const filteredLines = rawTrailing
      .split(/\n+/)
      .map((l) => l.trim())
      .filter((l) => l && !isNoiseText(l));
    const cleanedTrailing = cleanText(filteredLines.join("\n"));
    if (cleanedTrailing) {
      if (!seenText.has(cleanedTrailing)) {
        seenText.add(cleanedTrailing);
        const html = cleanedTrailing
          .split(/\n+/)
          .map((l) => l.trim())
          .filter(Boolean)
          .join("<br>");
        if (html) blocks.push({ type: "html", html });
      }
    }
    return { title, blocks };
  }

  const rootTextBuf: string[] = [];
  for (const node of Array.from(content.childNodes)) {
    if (node.nodeType === 3) {
      const t = (node.nodeValue || "").replace(/\s+/g, " ");
      if (t.trim()) rootTextBuf.push(t);
    }
  }
  flushBuffer(rootTextBuf);

  const containers = Array.from(content.children);
  containers.forEach((container) => {
    const buf: string[] = [];
    walkInline(container, buf);
    flushBuffer(buf);
  });

  return { title, blocks };
}

let __fmkVideoVolumes: Record<string, number> = {};
export function preFmkoreaPrepare() {
  __fmkVideoVolumes = {};
  document.querySelectorAll("#bd_capture video").forEach((v) => {
    try {
      const src =
        v.getAttribute("src") ||
        (
          v.querySelector("source[src]") as HTMLSourceElement | null
        )?.getAttribute("src") ||
        v.getAttribute("data-original") ||
        "";
      if (src && !(src in __fmkVideoVolumes))
        __fmkVideoVolumes[src] = (v as HTMLVideoElement).volume;
      (v as HTMLVideoElement).pause();
      v.removeAttribute("autoplay");
    } catch (_) {}
  });
}
export function postFmkoreaShortsMounted() {
  const vids = document.querySelectorAll(".flick-wrap-injected video");
  vids.forEach((v) => {
    try {
      const vv = v as HTMLVideoElement;
      vv.autoplay = true;
      vv.muted = false;
      const src = vv.getAttribute("src");
      if (src && __fmkVideoVolumes[src] != null)
        vv.volume = __fmkVideoVolumes[src];
      else if (!src && Object.keys(__fmkVideoVolumes).length === 1) {
        vv.volume = Object.values(__fmkVideoVolumes)[0] as number;
      }
      vv.play().catch(() => {});
    } catch (_) {}
  });
}

export const fmkoreaRule: Rule = {
  id: "fmkorea",
  match: /https?:\/\/(www\.)?fmkorea\.com\//i,
  articleMatch: /(\/best\/)|\/(\d+)(?:$|[?#])|document_srl=\d+/i,
  skipClosest: ".document_address",
  extract: extractFmkorea,
  prePrepare: preFmkoreaPrepare,
  postShortsMounted: postFmkoreaShortsMounted,
};
