// Extraction module
(function(ns){
  ns.extractPost = function(){
    const site = ns.getActiveSiteConfig && ns.getActiveSiteConfig();
    if(!site) return {title: '지원되지 않는 사이트', blocks: []};

    function sanitizeTitle(t){
      if(!t) return '';
      let s = t.replace(/\s+/g,' ').trim();
      (site.titleSanitizers||[]).forEach(([re, rep])=>{ s = s.replace(re, rep); });
      if(/^[\[\(].{0,30}[\]\)]$/.test(s)) return '';
      return s.trim();
    }
    function pickTitle(){
      const selectorList = site.titleSelectors || [];
      const seen = new Set();
      let candidates = [];
      selectorList.forEach(sel => {
        document.querySelectorAll(sel).forEach(el => {
          let txt = sanitizeTitle(el.textContent || '');
          if(!txt) return;
          if(txt.length > 220) txt = txt.slice(0,220).trim();
          if(seen.has(txt)) return;
          seen.add(txt);
          const len = txt.length;
          const hasKo = /[가-힣]/.test(txt) ? 20 : 0;
          const punctRatio = (txt.match(/[.,!?]/g)||[]).length / Math.max(1,len);
          const score = len + hasKo - punctRatio*10;
          candidates.push({txt, score, len});
        });
      });
      const og = sanitizeTitle(document.querySelector('meta[property="og:title"]')?.getAttribute('content')||'');
      if(og && !seen.has(og)) candidates.push({txt:og, score:og.length+15, len:og.length});
      if(!candidates.length) return sanitizeTitle(document.title) || '제목 없음';
      candidates.sort((a,b)=> b.score - a.score || b.len - a.len);
      return candidates[0].txt;
    }
    const rawTitle = pickTitle();
    const contentEl = document.querySelector(site.contentSelector || 'body');
    let blocks = [];
    if(!contentEl) return {title: rawTitle, blocks};
    const DEBUG = !!window.__S2S_DEBUG; // window.__S2S_DEBUG=true 콘솔에서 활성화
    // 더 많은 컨테이너 요소 포함 (section, article, dl/dd 등)
    const nodes = contentEl.querySelectorAll('p, img, figure, blockquote, pre, h1, h2, h3, h4, h5, h6, li, div, section, article, dl, dt, dd');
    nodes.forEach(node => {
      const tag = node.tagName;
      if(site.skipClosest && node.closest && node.closest(site.skipClosest)) return;
      if(tag === 'IMG') {
        const src = node.getAttribute('data-src') || node.getAttribute('data-original') || node.src;
        if(src) blocks.push({type:'image', src, alt: node.alt||''});
      } else if(tag === 'FIGURE') {
        const img = node.querySelector('img');
        if(img){
          const src = img.getAttribute('data-src') || img.getAttribute('data-original') || img.src;
          if(src) blocks.push({type:'image', src, alt: img.alt||''});
        }
      } else if(tag === 'PRE') {
        blocks.push({type:'html', html: node.outerHTML});
      } else {
        const plain = node.textContent.replace(/\s+/g,' ').trim();
        if(!plain){ if(DEBUG) console.debug('[S2S skip empty]', node); return; }
        // 래퍼(자식 블록 보유) 자체를 다시 추가하면 내용이 두 번 출력되므로 항상 스킵
        if(tag === 'DIV' || tag==='SECTION' || tag==='ARTICLE' || tag==='DL') {
          if(node.querySelector('p, img, figure, blockquote, pre, h1, h2, h3, h4, h5, h6, li, dl, dt, dd')) { if(DEBUG) console.debug('[S2S skip wrapper]', node); return; }
        }
        const html = node.innerHTML.trim();
        blocks.push({type:'html', html});
      }
    });
    const filtered = [];
    let lastHtml = '';
    const seenNorm = new Set();
    function normalizeText(t){
      return t
        .replace(/<[^>]+>/g,' ')        // 태그 제거
        .replace(/&nbsp;/gi,' ')
        .replace(/[\s\u200B\uFEFF]+/g,' ')
        .trim()
        .toLowerCase()
        .replace(/[^\p{L}\p{N}\s]/gu,' ') // 문자/숫자 외 제거
        .replace(/\s+/g,' ');
    }
    for(const b of blocks){
      if(b.type!=='html'){ filtered.push(b); continue; }
      const rawHtml = b.html;
      const textOnly = rawHtml.replace(/<[^>]+>/g,'').replace(/&nbsp;/gi,' ').trim();
      if(textOnly.length === 0){ if(DEBUG) console.debug('[S2S drop empty]', b); continue; }
      if(textOnly.length === 1 && /[\p{P}\p{S}]/u.test(textOnly)){ if(DEBUG) console.debug('[S2S drop lone punct]', textOnly); continue; }
      // 즉시 중복 (same html next to each other) 언제나 제거
      if(rawHtml === lastHtml){ if(DEBUG) console.debug('[S2S drop immediate dup]', textOnly.slice(0,60)); continue; }
      const norm = normalizeText(rawHtml);
      if(norm.length >= 12){
        if(seenNorm.has(norm)) { if(DEBUG) console.debug('[S2S drop seen norm]', norm.slice(0,60)); continue; }
        seenNorm.add(norm);
      }
      lastHtml = rawHtml;
      filtered.push(b);
    }
    return {title: rawTitle, blocks: filtered};
  };
})(window.__S2S = window.__S2S || {});
