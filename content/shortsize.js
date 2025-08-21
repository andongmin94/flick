// 게시판 글을 쇼츠 형태로 재구성
(function(){
  const SITE_MATCH = /fmkorea\.com\/best\//;
  if(!SITE_MATCH.test(location.href)) return;
  if(window.__S2S_SHORTS_BOOTSTRAP__) return; window.__S2S_SHORTS_BOOTSTRAP__ = true;

  // 제목 편집은 세션/스토리지에 저장하지 않고 오버레이 닫으면 원복되도록 유지

  function extractPost(){
    function sanitizeTitle(t){
      if(!t) return '';
      let s = t.replace(/\s+/g,' ').trim();
      // 사이트명/불필요 꼬리 제거 패턴
      s = s.replace(/\s*-\s*FM코리아.*/i,'')
           .replace(/\|\s*FMKOREA.*/i,'')
           .replace(/\s*:\s*네이버\s*뉴스.*/i,'');
      // 괄호로 둘러싼 글자만 있는 경우 제거
      if(/^[\[\(].{0,30}[\]\)]$/.test(s)) return '';
      return s.trim();
    }

    function pickTitle(){
      const selectorList = [
        '.read_header h1',
        '.rd_hd h1',
        '.read_header .np_18px',
        '.np_18px',
      ];
      const seen = new Set();
      let candidates = [];
      selectorList.forEach(sel => {
        document.querySelectorAll(sel).forEach(el => {
          let txt = sanitizeTitle(el.textContent || '');
          if(!txt) return;
            // 너무 긴 건 잘라서 평가
          if(txt.length > 220) txt = txt.slice(0,220).trim();
          if(seen.has(txt)) return;
          seen.add(txt);
          // 스코어: 길이(가중) + 한글 포함 보너스 - 구두점 비율
          const len = txt.length;
          const hasKo = /[가-힣]/.test(txt) ? 20 : 0;
            const punctRatio = (txt.match(/[.,!?]/g)||[]).length / Math.max(1,len);
          const score = len + hasKo - punctRatio*10;
          candidates.push({txt, score, len});
        });
      });
      // og:title 후보 추가
      const og = sanitizeTitle(document.querySelector('meta[property="og:title"]')?.getAttribute('content')||'');
      if(og && !seen.has(og)) candidates.push({txt:og, score:og.length+15, len:og.length});

      if(!candidates.length) {
        return sanitizeTitle(document.title) || '제목 없음';
      }
      candidates.sort((a,b)=> b.score - a.score || b.len - a.len);
      return candidates[0].txt;
    }

    const rawTitle = pickTitle();

    // 본문 컨테이너 후보들
    const contentEl = document.querySelector('.read_body, .rd_body, .view_content, .article_body, .content, #articleBody');
    let blocks = [];
    if(!contentEl) return {title: rawTitle, blocks};

    const nodes = contentEl.querySelectorAll('p, img, figure, blockquote, pre, h2, h3, h4, li, div');
    nodes.forEach(node => {
      const tag = node.tagName;
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
        if(!plain) return; // skip empty
        // 지나치게 중첩된 wrapper div (자식에 다른 블록 포함) 는 단독 텍스트만 있는 경우에만
        if(tag === 'DIV') {
          // 자식에 블록성 요소가 있으면 스킵 (이미 개별 노드 순회 중)
          if(node.querySelector('p, img, figure, blockquote, pre, h2, h3, h4, li')) return;
        }
        const html = node.innerHTML.trim();
        blocks.push({type:'html', html});
      }
    });

    // 중복/광고 제거 (간단 필터: 너무 짧은 텍스트 2자 이하 제거, 동일 html 연속 제거)
    const filtered = [];
    let lastHtml = '';
    for(const b of blocks){
      if(b.type==='html'){
        const textOnly = b.html.replace(/<[^>]+>/g,'').trim();
        if(textOnly.length < 2) continue;
        if(b.html === lastHtml) continue;
        lastHtml = b.html;
        filtered.push(b);
      } else {
        filtered.push(b);
      }
    }
    return {title: rawTitle, blocks: filtered};
  }

  function buildUI(data){
    if(document.querySelector('.s2s-wrap-injected')) return; // already open
    const wrap = document.createElement('div');
    wrap.className = 's2s-wrap-injected';

    const stage = document.createElement('div');
    stage.className = 's2s-stage s2s-fade-in';

    const header = document.createElement('div');
    header.className = 's2s-header';
    const title = document.createElement('div');
    title.className='s2s-title';
  title.textContent = data.title;
    title.setAttribute('contenteditable','true');
    title.setAttribute('spellcheck','false');
    title.title = '제목 클릭 후 수정 가능';
  // 입력 변화는 유지하되 저장하지 않음 (오버레이 닫히면 원본 재로딩)
    // 제목 편집 중 사이트 고유 단축키 차단: keydown/keypress/keyup 모두 캡처 단계에서 전파 중단
    const suppress = (e) => {
      if(document.activeElement === title) {
        if(e.type === 'keydown' && e.key === 'Enter') { e.preventDefault(); }
        // 기본 입력(문자 입력)은 허용하되 상위로 전달 막기
        e.stopImmediatePropagation();
      }
    };
    window.addEventListener('keydown', suppress, true);
    window.addEventListener('keypress', suppress, true);
    window.addEventListener('keyup', suppress, true);
    header.appendChild(title);

    const body = document.createElement('div');
    body.className = 's2s-body';

    data.blocks.forEach(b=>{
      if(b.type==='image') {
        const img = document.createElement('img');
        img.className='s2s-img';
        img.src = b.src;
        img.alt = b.alt;
        body.appendChild(img);
      } else if(b.type==='html') {
        const div = document.createElement('div');
        div.className='s2s-block';
        div.innerHTML = b.html;
        body.appendChild(div);
      }
    });

    const footer = document.createElement('div');
    footer.className='s2s-footer';
    footer.innerHTML = '<span>Shorts View Prototype</span>';

    stage.appendChild(header);
    stage.appendChild(body);
    stage.appendChild(footer);

    wrap.appendChild(stage);
    document.body.appendChild(wrap);
    document.body.classList.add('s2s-body-lock');

    function onKey(e){
      if(e.key === 'Escape') closeShorts();
    }
    document.addEventListener('keydown', onKey, {once:true});
  }

  function closeShorts(){
    const wrap = document.querySelector('.s2s-wrap-injected');
    if(!wrap) return;
    wrap.remove();
    document.body.classList.remove('s2s-body-lock');
  }

  function openShorts(){
    const data = extractPost();
    buildUI(data);
  }

  function toggleShorts(){
    const open = !!document.querySelector('.s2s-wrap-injected');
    if(open) {
      closeShorts();
    } else {
      openShorts();
    }
    updateToggleButton();
  }

  // 단축키: Shift + S 토글
  document.addEventListener('keydown', (e)=>{
    // 제목 편집 포커스 중이면 토글 단축키 무시
    const active = document.activeElement;
    if(active && active.classList && active.classList.contains('s2s-title')) return;
    if(e.shiftKey && e.key.toLowerCase()==='s'){
      toggleShorts();
    }
  });

  // 페이지 내 좌측 상단 토글 버튼 삽입
  function injectToggleButton(){
    if(document.querySelector('.s2s-toggle-btn')) return;
    const btn = document.createElement('button');
    btn.className = 's2s-toggle-btn s2s-toggle-floating';
    btn.type='button';
    btn.dataset.role='s2s-toggle';
    btn.innerHTML = '쇼츠 보기';
    btn.addEventListener('click', toggleShorts);
    document.body.appendChild(btn);
    updateToggleButton();
  }

  function updateToggleButton(){
    const btn = document.querySelector('.s2s-toggle-btn[data-role="s2s-toggle"]');
    if(!btn) return;
    const open = !!document.querySelector('.s2s-wrap-injected');
    btn.textContent = open ? '쇼츠 닫기' : '쇼츠 보기';
  }

  // DOMContentLoaded 이후 시도 (이미 로드되어 있으면 바로)
  if(document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', injectToggleButton);
  } else {
    injectToggleButton();
  }
})();
