/**
 * rule_fmkorea.js
 * ------------------------------------------------------------
 * FMKorea 전용 추출 로직.
 *  - 전략: 첫 번째 <article> 기준 단순 추출 (이미지 + 텍스트 블럭)
 *  - 이미지 지연속성(data-src, data-original) 지원
 *  - skipClosest (광고/주소 등) 제외
 *  - 동일 텍스트/이미지 중복 제거(아주 기초 수준)
 *
 * 확장 아이디어:
 *  - 이미지/텍스트 DOM 순서 재구성 (현재는 이미지 선 수집)
 *  - 더 정교한 코드/인용 처리
 *  - 글 작성자/작성일 메타 포함
 */
(function(ns){
  function extractFMKorea(cfg){
    const article = document.querySelector('article');
    const title = (article && (article.querySelector('h1,h2,h3')?.textContent || '').trim())
      || (document.title || '제목 없음');
    if(!article) return { title, blocks: [] };

    const skipSel = cfg && cfg.skipClosest;
    const blocks = [];
    const addedImg = new Set();

    // 이미지 수집
    article.querySelectorAll('img').forEach(img => {
      if (skipSel && img.closest(skipSel)) return;
      const src = img.getAttribute('data-src') || img.getAttribute('data-original') || img.src;
      if(!src || addedImg.has(src)) return;
      addedImg.add(src);
      blocks.push({ type: 'image', src, alt: img.alt || '' });
    });

    // 텍스트 블럭
    const seenText = new Set();
    article.querySelectorAll('p, h1, h2, h3, h4, h5, h6, li, blockquote, pre').forEach(el => {
      if (skipSel && el.closest(skipSel)) return;
      const txt = (el.textContent||'').replace(/\s+/g,' ').trim();
      if(!txt) return;
      if(txt.length===1 && /[\p{P}\p{S}]/u.test(txt)) return;
      if(seenText.has(txt)) return;
      seenText.add(txt);
      if(el.tagName === 'PRE') blocks.push({ type:'html', html: el.outerHTML });
      else blocks.push({ type:'html', html: el.innerHTML.trim() });
    });

    return { title, blocks };
  }

  // 규칙 레지스트리에 등록
  ns.__RULES = ns.__RULES || {};
  ns.__RULES['fmkorea'] = extractFMKorea;
})(window.__S2S = window.__S2S || {});
