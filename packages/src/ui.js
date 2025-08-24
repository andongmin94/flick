// src/ui.js
export function buildUI(data) {
  if (document.querySelector(".flick-wrap-injected")) return;
  const wrap = document.createElement("div");
  wrap.className = "flick-wrap-injected";
  const stage = document.createElement("div");
  stage.className = "flick-stage flick-fade-in";
  const header = document.createElement("div");
  header.className = "flick-header";
  const title = document.createElement("div");
  title.className = "flick-title";
  title.textContent = data.title;
  title.contentEditable = "true";
  title.spellcheck = false;
  title.title = "제목 수정 가능 (엔터=줄바꿈)";
  title.style.whiteSpace = "pre-wrap"; // 줄바꿈 유지
  title.style.wordBreak = "break-word";
  title.style.textAlign = "center";
  const KEY_TITLE_FS = "flick:titleFontSize";
  try {
    const savedFs = parseInt(localStorage.getItem(KEY_TITLE_FS) || "", 10);
    title.style.fontSize = !isNaN(savedFs) && savedFs >= 10 && savedFs <= 120 ? savedFs + "px" : "20px";
  } catch(_) { title.style.fontSize = "20px"; }
  
  const suppress = (e) => {
    if (document.activeElement === title) {
      if (e.key === "Escape") return; // ESC 로는 닫기 허용
      // Enter 줄바꿈 허용. 다른 키 전파 차단.
      e.stopImmediatePropagation();
    }
  };
  ["keydown", "keypress", "keyup"].forEach((t) =>
    window.addEventListener(t, suppress, true)
  );
  header.appendChild(title);
  const body = document.createElement("div");
  body.className = "flick-body";
  data.blocks.forEach((b) => {
    if (b.type === "image") {
      const img = document.createElement("img");
      img.className = "flick-img";
      img.src = b.src;
      img.alt = b.alt || "";
      body.appendChild(img);
    } else if (b.type === "video") {
      const wrap = document.createElement("div");
      wrap.className = "flick-block";
      const vid = document.createElement("video");
      vid.className = "flick-video";
      vid.src = b.src;
      if (b.poster) vid.poster = b.poster;
      vid.controls = true;
      vid.playsInline = true;
      vid.preload = "metadata";
      wrap.appendChild(vid);
      body.appendChild(wrap);
    } else if (b.type === "html") {
      const div = document.createElement("div");
      div.className = "flick-block";
      div.innerHTML = b.html;
      body.appendChild(div);
    }
  });
  const footer = document.createElement("div");
  footer.className = "flick-footer";
  footer.innerHTML = "<span>Flick Prototype</span>";
  // 리사이즈 핸들 생성 (헤더 아래, 푸터 위)
  const handleHeader = document.createElement("div");
  handleHeader.className = "flick-resize-handle flick-resize-header";
  const handleFooter = document.createElement("div");
  handleFooter.className = "flick-resize-handle flick-resize-footer";
  stage.appendChild(header);
  stage.appendChild(handleHeader);
  stage.appendChild(body);
  stage.appendChild(handleFooter);
  stage.appendChild(footer);
  wrap.appendChild(stage);
  document.body.appendChild(wrap);
  document.body.classList.add("flick-body-lock");
  document.addEventListener(
    "keydown",
    function onKey(e) {
      if (e.key === "Escape") closeShorts();
    },
    { once: true }
  );

  // 드래그 리사이즈 로직
  const state = { dragging: null, startY: 0, startH: 0 };
  const KEY_HEADER = "flick:headerHeight";
  const KEY_FOOTER = "flick:footerHeight";
  // 저장된 높이 복원
  try {
    const hH = parseInt(localStorage.getItem(KEY_HEADER) || "", 10);
    if (!isNaN(hH) && hH > 0) header.style.height = hH + "px";
    const fH = parseInt(localStorage.getItem(KEY_FOOTER) || "", 10);
    if (!isNaN(fH) && fH > 0) footer.style.height = fH + "px";
  } catch (_) {}
  function onDown(e) {
    const target = e.target;
    if (target.classList.contains("flick-resize-handle")) {
      state.dragging = target.classList.contains("flick-resize-header")
        ? "header"
        : "footer";
      state.startY = e.clientY;
      state.startH =
        state.dragging === "header" ? header.offsetHeight : footer.offsetHeight;
      target.classList.add("active");
      document.addEventListener("mousemove", onMove);
      document.addEventListener("mouseup", onUp, { once: true });
      e.preventDefault();
    }
  }
  function onMove(e) {
    if (!state.dragging) return;
    const dy = e.clientY - state.startY;
    if (state.dragging === "header") {
      let next = state.startH + dy;
      if (next < 20) next = 20; // 너무 작아지면 최소 20px
      header.style.height = next + "px";
    } else if (state.dragging === "footer") {
      let next = state.startH - dy;
      if (next < 16) next = 16;
      footer.style.height = next + "px";
    }
  }
  function onUp() {
    document
      .querySelectorAll(".flick-resize-handle.active")
      .forEach((h) => h.classList.remove("active"));
    state.dragging = null;
    document.removeEventListener("mousemove", onMove);
    // 높이 저장
    try {
      if (header.style.height) {
        localStorage.setItem(KEY_HEADER, parseInt(header.style.height, 10));
      }
      if (footer.style.height) {
        localStorage.setItem(KEY_FOOTER, parseInt(footer.style.height, 10));
      }
    } catch (_) {}
  }
  stage.addEventListener("mousedown", onDown);
  createFontSizePanel(KEY_TITLE_FS, title);
  enableTitleFormatToolbar(title);
}

export function closeShorts() {
  const wrap = document.querySelector(".flick-wrap-injected");
  if (!wrap) return;
  wrap.remove();
  document.body.classList.remove("flick-body-lock");
  const fpanel = document.querySelector(".flick-fontsize-panel");
  if (fpanel) fpanel.remove();
  const fmt = document.querySelector('.flick-format-toolbar');
  if (fmt) fmt.remove();
}

function createFontSizePanel(storageKey, titleEl){
  const old = document.querySelector(".flick-fontsize-panel");
  if (old) old.remove();
  const panel = document.createElement("div");
  panel.className = "flick-fontsize-panel";
  panel.style.position = "fixed";
  panel.style.zIndex = 1000003;
  panel.style.background = "rgba(0,0,0,0.75)";
  panel.style.backdropFilter = "blur(4px)";
  panel.style.padding = "6px 10px";
  panel.style.border = "1px solid #222";
  panel.style.borderRadius = "8px";
  panel.style.font = "12px/1.2 'Noto Sans KR', system-ui";
  panel.style.color = "#eee";
  panel.style.display = "flex";
  panel.style.alignItems = "center";
  panel.style.gap = "8px";
  panel.style.boxShadow = "0 4px 12px -2px rgba(0,0,0,0.4)";
  panel.innerHTML = `
    <span style="letter-spacing:.5px;">제목크기</span>
    <input type="range" min="12" max="72" step="1" class="flick-fontsize-input" style="width:110px;" />
    <span class="flick-fontsize-val" style="width:40px;text-align:right;font-variant-numeric:tabular-nums;"></span>
  `;
  const input = panel.querySelector(".flick-fontsize-input");
  const valBox = panel.querySelector(".flick-fontsize-val");
  const curr = parseInt(titleEl.style.fontSize,10)||20;
  input.value = String(curr);
  valBox.textContent = curr + "px";
  input.addEventListener("input", ()=>{
    const v = parseInt(input.value,10);
    if(!isNaN(v)){
      titleEl.style.fontSize = v + "px";
      valBox.textContent = v + "px";
      try{ localStorage.setItem(storageKey, String(v)); }catch(_){ }
    }
  });
  // 위치: 토글 버튼 아래 (없으면 좌측 상단 여백)
  const toggleBtn = document.querySelector('.flick-toggle-btn');
  function place(){
    const r = toggleBtn?.getBoundingClientRect();
    if(r){
      panel.style.top = (r.bottom + 8) + 'px';
      panel.style.left = r.left + 'px';
    } else {
      panel.style.top = '80px';
      panel.style.left = '16px';
    }
  }
  place();
  window.addEventListener('resize', place, { once:true });
  document.body.appendChild(panel);
}

function enableTitleFormatToolbar(titleEl){
  let toolbar = null;
  function ensureToolbar(){
    if (toolbar) return toolbar;
    toolbar = document.createElement('div');
    toolbar.className = 'flick-format-toolbar';
    const KEY_HL = 'flick:highlightColor';
    let hlColor = '#ffeb3b';
    try {
      const saved = localStorage.getItem(KEY_HL);
      if (saved && /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(saved)) hlColor = saved;
    } catch(_){}
    toolbar.innerHTML = `
      <input type="color" class="flick-hl-picker" value="${hlColor}" title="강조색" />
      <button data-action="apply" title="강조 적용">적용</button>
      <button data-action="reset" title="강조 제거">초기</button>
    `;
    document.body.appendChild(toolbar);
    toolbar.addEventListener('mousedown', e=> e.preventDefault());
    toolbar.addEventListener('click', onToolbarClick);
    return toolbar;
  }
  function onToolbarClick(e){
    const btn = e.target.closest('button[data-action]');
    if(!btn) return;
    const action = btn.getAttribute('data-action');
    const picker = toolbar.querySelector('.flick-hl-picker');
    if(action==='apply') {
      const color = picker?.value || '#ffeb3b';
      applyHighlight(color);
    } else if(action==='reset') {
      resetHighlight();
    }
  }
  function applyHighlight(color){
    saveColor(color);
    const sel = window.getSelection();
    if(!sel || sel.rangeCount===0) return;
    const range = sel.getRangeAt(0);
    if(!titleEl.contains(range.commonAncestorContainer) || range.collapsed) return;
    const span = document.createElement('span');
    span.style.color = color;
    span.appendChild(range.extractContents());
    range.insertNode(span);
    sel.removeAllRanges();
    const nr = document.createRange();
    nr.selectNodeContents(span);
    nr.collapse(false);
    sel.addRange(nr);
  }
  function resetHighlight(){
    const sel = window.getSelection();
    if(!sel || sel.rangeCount===0) return;
    const range = sel.getRangeAt(0);
    if(!titleEl.contains(range.commonAncestorContainer) || range.collapsed) return;
    const span = document.createElement('span');
    span.style.color = 'inherit';
    span.appendChild(range.extractContents());
    range.insertNode(span);
    sel.removeAllRanges();
    const nr = document.createRange();
    nr.selectNodeContents(span);
    nr.collapse(false);
    sel.addRange(nr);
  }
  function saveColor(c){
    try { localStorage.setItem('flick:highlightColor', c); } catch(_){}
  }
  function showToolbar(){
    const sel = window.getSelection();
    if(!sel || sel.rangeCount===0) { hideToolbar(); return; }
    const range = sel.getRangeAt(0);
    if(range.collapsed || !titleEl.contains(range.commonAncestorContainer)) { hideToolbar(); return; }
    const rect = range.getBoundingClientRect();
    const tb = ensureToolbar();
    tb.style.top = (window.scrollY + rect.top) + 'px';
    tb.style.left = (window.scrollX + rect.left + rect.width/2) + 'px';
  }
  function hideToolbar(){
    if(toolbar){ toolbar.remove(); toolbar=null; }
  }
  document.addEventListener('selectionchange', () => {
    // 약간의 지연 후 위치 갱신 (DOM 업데이트 반영)
    setTimeout(showToolbar, 0);
  });
  titleEl.addEventListener('blur', ()=>{
    // 다른 곳 클릭 시 제거
    setTimeout(()=>{ const sel = window.getSelection();
      if(!sel || !sel.rangeCount) hideToolbar();
    },100);
  });
}
