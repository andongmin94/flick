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
    let r = document.querySelector('.se-main-container');
    if (r) return r;
    r = document.querySelector('#app .se-main-container');
    if (r) return r;
    // iframe (구조상 #cafe_main) 내부 탐색
    const iframe = document.querySelector('#cafe_main');
    if (iframe) {
      try {
        const idoc = iframe.contentDocument || iframe.contentWindow?.document;
        if (idoc) {
          let ir = idoc.querySelector('.se-main-container') || idoc.querySelector('#app .se-main-container');
          if (ir) return ir;
          return idoc.body;
        }
      } catch (_) {}
    }
    // 마지막 fallback
    return document.body;
  }

  const root = findRoot();

  const blocks = [];
  const seenText = new Set(); // 너무 aggressive 중복만 차단
  const seenImg = new Set();

  // 간단 JSON 모듈 데이터 (script.__se_module_data) 에서 썸네일/iframe 정보 읽기 (필요시)
  function parseModuleData(scriptEl) {
    try {
      const attr = scriptEl.getAttribute("data-module-v2") || scriptEl.getAttribute("data-module");
      if (!attr) return null;
      return JSON.parse(attr);
    } catch (_) {
      return null;
    }
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
  const components = root.querySelectorAll('.se-component');
  components.forEach((comp) => {
    if (comp.matches('.se-oembed')) {
      // iframe (예: youtube) → video 블록
      const iframe = comp.querySelector('iframe[src]');
      let src = iframe?.getAttribute('src') || '';
      // youtube shorts/embed 정규화 (이미 embed 형태면 그대로)
      if (/youtube\.com\/(shorts|watch)/.test(src)) {
        try {
          const url = new URL(src, location.href);
          if (url.searchParams.get('v')) {
            src = 'https://www.youtube.com/embed/' + url.searchParams.get('v');
          }
        } catch (_) {}
      }
      // module data 에 썸네일 존재 시 poster 사용
      let poster = '';
      const script = comp.querySelector('script.__se_module_data');
      const mod = script && parseModuleData(script);
      if (mod?.data?.thumbnailUrl) poster = norm(mod.data.thumbnailUrl);
      if (src) pushVideo(src, poster);
      return;
    }
    if (comp.matches('.se-text')) {
      // 여러 p 수집. 빈 p 는 gap
      const paragraphs = comp.querySelectorAll('p.se-text-paragraph');
      const buf = [];
      paragraphs.forEach(p => {
        const txt = p.innerText.replace(/\u200B/g, '').trim();
        if (!txt) {
          // gap → buf 에 개행 하나 추가 (최대 2연속 유지)
          if (buf.length && buf[buf.length - 1] !== '\n') buf.push('\n');
          buf.push('\n');
        } else {
          buf.push(txt + '\n');
        }
      });
      pushText(buf.join('').replace(/\n{3,}/g, '\n\n'));
      return;
    }
    // OG Link (뉴스/외부 링크 카드)
    if (comp.querySelector('.se-section-oglink') || comp.querySelector('.se-module-oglink')) {
      const thumbImg = comp.querySelector('img.se-oglink-thumbnail-resource[src]');
      const titleEl = comp.querySelector('.se-oglink-title');
      const summaryEl = comp.querySelector('.se-oglink-summary');
      const urlEl = comp.querySelector('.se-oglink-url');
      const linkEl = comp.querySelector('a.se-oglink-info, a.se-oglink-thumbnail');
      const href = linkEl?.getAttribute('href') || '';
      const titleTxt = titleEl?.textContent?.trim() || '';
      const summaryTxt = summaryEl?.textContent?.trim() || '';
      const urlTxt = urlEl?.textContent?.trim() || '';
      let inner = '';
      if (thumbImg) {
        inner += `<div class="og-thumb"><img src="${esc(norm(thumbImg.getAttribute('src')))}" alt=""></div>`;
      }
      inner += '<div class="og-meta">';
      if (titleTxt) inner += `<div class="og-title"><strong>${esc(titleTxt)}</strong></div>`;
      if (summaryTxt) inner += `<div class="og-summary">${esc(summaryTxt)}</div>`;
      if (urlTxt) inner += `<div class="og-url">${esc(urlTxt)}</div>`;
      inner += '</div>';
      let card = `<div class="flick-oglink">${inner}</div>`;
      if (href) {
        card = `<a class="flick-oglink-wrap" href="${esc(href)}" target="_blank" rel="noopener noreferrer">${card}</a>`;
      }
      blocks.push({ type: 'html', html: card });
      return;
    }
    // 이미지 컴포넌트 (본문 에디터가 se-image 로 제공)
    if (comp.matches('.se-image')) {
      const imgs = comp.querySelectorAll('img[src]');
      imgs.forEach(img => pushImage(img.getAttribute('src'), img.getAttribute('alt') || ''));
      return;
    }
    // 스티커 컴포넌트 (se-section-sticker / se-module-sticker)
    if (comp.querySelector('.se-sticker-image')) {
      const stickers = comp.querySelectorAll('img.se-sticker-image[src]');
      stickers.forEach(img => {
        pushImage(img.getAttribute('src'), img.getAttribute('alt') || 'sticker');
      });
      return;
    }
  });

  // fallback 1: se-component 외부 이미지
  root.querySelectorAll('img[src]').forEach(img => {
    if (img.closest('.se-component')) return;
    pushImage(img.getAttribute('src'), img.getAttribute('alt') || '');
  });

  // fallback 2: 컴포넌트가 거의 없거나 blocks 비어있으면 광역 텍스트 스캔
  if (blocks.length === 0) {
    // script/style/nav 제거
    const clone = root.cloneNode(true);
    clone.querySelectorAll('script,style,noscript').forEach(n => n.remove());
    // se 구조라면 에디터 툴바/불필요 패널 제거(있을 경우)
    clone.querySelectorAll('[class*="toolbar"], .se-comment-box, .se-tooltip').forEach(n => n.remove());
    const textParts = [];
    function walk(node) {
      if (node.nodeType === 3) {
        const v = node.nodeValue;
        if (v && /\S/.test(v)) textParts.push(v);
        return;
      }
      if (node.nodeType !== 1) return;
      const el = node;
      if (el.tagName === 'IMG') {
        pushImage(el.getAttribute('src'), el.getAttribute('alt') || '');
      }
      if (/^(BR|P|DIV|SECTION|H[1-6])$/.test(el.tagName)) {
        // 블록 경계로 개행 삽입
        textParts.push('\n');
      }
      el.childNodes.forEach(walk);
    }
    walk(clone);
    const wide = textParts.join('')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
    if (wide) pushText(wide);
  }

  // 최종: 그래도 아무 것도 없으면 body 텍스트 한번 더
  if (blocks.length === 0) {
    const bodyTxt = (document.body.innerText || '').trim();
    if (bodyTxt) pushText(bodyTxt.split(/\n{3,}/).slice(0, 200).join('\n\n'));
  }

  return { title, blocks };
}

export const navercafeRule = {
  id: 'navercafe',
  match: /https?:\/\/cafe\.naver\.com\//i,
  // /cafes/<숫자>/articles/ 경로에 도달하면 지원 (게시글 번호 뒤에 붙어있을 수도 있음)
  articleMatch: /\/cafes\/\d+\/articles\//i,
  extract: extractNavercafe,
};
