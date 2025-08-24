// Clean rebuild of UI module with working highlight logic
export function buildUI(data) {
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
  title.title = '제목 수정 가능 (엔터=줄바꿈)';
  title.style.whiteSpace = 'pre-wrap';
  title.style.wordBreak = 'break-word';
  title.style.textAlign = 'center';

  const KEY_TITLE_FS = 'flick:titleFontSize';
  try {
    const savedFs = parseInt(localStorage.getItem(KEY_TITLE_FS) || '', 10);
    title.style.fontSize = !isNaN(savedFs) && savedFs >= 10 && savedFs <= 120 ? savedFs + 'px' : '20px';
  } catch (_) { title.style.fontSize = '20px'; }

  const suppress = (e) => {
    if (document.activeElement === title) {
      if (e.key === 'Escape') return; // allow close
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
      img.src = b.src; img.alt = b.alt || '';
      body.appendChild(img);
    } else if (b.type === 'video') {
      const c = document.createElement('div'); c.className='flick-block';
      const vid = document.createElement('video'); vid.className='flick-video';
      vid.src = b.src; if (b.poster) vid.poster = b.poster;
      vid.controls = true; vid.playsInline = true; vid.preload='metadata';
      c.appendChild(vid); body.appendChild(c);
    } else if (b.type === 'html') {
      const div = document.createElement('div'); div.className='flick-block';
      div.innerHTML = b.html; body.appendChild(div);
    }
  });

  const footer = document.createElement('div');
  footer.className = 'flick-footer';
  footer.innerHTML = '<span>Flick Prototype</span>';

  const handleHeader = document.createElement('div'); handleHeader.className='flick-resize-handle flick-resize-header';
  const handleFooter = document.createElement('div'); handleFooter.className='flick-resize-handle flick-resize-footer';
  stage.appendChild(header);
  stage.appendChild(handleHeader);
  stage.appendChild(body);
  stage.appendChild(handleFooter);
  stage.appendChild(footer);
  wrap.appendChild(stage);
  document.body.appendChild(wrap);
  document.body.classList.add('flick-body-lock');
  document.addEventListener('keydown', function onKey(e){ if(e.key==='Escape') closeShorts(); }, { once:true });

  // Resize logic
  const state = { dragging:null, startY:0, startH:0 };
  const KEY_HEADER = 'flick:headerHeight';
  const KEY_FOOTER = 'flick:footerHeight';
  try {
    const hH = parseInt(localStorage.getItem(KEY_HEADER)||'',10); if(!isNaN(hH)&&hH>0) header.style.height = hH+'px';
    const fH = parseInt(localStorage.getItem(KEY_FOOTER)||'',10); if(!isNaN(fH)&&fH>0) footer.style.height = fH+'px';
  } catch(_){}
  function onDown(e){
    const t = e.target;
    if(t.classList.contains('flick-resize-handle')){
      state.dragging = t.classList.contains('flick-resize-header') ? 'header':'footer';
      state.startY = e.clientY; state.startH = state.dragging==='header'?header.offsetHeight:footer.offsetHeight;
      t.classList.add('active');
      document.addEventListener('mousemove', onMove);
      document.addEventListener('mouseup', onUp, { once:true });
      e.preventDefault();
    }
  }
  function onMove(e){
    if(!state.dragging) return; const dy = e.clientY - state.startY;
    if(state.dragging==='header') {
      let next = state.startH + dy; if(next<20) next=20; header.style.height = next+'px';
    } else {
      let next = state.startH - dy; if(next<16) next=16; footer.style.height = next+'px';
    }
  }
  function onUp(){
    document.querySelectorAll('.flick-resize-handle.active').forEach(h=>h.classList.remove('active'));
    state.dragging=null; document.removeEventListener('mousemove', onMove);
    try {
      if(header.style.height) localStorage.setItem(KEY_HEADER, parseInt(header.style.height,10));
      if(footer.style.height) localStorage.setItem(KEY_FOOTER, parseInt(footer.style.height,10));
    } catch(_){}
  }
  stage.addEventListener('mousedown', onDown);

  createFontSizePanel(KEY_TITLE_FS, title);
  enableTitleFormatToolbar(title);
}

export function closeShorts(){
  const wrap = document.querySelector('.flick-wrap-injected');
  if(!wrap) return; wrap.remove();
  document.body.classList.remove('flick-body-lock');
  document.querySelector('.flick-fontsize-panel')?.remove();
  document.querySelector('.flick-format-toolbar')?.remove();
}

function createFontSizePanel(storageKey, titleEl){
  document.querySelector('.flick-fontsize-panel')?.remove();
  const panel = document.createElement('div');
  panel.className='flick-fontsize-panel';
  Object.assign(panel.style, {
    position:'fixed', zIndex:1000003, background:'rgba(0,0,0,0.75)', backdropFilter:'blur(4px)', padding:'6px 10px',
    border:'1px solid #222', borderRadius:'8px', font:"12px/1.2 'Noto Sans KR', system-ui", color:'#eee', display:'flex',
    alignItems:'center', gap:'8px', boxShadow:'0 4px 12px -2px rgba(0,0,0,0.4)', flexWrap:'wrap'
  });
  const HL_KEY='flick:highlightColor';
  let hlColor='#ffeb3b';
  try { const saved=localStorage.getItem(HL_KEY); if(saved && /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(saved)) hlColor=saved; } catch(_){}
  panel.innerHTML = `
    <label style="display:flex;align-items:center;gap:6px;">
      <span style="letter-spacing:.5px;">제목크기</span>
      <input type="range" min="12" max="72" step="1" class="flick-fontsize-input" style="width:110px;" />
      <span class="flick-fontsize-val" style="width:40px;text-align:right;font-variant-numeric:tabular-nums;"></span>
    </label>
    <label style="display:flex;align-items:center;gap:6px;">
      <span style="font-size:12px;">강조색</span>
      <input type="color" class="flick-hl-picker-main" value="${hlColor}" />
    </label>`;
  const input = panel.querySelector('.flick-fontsize-input');
  const valBox = panel.querySelector('.flick-fontsize-val');
  const curr = parseInt(titleEl.style.fontSize,10)||20; input.value=String(curr); valBox.textContent=curr+'px';
  input.addEventListener('input', ()=>{ const v=parseInt(input.value,10); if(!isNaN(v)){ titleEl.style.fontSize=v+'px'; valBox.textContent=v+'px'; try{localStorage.setItem(storageKey,String(v));}catch(_){}}});
  const picker = panel.querySelector('.flick-hl-picker-main');
  picker?.addEventListener('input', ()=>{ const v=picker.value; if(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(v)) { try{ localStorage.setItem(HL_KEY,v);}catch(_){}} });
  const toggleBtn=document.querySelector('.flick-toggle-btn');
  function place(){ const r=toggleBtn?.getBoundingClientRect(); if(r){ panel.style.top=(r.bottom+8)+'px'; panel.style.left=r.left+'px'; } else { panel.style.top='80px'; panel.style.left='16px'; }}
  place(); window.addEventListener('resize', place, { once:true });
  document.body.appendChild(panel);
}

function enableTitleFormatToolbar(titleEl){
  let toolbar=null; let lastRange=null;
  function getStoredColor(){ try{ const c=localStorage.getItem('flick:highlightColor'); if(c && /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(c)) return c; }catch(_){} return '#ffeb3b'; }
  function ensureToolbar(){ if(toolbar) return toolbar; toolbar=document.createElement('div'); toolbar.className='flick-format-toolbar'; toolbar.innerHTML=`<button data-act="apply">강조</button><button data-act="reset">복원</button>`; document.body.appendChild(toolbar); toolbar.addEventListener('mousedown', e=>e.preventDefault()); toolbar.addEventListener('click', onClick); return toolbar; }
  function onClick(e){ const b=e.target.closest('button[data-act]'); if(!b) return; const act=b.getAttribute('data-act'); if(act==='apply') apply(); else if(act==='reset') reset(); }
  function validRange(r){ return r && !r.collapsed && titleEl.contains(r.commonAncestorContainer); }
  function currentRange(){ const sel=window.getSelection(); if(sel && sel.rangeCount){ const r=sel.getRangeAt(0); if(validRange(r)) return r; } return lastRange && validRange(lastRange)? lastRange:null; }
  function apply(){ const r=currentRange(); if(!r) return; const color=getStoredColor(); const span=document.createElement('span'); span.setAttribute('data-flick-hl',''); span.style.color=color; span.appendChild(r.extractContents()); r.insertNode(span); const sel=window.getSelection(); if(sel){ sel.removeAllRanges(); const nr=document.createRange(); nr.selectNodeContents(span); nr.collapse(false); sel.addRange(nr); lastRange=nr.cloneRange(); } }
  function reset(){ const r=currentRange(); if(!r) return; const frag=r.cloneContents(); const container=document.createElement('div'); container.appendChild(frag); container.querySelectorAll('[data-flick-hl]').forEach(s=>{ s.replaceWith(...Array.from(s.childNodes)); }); r.deleteContents(); while(container.firstChild) r.insertNode(container.firstChild); const sel=window.getSelection(); if(sel){ sel.removeAllRanges(); const nr=document.createRange(); nr.setStart(r.endContainer, r.endOffset); nr.collapse(true); sel.addRange(nr); lastRange=nr.cloneRange(); } }
  function show(){ const sel=window.getSelection(); if(!sel||!sel.rangeCount){ hide(); return; } const r=sel.getRangeAt(0); if(!validRange(r)){ hide(); return; } const rect=r.getBoundingClientRect(); const tb=ensureToolbar(); tb.style.top=(window.scrollY+rect.top)+'px'; tb.style.left=(window.scrollX+rect.left+rect.width/2)+'px'; lastRange=r.cloneRange(); }
  function hide(){ if(toolbar){ toolbar.remove(); toolbar=null; } }
  document.addEventListener('selectionchange', ()=> setTimeout(show,0));
  titleEl.addEventListener('blur', ()=> setTimeout(()=>{ const sel=window.getSelection(); if(!sel||!sel.rangeCount) hide(); },120));
}
