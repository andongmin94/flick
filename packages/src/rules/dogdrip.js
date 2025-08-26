// src/rules/dogdrip.js - Dogdrip 게시글 추출
// 지원 예시 URL:
//  https://www.dogdrip.net/654508279
//  https://www.dogdrip.net/dogdrip/654486667?sort_index=popular&page=1
//  https://www.dogdrip.net/doc/654052024?category=18567755&sort_index=popular&page=1

function norm(src) {
  if (!src) return "";
  if (src.startsWith("//")) return location.protocol + src;
  if (src.startsWith("/")) return location.origin + src;
  return src;
}

export function extractDogdrip() {
  // 제목 우선순위: meta og:title > 페이지 내 제목 요소 > document.title
  let title =
    document.querySelector('meta[property="og:title"]')?.getAttribute('content')?.trim() ||
    document.querySelector('.title h1, h1.title, h1.tit, h2.title, .document_title, .ed h4, .ed h3')?.textContent?.trim() ||
    document.title ||
    '제목 없음';

  // 우선 실제 문서 컨테이너 (예: <div class="document_654486667_0 rhymix_content xe_content ...">)
  let primary = document.querySelector("div.rhymix_content.xe_content[class*='document_']");
  // fallback 이전 방식 (과다 수집 가능)
  const content = primary ||
    document.querySelector('.ed') ||
    document.querySelector('.document_view') ||
    document.querySelector('.view_content') ||
    document.querySelector('.read_body') ||
    document.querySelector('.content_body') ||
    document.querySelector('article') ||
    document.querySelector('#content') ||
    document.body;

  const blocks = [];
  const seenImg = new Set();
  const seenText = new Set();

  const SKIP_SELECTOR = [
    '.comment',
    '.comments',
    '.reply',
    '#comment',
    '#comments',
    '.comment_box',
    '.comment-list',
    '.replies',
    '.board_list',
    '.list_wrap',
    '.tag_list',
    '.related_list',
    '.share',
    '.sns',
    '.ad',
    '.advertise',
    '.banner',
    '.pagination',
    '.aside',
    'script',
    'style',
    'iframe',
    'noscript'
  ].join(',');

  function pushImage(raw, alt) {
    let src = raw;
    if (!src) return;
    // data-* 속성 우선
    // (원본이 data-original / data-src 사용하지면 caller 가 이미 선택)
    src = norm(src);
    if (!src || seenImg.has(src)) return;
    // 광고/트래킹 필터 (간단)
    if (/pixel|ads|banner|doubleclick/i.test(src)) return;
    seenImg.add(src);
    blocks.push({ type: 'image', src, alt: (alt || '').trim() });
  }

  function cleanText(t) {
    return t
      .replace(/\u00A0/g, ' ')
      .replace(/[ \t]+/g, ' ')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
  }

  function flush(buf) {
    if (!buf.length) return;
    const raw = buf.join('');
    buf.length = 0;
    const cleaned = cleanText(raw);
    if (!cleaned) return;
    if (seenText.has(cleaned)) return;
    seenText.add(cleaned);
    const html = cleaned
      .replace(/\n{3,}/g, '\n\n')
      .replace(/\n\n/g, '<br><br>')
      .replace(/\n/g, '<br>');
    if (html) blocks.push({ type: 'html', html });
  }

  function walk(node, buf) {
    if (!node) return;
    if (node.nodeType === 1) {
      const el = node;
      const tag = el.tagName;
      // 스킵 (광고/댓글/리스트/메뉴 등)
      if (el.matches(SKIP_SELECTOR)) return;
      if (/^(SCRIPT|STYLE|IFRAME|TEMPLATE|NOSCRIPT)$/i.test(tag)) return;
      if (tag === 'IMG') {
        flush(buf);
        const src = el.getAttribute('data-original') || el.getAttribute('data-src') || el.getAttribute('src');
        pushImage(src, el.getAttribute('alt') || '');
        return;
      }
      if (tag === 'VIDEO') {
        flush(buf);
        let vSrc = el.querySelector('source[src]')?.getAttribute('src') || el.getAttribute('src') || el.getAttribute('data-src') || '';
        if (vSrc) blocks.push({ type: 'video', src: norm(vSrc), poster: el.getAttribute('poster') || '' });
        return;
      }
      if (tag === 'BR') {
        buf.push('\n');
        return;
      }
      const isBlock = /^(P|DIV|SECTION|ARTICLE|LI|UL|OL|H[1-6]|BLOCKQUOTE)$/i.test(tag);
      if (isBlock) {
        // 경계 개행 (중복 방지)
        if (buf.length && !/\n$/.test(buf[buf.length - 1])) buf.push('\n');
      }
      const startLen = buf.length;
      for (const child of el.childNodes) walk(child, buf);
      if (isBlock && startLen !== buf.length && !/\n$/.test(buf[buf.length - 1])) buf.push('\n');
      return;
    } else if (node.nodeType === 3) {
      const text = node.nodeValue.replace(/\s+/g, ' ');
      const trimmed = text.trim();
      if (!trimmed) return;
      // 댓글 레벨표시, 추천수 등 패턴 일부 필터 (간단)
      if (/^\[?레벨:?\d+]?$/i.test(trimmed)) return;
      buf.push(text);
    }
  }

  // 특화 파서: primary 컨테이너가 있으면 그 내부의 1차 <p> 들만 사용 (이미지 + 텍스트), 위젯/투표/광고 div 제거
  if (primary) {
    // 불필요 위젯 제거 (투표, 추천 버튼 등)
    primary.querySelectorAll('.addon_addvote, .wgtRv, .tag_list, .related_list').forEach(n => n.remove());
    // 순서 보존: 이미지/텍스트를 순회 중 즉시 flush
    const pending = [];
    function flushPending() {
      if (!pending.length) return;
      // collapse 연속 빈 줄 2개까지
      let raw = pending.join('\n')
        .replace(/\n{3,}/g,'\n\n')
        .trim();
      if (!raw) { pending.length=0; return; }
      const cleaned = cleanText(raw);
      if (!cleaned || seenText.has(cleaned)) { pending.length=0; return; }
      seenText.add(cleaned);
      const html = cleaned
        .replace(/\n{3,}/g,'\n\n')
        .replace(/\n\n/g,'<br><br>')
        .replace(/\n/g,'<br>');
      if (html) blocks.push({ type:'html', html });
      pending.length=0;
    }
    function isBlankPara(text){
      if (!text) return true;
      const t = text.replace(/[\u200B\u200C\u200D\uFEFF]/g,'').replace(/\u00A0/g,' ').replace(/&nbsp;/gi,' ').trim();
      return !t;
    }
    function isLinkNoiseLine(line){
      if(!line) return false;
      const t=line.trim();
      if(!t) return true; // effectively blank
      if(/\s/.test(t)) return false; // multi-word keep
      if(/^(https?:\/\/|www\.)\S+$/i.test(t)) return true;
      return false;
    }
    primary.childNodes.forEach(node=>{
      if(node.nodeType===1 && node.tagName==='P'){
        const p=node;
        // 이미지 우선 처리
        const imgs = p.querySelectorAll('img[src]');
        if(imgs.length){
          flushPending();
          imgs.forEach(img=>{
            const src = img.getAttribute('data-original') || img.getAttribute('data-src') || img.getAttribute('src');
            pushImage(src, img.getAttribute('alt')||'');
          });
          return;
        }
        const raw = (p.textContent||'')
          .replace(/[\u200B\u200C\u200D\uFEFF]/g,'')
          .replace(/\u00A0/g,' ')
          .replace(/&nbsp;/gi,' ');
        if(isBlankPara(raw)){
          // gap: ensure single blank marker (empty string) not duplicated
          if(pending.length && pending[pending.length-1] !== '') pending.push('');
          return;
        }
        const trimmed = raw.trim();
        if(isLinkNoiseLine(trimmed)) return; // skip pure URL line
        pending.push(trimmed);
      }
    });
    flushPending();
  } else {
    // 기존 범용 파서 (fallback)
    const buf = [];
    for (const node of content.childNodes) walk(node, buf);
    flush(buf);
  }

  // 의미있는 블록 없으면 placeholder (Naver placeholder 스타일과 통일)
  if (!blocks.length) {
    blocks.push({ type: 'html', html: '<div class="flick-empty-placeholder">이 게시물에서 추출할 수 있는 본문이 없습니다.<br>다른 게시물을 확인해 주세요.</div>' });
  }

  return { title, blocks };
}

export const dogdripRule = {
  id: 'dogdrip',
  match: /https?:\/\/(?:www\.)?dogdrip\.net\//i,
  // 경로: /숫자  또는 /dogdrip/숫자  또는 /doc/숫자
  articleMatch: /\/(?:((dogdrip|doc)\/)?\d+)(?:$|[?#])/,
  extract: extractDogdrip,
};
