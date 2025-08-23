// 단순화: 사이트 설정 무시하고 문서 첫 <article> 내부만 추출
(function (ns) {
  ns.extractPost = function () {
    const article = document.querySelector('article');
    const title = (article && (article.querySelector('h1,h2,h3')?.textContent || '').trim())
      || (document.title || '제목 없음');
    if (!article) return { title, blocks: [] };

    const blocks = [];
    const addedImg = new Set();
    const cfg = ns.getActiveSiteConfig && ns.getActiveSiteConfig();
    const skipSel = cfg && cfg.skipClosest; // 가까운 조상 필터

    // 이미지 먼저 수집 (본문 순서대로)
    article.querySelectorAll('img').forEach(img => {
      if (skipSel && img.closest(skipSel)) return;
      const src = img.getAttribute('data-src') || img.getAttribute('data-original') || img.src;
      if (!src || addedImg.has(src)) return;
      addedImg.add(src);
      blocks.push({ type: 'image', src, alt: img.alt || '' });
    });

    // 텍스트/블록 요소 수집 (단순)
    const seenText = new Set();
    article.querySelectorAll('p, h1, h2, h3, h4, h5, h6, li, blockquote, pre').forEach(el => {
      if (skipSel && el.closest(skipSel)) return;
      const txt = (el.textContent || '').replace(/\s+/g, ' ').trim();
      if (!txt) return;
      // 너무 짧은 구두점 단독 제외
      if (txt.length === 1 && /[\p{P}\p{S}]/u.test(txt)) return;
      if (seenText.has(txt)) return; // 완전 중복 방지
      seenText.add(txt);
      if (el.tagName === 'PRE') {
        blocks.push({ type: 'html', html: el.outerHTML });
      } else {
        blocks.push({ type: 'html', html: el.innerHTML.trim() });
      }
    });

    return { title, blocks };
  };
})(window.__S2S = window.__S2S || {});
