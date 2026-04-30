import type { ExtractResult, Rule } from "../types/global";
import {
  appendTextGap,
  cleanText,
  normUrl,
  pushUniqueImage,
  pushUniqueText,
  pushVideo,
} from "./utils";

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

  function pushImage(rawSrc: string | null, alt?: string) {
    pushUniqueImage(blocks, seenImg, rawSrc, alt || "");
  }

  function addGap() {
    appendTextGap(blocks);
  }

  function flushBuffer(buf: string[]) {
    const raw = buf.join("");
    const cleaned = cleanText(raw);
    if (!cleaned) {
      if (/\n+/.test(raw)) addGap();
      return;
    }
    pushUniqueText(blocks, seenText, cleaned);
  }

  function isGapElement(el: Element | null) {
    if (!el || el.nodeType !== 1) return false;
    if ((el as Element).querySelector("img,pre")) return false;
    const html = (el as HTMLElement).innerHTML.replace(/\u00A0/g, " ").trim();
    if (!html) return true;
    return /^(?:<br\s*\/?>|\s)+$/i.test(html);
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
        pushVideo(blocks, vSrc, el.getAttribute("poster") || "");
        return;
      }
      if (tag === "PRE") {
        flushBuffer(buf);
        buf.length = 0;
        pushUniqueText(blocks, seenText, el.textContent || "");
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
  const seenVideoSrc = new Set<string>();
  const orderedVideos: {
    el: HTMLVideoElement;
    src: string;
    poster: string;
  }[] = [];
  videoEls.forEach((v) => {
    const vSrc = normUrl(
      (
        v.querySelector("source[src]") as HTMLSourceElement | null
      )?.getAttribute("src") ||
        v.getAttribute("src") ||
        v.getAttribute("data-original") ||
        ""
    );
    if (vSrc && !seenVideoSrc.has(vSrc)) {
      seenVideoSrc.add(vSrc);
      orderedVideos.push({
        el: v,
        src: vSrc,
        poster: v.getAttribute("poster") || "",
      });
    }
  });
  if (orderedVideos.length) {
    orderedVideos.forEach((obj) => {
      pushVideo(blocks, obj.src, obj.poster);
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
      pushUniqueText(blocks, seenText, cleanedTrailing);
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
      const src = normUrl(
        v.getAttribute("src") ||
          (
            v.querySelector("source[src]") as HTMLSourceElement | null
          )?.getAttribute("src") ||
          v.getAttribute("data-original") ||
          ""
      );
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
  match: /https?:\/\/(?:[^/?#]+\.)?fmkorea\.com(?::\d+)?(?:[/?#]|$)/i,
  articleMatch: /(\/best(?:\/|$))|\/(\d+)(?:$|[?#])|document_srl=\d+/i,
  skipClosest: ".document_address",
  extract: extractFmkorea,
  prePrepare: preFmkoreaPrepare,
  postShortsMounted: postFmkoreaShortsMounted,
};
