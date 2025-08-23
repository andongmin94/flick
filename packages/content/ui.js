/**
 * ui.js
 * 오버레이 렌더링 & 닫기
 */
(function (ns) {
  ns.buildUI = function (data) {
    if (document.querySelector('.flick-wrap-injected')) return;
    const wrap = document.createElement('div');
    wrap.className = 'flick-wrap-injected';
    const stage = document.createElement('div');
    stage.className = 'flick-stage flick-fade-in';

    const header = document.createElement('div');
    header.className = 'flick-header';
    const title = document.createElement('div');
    title.className = 'flick-title';
    title.textContent = data.title;
    title.contentEditable = 'true';
    title.spellcheck = false;
    title.title = '제목 수정 가능';

    const suppress = (e) => {
      if (document.activeElement === title) {
        if (e.type === 'keydown' && e.key === 'Enter') e.preventDefault();
        e.stopImmediatePropagation();
      }
    };
    ['keydown','keypress','keyup'].forEach(t=>window.addEventListener(t,suppress,true));
    header.appendChild(title);

    const body = document.createElement('div');
    body.className = 'flick-body';
    data.blocks.forEach(b => {
      if (b.type === 'image') {
        const img = document.createElement('img');
        img.className = 'flick-img';
        img.src = b.src; img.alt = b.alt;
        body.appendChild(img);
      } else if (b.type === 'html') {
        const div = document.createElement('div');
        div.className = 'flick-block';
        div.innerHTML = b.html;
        body.appendChild(div);
      }
    });

    const footer = document.createElement('div');
    footer.className = 'flick-footer';
    footer.innerHTML = '<span>Flick Prototype</span>';

    stage.appendChild(header); stage.appendChild(body); stage.appendChild(footer);
    wrap.appendChild(stage);
    document.body.appendChild(wrap);
    document.body.classList.add('flick-body-lock');
    document.addEventListener('keydown', function onKey(e){ if(e.key==='Escape') ns.closeShorts(); }, { once:true });
  };
  ns.closeShorts = function(){
    const wrap = document.querySelector('.flick-wrap-injected');
    if(!wrap) return;
    wrap.remove();
    document.body.classList.remove('flick-body-lock');
  };
})(window.__FLICK = window.__FLICK || {});
