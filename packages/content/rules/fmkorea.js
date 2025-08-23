/**
 * rules/fmkorea.js
 * FMKorea 전용 추출 규칙
 */
(function(ns){
  function sanitizeInlineColors(root){
    // 강제 컬러 고정: inline style color 제거 (흰 글씨 문제 대응)
    root.querySelectorAll('[style]')?.forEach(el => {
      if(/color\s*:/i.test(el.getAttribute('style'))) {
        // color 속성만 제거
        const style = el.getAttribute('style')
          .split(';')
          .filter(s => s && !/^\s*color\s*:/i.test(s))
          .join(';');
        if(style) el.setAttribute('style', style); else el.removeAttribute('style');
      }
    });
  }
  function extract(cfg){
    const article = document.querySelector('article');
    const title = (article && (article.querySelector('h1,h2,h3')?.textContent || '').trim()) || (document.title || '제목 없음');
    if(!article) return { title, blocks: [] };
    const skipSel = cfg && cfg.skipClosest;
    const blocks = [];
    const addedImg = new Set();
    article.querySelectorAll('img').forEach(img => {
      if (skipSel && img.closest(skipSel)) return;
      const src = img.getAttribute('data-src') || img.getAttribute('data-original') || img.src;
      if(!src || addedImg.has(src)) return; addedImg.add(src);
      blocks.push({ type:'image', src, alt: img.alt || '' });
    });
    const seenText = new Set();
    const textSelectors = 'p, h1, h2, h3, h4, h5, h6, li, blockquote, pre';
    article.querySelectorAll(textSelectors).forEach(el => {
      if (skipSel && el.closest(skipSel)) return;
      const txt = (el.textContent||'').replace(/\s+/g,' ').trim();
      if(!txt) return;
      if(txt.length===1 && /[\p{P}\p{S}]/u.test(txt)) return;
      if(seenText.has(txt)) return; seenText.add(txt);
      if(el.tagName==='PRE') blocks.push({ type:'html', html: el.outerHTML });
      else blocks.push({ type:'html', html: el.innerHTML.trim() });
    });
    // 텍스트 블록이 하나도 없으면 fallback (innerText 기반)
    const hasText = blocks.some(b => b.type !== 'image' || (b.type==='html' && /[가-힣A-Za-z0-9]/.test(b.html)));
    if(!hasText){
      const raw = article.innerText.split(/\n+/).map(l=>l.trim()).filter(l=>l.length>1);
      raw.forEach(line => {
        if(seenText.has(line)) return; seenText.add(line);
        blocks.push({ type:'html', html: line });
      });
    }
    // 디버그 로깅
    try { console.debug('[FLICK fmkorea extract]', { images: addedImg.size, textBlocks: blocks.filter(b=>b.type==='html').length }); } catch(_){ }
    // 임시 루트 복제 후 색상 sanitize (원본 DOM 영향 X)
    // 이 단계에서는 blocks.html 문자열만 있으므로 후처리 대신 CSS 강제 컬러 사용 권장.
    return { title, blocks };
  }
  ns.__RULES = ns.__RULES || {}; ns.__RULES.fmkorea = extract;
})(window.__FLICK = window.__FLICK || {});
