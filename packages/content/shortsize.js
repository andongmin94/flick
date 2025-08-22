// 모듈 기반 부트스트랩
(function(){
  if(!window.__S2S || !window.__S2S.isSupportedArticle || !window.__S2S.isSupportedArticle()) return;
  if(window.__S2S_BOOTSTRAPPED__) return; window.__S2S_BOOTSTRAPPED__ = true;

  function openShorts(){ const data = window.__S2S.extractPost(); window.__S2S.buildUI(data); }
  function closeShorts(){ window.__S2S.closeShorts(); }
  function toggleShorts(){ const open = !!document.querySelector('.s2s-wrap-injected'); open ? closeShorts() : openShorts(); updateToggleButton(); }

  // 단축키: Shift + S 토글
  document.addEventListener('keydown', e => {
    const active = document.activeElement;
    if(active && active.classList && active.classList.contains('s2s-title')) return;
    if(e.shiftKey && e.key.toLowerCase()==='s') toggleShorts();
  });

  // 페이지 내 좌측 상단 토글 버튼 삽입
  function injectToggleButton(){
    if(document.querySelector('.s2s-toggle-btn')) return;
    const btn = document.createElement('button');
    btn.className='s2s-toggle-btn s2s-toggle-floating';
    btn.type='button';
    btn.dataset.role='s2s-toggle';
    btn.innerHTML='쇼츠 보기';
    btn.addEventListener('click', toggleShorts);
    document.body.appendChild(btn);
    updateToggleButton();
  }

  function updateToggleButton(){
    const btn = document.querySelector('.s2s-toggle-btn[data-role="s2s-toggle"]');
    if(!btn) return; const open = !!document.querySelector('.s2s-wrap-injected');
    btn.textContent = open ? '쇼츠 닫기' : '쇼츠 보기';
  }

  // DOMContentLoaded 이후 시도 (이미 로드되어 있으면 바로)
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded', injectToggleButton); else injectToggleButton();
})();
