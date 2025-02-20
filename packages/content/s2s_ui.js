// UI module
(function(ns){
  ns.buildUI = function(data){
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
    const suppress = (e) => {
      if(document.activeElement === title) {
        if(e.type === 'keydown' && e.key === 'Enter') { e.preventDefault(); }
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
        img.src = b.src; img.alt = b.alt;
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
    stage.appendChild(header); stage.appendChild(body); stage.appendChild(footer);
    wrap.appendChild(stage);
    document.body.appendChild(wrap);
    document.body.classList.add('s2s-body-lock');
    function onKey(e){ if(e.key === 'Escape') ns.closeShorts(); }
    document.addEventListener('keydown', onKey, {once:true});
  };
  ns.closeShorts = function(){
    const wrap = document.querySelector('.s2s-wrap-injected');
    if(!wrap) return;
    wrap.remove();
    document.body.classList.remove('s2s-body-lock');
  };
})(window.__S2S = window.__S2S || {});
