import type { ExtractResult, Rule } from "../types/global";

function norm(src: string | null) {
  if (!src) return "";
  if (src.startsWith("//")) return location.protocol + src;
  if (src.startsWith("/")) return location.origin + src;
  return src;
}

export function extractNavercafe(): ExtractResult {
  let rawTitle = document.title || "제목 없음";
  let title = rawTitle.replace(/^[^:]+:\s*/, "").trim();
  if (!title) title = rawTitle.trim() || "제목 없음";

  function findRoot(): Element {
    let r = document.querySelector(".se-main-container") as Element | null;
    if (r) return r;
    r = document.querySelector("#app .se-main-container") as Element | null;
    if (r) return r;
    const iframe = document.querySelector(
      "#cafe_main"
    ) as HTMLIFrameElement | null;
    if (iframe) {
      try {
        const idoc = iframe.contentDocument || iframe.contentWindow?.document;
        if (idoc) {
          let ir =
            (idoc.querySelector(".se-main-container") as Element | null) ||
            (idoc.querySelector("#app .se-main-container") as Element | null);
          if (ir) return ir;
          return idoc.body as unknown as Element;
        }
      } catch (_) {}
    }
    return document.body as unknown as Element;
  }

  const root = findRoot();

  (function pickVisibleTitle() {
    let h3 = document.querySelector(
      ".article_header h3.title_text, h3.title_text"
    ) as HTMLElement | null;
    if (!h3) {
      const iframe = document.querySelector(
        "#cafe_main"
      ) as HTMLIFrameElement | null;
      if (iframe) {
        try {
          const idoc = iframe.contentDocument || iframe.contentWindow?.document;
          if (idoc) {
            h3 = idoc.querySelector(
              ".article_header h3.title_text, h3.title_text"
            ) as HTMLElement | null;
          }
        } catch (_) {}
      }
    }
    if (h3) {
      const t = (h3.textContent || "").replace(/\s+/g, " ").trim();
      if (t) title = t;
    }
  })();

  const blocks: ExtractResult["blocks"] = [];
  const seenText = new Set<string>();
  const seenImg = new Set<string>();

  function isMenuNoise(text: string) {
    if (!text) return true;
    const raw = text.replace(/\s+/g, " ").trim();
    if (!raw) return true;
    if (raw.length < 60) return true;
    const lines = text
      .split(/\n+/)
      .map((l) => l.trim())
      .filter(Boolean);
    if (!lines.length) return true;
    const shortLines = lines.filter((l) => l.length <= 8).length;
    if (lines.length >= 5 && shortLines / lines.length > 0.6) return true;
    const noiseWords = [
      "카페",
      "글쓰기",
      "메뉴",
      "로그인",
      "회원",
      "가입",
      "검색",
      "전체글",
      "출석",
    ];
    const hit = noiseWords.filter((w) => raw.includes(w)).length;
    const punctuation = (raw.match(/[\.\?\!]/g) || []).length;
    if (hit >= 3 && punctuation === 0) return true;
    return false;
  }

  function isLinkNoise(line: string) {
    if (!line) return false;
    const t = line.trim();
    if (!t) return false;
    if (/\s/.test(t)) return false;
    if (/^(https?:\/\/|www\.)\S+$/i.test(t)) return true;
    return false;
  }

  function pushText(raw: string) {
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

  function pushImage(src: string | null, alt?: string) {
    const u = norm(src);
    if (!u || seenImg.has(u)) return;
    seenImg.add(u);
    blocks.push({ type: "image", src: u, alt: (alt || "").trim() });
  }

  function pushVideo(src: string | null, poster?: string | null) {
    const u = norm(src);
    if (!u) return;
    blocks.push({ type: "video", src: u, poster: poster || "" });
  }

  function cleanText(t: string) {
    return t
      .replace(/\u200B/g, "")
      .replace(/\u00A0/g, " ")
      .replace(/\r/g, "")
      .replace(/[ \t]+/g, " ")
      .replace(/\n{4,}/g, "\n\n")
      .trim();
  }

  function esc(s = "") {
    return s
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  const components = root.querySelectorAll(".se-component");
  components.forEach((comp) => {
    const el = comp as HTMLElement;
    if (el.matches(".se-oembed")) {
      return;
    }
    if (el.matches(".se-text")) {
      const paragraphs = el.querySelectorAll("p.se-text-paragraph");
      const buf: string[] = [];
      paragraphs.forEach((p) => {
        const txt = (p as HTMLElement).innerText.replace(/\u200B/g, "").trim();
        if (!txt) {
          if (buf.length && buf[buf.length - 1] !== "\n") buf.push("\n");
          buf.push("\n");
        } else if (!isLinkNoise(txt)) {
          buf.push(txt + "\n");
        }
      });
      pushText(buf.join("").replace(/\n{3,}/g, "\n\n"));
      return;
    }
    if (
      el.querySelector(".se-section-oglink") ||
      el.querySelector(".se-module-oglink")
    ) {
      const thumbImg = el.querySelector(
        "img.se-oglink-thumbnail-resource[src]"
      ) as HTMLImageElement | null;
      const titleEl = el.querySelector(
        ".se-oglink-title"
      ) as HTMLElement | null;
      const summaryEl = el.querySelector(
        ".se-oglink-summary"
      ) as HTMLElement | null;
      const urlEl = el.querySelector(".se-oglink-url") as HTMLElement | null;
      const linkEl = el.querySelector(
        "a.se-oglink-info, a.se-oglink-thumbnail"
      ) as HTMLAnchorElement | null;
      const href = linkEl?.getAttribute("href") || "";
      const titleTxt = titleEl?.textContent?.trim() || "";
      const summaryTxt = summaryEl?.textContent?.trim() || "";
      const urlTxt = urlEl?.textContent?.trim() || "";
      let inner = "";
      if (thumbImg) {
        inner += `<div class="og-thumb"><img src="${esc(
          norm(thumbImg.getAttribute("src"))
        )}" alt=""></div>`;
      }
      inner += '<div class="og-meta">';
      if (titleTxt)
        inner += `<div class="og-title"><strong>${esc(
          titleTxt
        )}</strong></div>`;
      if (summaryTxt)
        inner += `<div class="og-summary">${esc(summaryTxt)}</div>`;
      if (urlTxt) inner += `<div class="og-url">${esc(urlTxt)}</div>`;
      inner += "</div>";
      let card = `<div class="flick-oglink">${inner}</div>`;
      if (href) {
        card = `<a class="flick-oglink-wrap" href="${esc(
          href
        )}" target="_blank" rel="noopener noreferrer">${card}</a>`;
      }
      blocks.push({ type: "html", html: card });
      return;
    }
    if (el.matches(".se-image")) {
      const imgs = el.querySelectorAll("img[src]");
      imgs.forEach((img) =>
        pushImage(img.getAttribute("src"), img.getAttribute("alt") || "")
      );
      return;
    }
    if (el.querySelector(".se-sticker-image")) {
      const stickers = el.querySelectorAll("img.se-sticker-image[src]");
      stickers.forEach((img) => {
        pushImage(
          img.getAttribute("src"),
          img.getAttribute("alt") || "sticker"
        );
      });
      return;
    }
  });

  root.querySelectorAll("img[src]").forEach((img) => {
    if ((img as HTMLElement).closest(".se-component")) return;
    pushImage(img.getAttribute("src"), img.getAttribute("alt") || "");
  });

  if (blocks.length === 0) {
    const clone = root.cloneNode(true) as Element;
    clone.querySelectorAll("script,style,noscript").forEach((n) => n.remove());
    clone
      .querySelectorAll('[class*="toolbar"], .se-comment-box, .se-tooltip')
      .forEach((n) => n.remove());
    const textParts: string[] = [];
    function walk(node: Node) {
      if (node.nodeType === 3) {
        const v = node.nodeValue;
        if (v && /\S/.test(v)) textParts.push(v as string);
        return;
      }
      if (node.nodeType !== 1) return;
      const el = node as HTMLElement;
      if (el.tagName === "IMG") {
        pushImage(el.getAttribute("src"), el.getAttribute("alt") || "");
      }
      if (/^(BR|P|DIV|SECTION|H[1-6])$/.test(el.tagName)) {
        textParts.push("\n");
      }
      el.childNodes.forEach(walk);
    }
    walk(clone);
    const wide = textParts
      .join("")
      .replace(/\n{3,}/g, "\n\n")
      .trim();
    if (wide) {
      const filtered = wide
        .split(/\n+/)
        .filter((l) => !isLinkNoise(l))
        .join("\n")
        .replace(/\n{3,}/g, "\n\n")
        .trim();
      if (filtered && !isMenuNoise(filtered)) {
        pushText(filtered);
      }
    }
  }

  if (blocks.length === 0) {
    blocks.push({
      type: "html",
      html: '<div class="flick-empty-placeholder">이 게시물에서 추출할 수 있는 본문이 없습니다.<br>다른 게시물을 확인해 주세요.</div>',
    });
  }

  return { title, blocks };
}

export const navercafeRule: Rule = {
  id: "navercafe",
  match: /https?:\/\/cafe\.naver\.com\//i,
  articleMatch: /\/cafes\/\d+\/articles\//i,
  extract: extractNavercafe,
};
