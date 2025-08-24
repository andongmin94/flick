// src/rules/fmkorea.js (#bd_capture 내부 컨테이너 순서 + 내부 이미지/텍스트 분할)
export function extractFmkorea(cfg) {
  const root = document.querySelector('#bd_capture');
  const content = root && (root.querySelector('.xe_content') || root);
  const title = (root && (root.querySelector('h1,h2,h3')?.textContent || '').trim()) || document.title || '제목 없음';
  if (!content) return { title, blocks: [] };
  const skipSel = cfg && cfg.skipClosest;
  const blocks = [];
  const seenImg = new Set();
  const seenText = new Set();

  function normSrc(src) {
    if (!src) return '';
    if (src.startsWith('//')) return location.protocol + src;
    if (src.startsWith('/')) return location.origin + src;
    return src;
  }

  function pushImage(rawSrc, alt) {
    const src = normSrc(rawSrc);
    if (!src || seenImg.has(src)) return;
    seenImg.add(src);
    blocks.push({ type: 'image', src, alt: alt || '' });
  }

  function cleanText(t) {
    return t
      .replace(/\u00A0/g, ' ')
      .replace(/\s+$/g, '')
      .replace(/^\s+/g, '')
      .replace(/[ \t]+/g, ' ')
      .replace(/\n{2,}/g, '\n')
      .trim();
  }

  function addGap() {
    const last = blocks[blocks.length - 1];
    if (!last || last.type !== 'html') return; // 시작 부분 gap은 무시
    const m = last.html.match(/(?:<br\s*\/?>)+$/i);
    const count = m ? (m[0].match(/<br/gi) || []).length : 0;
    if (count >= 2) return; // 최대 2개까지만
    last.html += '<br>';
  }

  function flushBuffer(buf) {
    const raw = buf.join('');
    const cleaned = cleanText(raw);
    if (!cleaned) {
      if (/\n+/.test(raw)) addGap();
      return;
    }
    if (seenText.has(cleaned)) return; // 동일 문단 중복 제거
    seenText.add(cleaned);
    const html = cleaned.split(/\n+/).map(line => line.trim()).filter(Boolean).join('<br>');
    if (html) blocks.push({ type: 'html', html });
  }

  function isGapElement(el) {
    if (!el || el.nodeType !== 1) return false;
    if (el.querySelector('img,pre')) return false;
    const html = el.innerHTML.replace(/\u00A0/g,' ').trim();
    if (!html) return true;
    return /^(?:<br\s*\/?>|\s)+$/i.test(html);
  }

  function walkInline(node, buf) {
    if (!node) return;
    if (node.nodeType === 1) { // ELEMENT
      const el = node;
      if (skipSel && el.closest(skipSel)) return;
      const tag = el.tagName;
      if (tag === 'P') {
        // 문단 경계로 보고 독립 처리
        flushBuffer(buf);
        buf.length = 0;
  if (isGapElement(el)) { addGap(); return; }
        const pBuf = [];
        for (const child of Array.from(el.childNodes)) walkInline(child, pBuf);
        flushBuffer(pBuf);
        return;
      }
      if (tag === 'IMG') {
        // flush text before image
        flushBuffer(buf);
        buf.length = 0;
        const src = el.getAttribute('data-original') || el.getAttribute('data-src') || el.getAttribute('src');
        pushImage(src, el.getAttribute('alt') || '');
        return;
      }
      if (tag === 'VIDEO') {
        flushBuffer(buf);
        buf.length = 0;
        // video src 우선순위: source[src] > video[src] > data-original
        let vSrc = '';
        const sourceEl = el.querySelector('source[src]');
        if (sourceEl) vSrc = sourceEl.getAttribute('src');
        if (!vSrc) vSrc = el.getAttribute('src');
        if (!vSrc) vSrc = el.getAttribute('data-original');
        if (vSrc) {
          if (vSrc.startsWith('//')) vSrc = location.protocol + vSrc;
          else if (vSrc.startsWith('/')) vSrc = location.origin + vSrc;
          blocks.push({ type: 'video', src: vSrc, poster: el.getAttribute('poster') || '' });
        }
        return;
      }
      if (tag === 'PRE') {
        flushBuffer(buf);
        buf.length = 0;
        blocks.push({ type: 'html', html: el.outerHTML });
        return;
      }
      if (tag === 'BR') {
        buf.push('\n');
        return;
      }
  if (isGapElement(el)) { flushBuffer(buf); buf.length = 0; addGap(); return; }
      // Anchor: descend (이미지/텍스트 혼재 가능)
      // Generic container: descend.
      for (const child of Array.from(el.childNodes)) {
        walkInline(child, buf);
      }
      return;
    } else if (node.nodeType === 3) { // TEXT
      const text = node.nodeValue.replace(/\s+/g, ' ');
      if (text.trim()) buf.push(text);
    }
  }

  // 1) 먼저 비디오 존재 여부 확인: 있으면 비디오만 추출 (잡다한 접근성/컨트롤 텍스트 제거)
  const videoEls = Array.from(content.querySelectorAll('video'));
  if (videoEls.length) {
    const vidBlocks = [];
    const seenVid = new Set();
    videoEls.forEach(v => {
      if (skipSel && v.closest(skipSel)) return;
      let vSrc = '';
      const sourceEl = v.querySelector('source[src]');
      if (sourceEl) vSrc = sourceEl.getAttribute('src');
      if (!vSrc) vSrc = v.getAttribute('src');
      if (!vSrc) vSrc = v.getAttribute('data-original');
      if (vSrc) {
        if (vSrc.startsWith('//')) vSrc = location.protocol + vSrc;
        else if (vSrc.startsWith('/')) vSrc = location.origin + vSrc;
        if (!seenVid.has(vSrc)) {
          seenVid.add(vSrc);
          vidBlocks.push({ type: 'video', src: vSrc, poster: v.getAttribute('poster') || '' });
        }
      }
    });
    if (vidBlocks.length) return { title, blocks: vidBlocks };
  }

  // 컨테이너: .xe_content 직속 자식 순회 (div, p, etc.)
  const containers = Array.from(content.children);
  containers.forEach(container => {
    const buf = [];
    walkInline(container, buf);
    flushBuffer(buf);
  });

  return { title, blocks };
}
