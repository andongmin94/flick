// src/rules/navercafe.js - Naver Cafe 새 에디터(se-) 구조 추출
// 지원 URL 패턴 (예시):
// https://cafe.naver.com/f-e/cafes/27842958/articles/20742167?boardtype=L&menuid=626
// 요구: https://cafe.naver.com/<카페ID>/cafes/<숫자>/articles/(<게시글숫자>)

function norm(src) {
  if (!src) return "";
  if (src.startsWith("//")) return location.protocol + src;
  if (src.startsWith("/")) return location.origin + src;
  return src;
}

export function extractNavercafe() {
  // 제목: <title> 패턴에서 앞부분 카페명 제거 시도
  let rawTitle = document.title || "제목 없음";
  let title = rawTitle.replace(/^[^:]+:\s*/, "").trim();
  if (!title) title = rawTitle.trim() || "제목 없음";

  // 루트 탐색 (직접 + iframe)
  function findRoot() {
    let r = document.querySelector(".se-main-container");
    if (r) return r;
    r = document.querySelector("#app .se-main-container");
    if (r) return r;
    // iframe (구조상 #cafe_main) 내부 탐색
    const iframe = document.querySelector("#cafe_main");
    if (iframe) {
      try {
        const idoc = iframe.contentDocument || iframe.contentWindow?.document;
        if (idoc) {
          let ir =
            idoc.querySelector(".se-main-container") ||
            idoc.querySelector("#app .se-main-container");
          if (ir) return ir;
          return idoc.body;
        }
      } catch (_) {}
    }
    // 마지막 fallback
    return document.body;
  }

  const root = findRoot();

  // 화면에 표시되는 실제 게시글 제목(h3.title_text)이 있으면 그것을 우선 사용
  (function pickVisibleTitle() {
    let h3 = document.querySelector(
      ".article_header h3.title_text, h3.title_text"
    );
    if (!h3) {
      const iframe = document.querySelector("#cafe_main");
      if (iframe) {
        try {
          const idoc = iframe.contentDocument || iframe.contentWindow?.document;
          if (idoc) {
            h3 = idoc.querySelector(
              ".article_header h3.title_text, h3.title_text"
            );
          }
        } catch (_) {}
      }
    }
    if (h3) {
      const t = h3.textContent.replace(/\s+/g, " ").trim();
      if (t) title = t;
    }
  })();

  const blocks = [];
  const seenText = new Set(); // 너무 aggressive 중복만 차단
  const seenImg = new Set();

  // 의미있는 본문이 없는 경우 메뉴/잡다한 UI 텍스트만 모인 상황인지 판단
  function isMenuNoise(text) {
    if (!text) return true;
    const raw = text.replace(/\s+/g, " ").trim();
    if (!raw) return true;
    // 너무 짧으면 (ex: 메뉴 모음)
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
    // 노이즈 키워드가 많고 구두점 적으면 노이즈로 간주
    const punctuation = (raw.match(/[\.\?\!]/g) || []).length;
    if (hit >= 3 && punctuation === 0) return true;
    return false;
  }

  // 링크 노이즈 여부 판정 (순수 URL 이거나 유튜브/짧은 공유 링크 등)
  function isLinkNoise(line) {
    if (!line) return false;
    const t = line.trim();
    if (!t) return false;
    // 공백 포함이면 (단일 토큰이 아닐 때) 대부분 유지
    if (/\s/.test(t)) return false;
    if (/^(https?:\/\/|www\.)\S+$/i.test(t)) return true;
    return false;
  }

  function pushText(raw) {
    const cleaned = cleanText(raw);
    if (!cleaned) return;
    if (seenText.has(cleaned)) return;
    seenText.add(cleaned);
    // 연속 개행 2개 제한 → <br><br>
    const html = cleaned
      .replace(/\n{3,}/g, "\n\n")
      .replace(/\n\n/g, "<br><br>")
      .replace(/\n/g, "<br>");
    if (html) blocks.push({ type: "html", html });
  }

  function pushImage(src, alt) {
    const u = norm(src);
    if (!u || seenImg.has(u)) return;
    seenImg.add(u);
    blocks.push({ type: "image", src: u, alt: (alt || "").trim() });
  }

  function pushVideo(src, poster) {
    const u = norm(src);
    if (!u) return;
    blocks.push({ type: "video", src: u, poster: poster || "" });
  }

  function cleanText(t) {
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

  // 컴포넌트 단위 순회 (있다면 우선 사용)
  const components = root.querySelectorAll(".se-component");
  components.forEach((comp) => {
    if (comp.matches(".se-oembed")) {
      // 요청: 모든 영상(oembed) 스킵 (렌더하지 않음)
      return;
    }
    if (comp.matches(".se-text")) {
      // 여러 p 수집. 빈 p 는 gap
      const paragraphs = comp.querySelectorAll("p.se-text-paragraph");
      const buf = [];
      paragraphs.forEach((p) => {
        const txt = p.innerText.replace(/\u200B/g, "").trim();
        if (!txt) {
          // gap → buf 에 개행 하나 추가 (최대 2연속 유지)
          if (buf.length && buf[buf.length - 1] !== "\n") buf.push("\n");
          buf.push("\n");
        } else if (!isLinkNoise(txt)) {
          buf.push(txt + "\n");
        }
      });
      pushText(buf.join("").replace(/\n{3,}/g, "\n\n"));
      return;
    }
    // OG Link (뉴스/외부 링크 카드)
    if (
      comp.querySelector(".se-section-oglink") ||
      comp.querySelector(".se-module-oglink")
    ) {
      const thumbImg = comp.querySelector(
        "img.se-oglink-thumbnail-resource[src]"
      );
      const titleEl = comp.querySelector(".se-oglink-title");
      const summaryEl = comp.querySelector(".se-oglink-summary");
      const urlEl = comp.querySelector(".se-oglink-url");
      const linkEl = comp.querySelector(
        "a.se-oglink-info, a.se-oglink-thumbnail"
      );
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
    // 이미지 컴포넌트 (본문 에디터가 se-image 로 제공)
    if (comp.matches(".se-image")) {
      const imgs = comp.querySelectorAll("img[src]");
      imgs.forEach((img) =>
        pushImage(img.getAttribute("src"), img.getAttribute("alt") || "")
      );
      return;
    }
    // 스티커 컴포넌트 (se-section-sticker / se-module-sticker)
    if (comp.querySelector(".se-sticker-image")) {
      const stickers = comp.querySelectorAll("img.se-sticker-image[src]");
      stickers.forEach((img) => {
        pushImage(
          img.getAttribute("src"),
          img.getAttribute("alt") || "sticker"
        );
      });
      return;
    }
  });

  // fallback 1: se-component 외부 이미지
  root.querySelectorAll("img[src]").forEach((img) => {
    if (img.closest(".se-component")) return;
    pushImage(img.getAttribute("src"), img.getAttribute("alt") || "");
  });

  // fallback 2: 컴포넌트가 거의 없거나 blocks 비어있으면 광역 텍스트 스캔
  if (blocks.length === 0) {
    // script/style/nav 제거
    const clone = root.cloneNode(true);
    clone.querySelectorAll("script,style,noscript").forEach((n) => n.remove());
    // se 구조라면 에디터 툴바/불필요 패널 제거(있을 경우)
    clone
      .querySelectorAll('[class*="toolbar"], .se-comment-box, .se-tooltip')
      .forEach((n) => n.remove());
    const textParts = [];
    function walk(node) {
      if (node.nodeType === 3) {
        const v = node.nodeValue;
        if (v && /\S/.test(v)) textParts.push(v);
        return;
      }
      if (node.nodeType !== 1) return;
      const el = node;
      if (el.tagName === "IMG") {
        pushImage(el.getAttribute("src"), el.getAttribute("alt") || "");
      }
      if (/^(BR|P|DIV|SECTION|H[1-6])$/.test(el.tagName)) {
        // 블록 경계로 개행 삽입
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

  // 최종: 의미있는 콘텐츠 없으면 placeholder (또는 완전 빈 결과를 원하면 아래 push 주석 처리)
  if (blocks.length === 0) {
    blocks.push({
      type: "html",
      html: '<div class="flick-empty-placeholder">이 게시물에서 추출할 수 있는 본문이 없습니다.<br>다른 게시물을 확인해 주세요.</div>',
    });
  }

  return { title, blocks };
}

export const navercafeRule = {
  id: "navercafe",
  match: /https?:\/\/cafe\.naver\.com\//i,
  // /cafes/<숫자>/articles/ 경로에 도달하면 지원 (게시글 번호 뒤에 붙어있을 수도 있음)
  articleMatch: /\/cafes\/\d+\/articles\//i,
  extract: extractNavercafe,
};
