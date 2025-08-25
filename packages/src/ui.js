// Clean rebuild of UI module with working highlight logic
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
  title.style.whiteSpace = "pre-wrap";
  title.style.wordBreak = "break-word";
  title.style.textAlign = "center";

  const KEY_TITLE_FS = "flick:titleFontSize";
  try {
    const savedFs = parseInt(localStorage.getItem(KEY_TITLE_FS) || "", 10);
    title.style.fontSize =
      !isNaN(savedFs) && savedFs >= 10 && savedFs <= 120
        ? savedFs + "px"
        : "20px";
  } catch (_) {
    title.style.fontSize = "20px";
  }

  const suppress = (e) => {
    if (document.activeElement === title) {
      if (e.key === "Escape") return; // allow close
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
      const c = document.createElement("div");
      c.className = "flick-block";
      const vid = document.createElement("video");
      vid.className = "flick-video";
      vid.src = b.src;
      if (b.poster) vid.poster = b.poster;
      vid.controls = true;
      vid.playsInline = true;
      vid.preload = "metadata";
      c.appendChild(vid);
      body.appendChild(c);
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

  // Resize logic
  const state = { dragging: null, startY: 0, startH: 0 };
  const KEY_HEADER = "flick:headerHeight";
  const KEY_FOOTER = "flick:footerHeight";
  try {
    const hH = parseInt(localStorage.getItem(KEY_HEADER) || "", 10);
    if (!isNaN(hH) && hH > 0) header.style.height = hH + "px";
    const fH = parseInt(localStorage.getItem(KEY_FOOTER) || "", 10);
    if (!isNaN(fH) && fH > 0) footer.style.height = fH + "px";
  } catch (_) {}
  function onDown(e) {
    const t = e.target;
    if (t.classList.contains("flick-resize-handle")) {
      state.dragging = t.classList.contains("flick-resize-header")
        ? "header"
        : "footer";
      state.startY = e.clientY;
      state.startH =
        state.dragging === "header" ? header.offsetHeight : footer.offsetHeight;
      t.classList.add("active");
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
      if (next < 20) next = 20;
      header.style.height = next + "px";
    } else {
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
    try {
      if (header.style.height)
        localStorage.setItem(KEY_HEADER, parseInt(header.style.height, 10));
      if (footer.style.height)
        localStorage.setItem(KEY_FOOTER, parseInt(footer.style.height, 10));
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
  document.querySelector(".flick-fontsize-panel")?.remove();
  document.querySelector(".flick-format-toolbar")?.remove();
}

function createFontSizePanel(storageKey, titleEl) {
  document.querySelector(".flick-fontsize-panel")?.remove();
  const panel = document.createElement("div");
  panel.className = "flick-fontsize-panel";
  Object.assign(panel.style, {
    position: "fixed",
    zIndex: 1000003,
    background: "rgba(0,0,0,0.75)",
    backdropFilter: "blur(4px)",
    padding: "6px 10px",
    border: "1px solid #222",
    borderRadius: "8px",
    font: "12px/1.2 'Noto Sans KR', system-ui",
    color: "#eee",
    display: "flex",
    alignItems: "center",
    gap: "8px",
    boxShadow: "0 4px 12px -2px rgba(0,0,0,0.4)",
    flexWrap: "wrap",
  });
  const HL_KEY = "flick:highlightColor";
  let hlColor = "#ffff00";
  try {
    const saved = localStorage.getItem(HL_KEY);
    if (saved && /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(saved)) hlColor = saved;
  } catch (_) {}
  panel.innerHTML = `
    <div style="display:flex;flex-direction:column;gap:6px;">
      <label style="display:flex;align-items:center;gap:6px;">
        <span style="letter-spacing:.5px;">제목크기</span>
        <input type="range" min="12" max="72" step="1" class="flick-fontsize-input" style="width:120px;" />
        <span class="flick-fontsize-val" style="width:44px;text-align:right;font-variant-numeric:tabular-nums;"></span>
      </label>
      <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;">
        <label style="display:flex;align-items:center;gap:6px;">
          <span style="font-size:12px;">강조색</span>
          <input type="color" class="flick-hl-picker-main" value="${hlColor}" />
        </label>
        <button type="button" class="flick-hl-reset-btn" style="all:unset;cursor:pointer;padding:4px 10px;border-radius:6px;background:rgba(255,255,255,0.1);font-size:11px;">강조해제</button>
      </div>
    </div>`;
  const input = panel.querySelector(".flick-fontsize-input");
  const valBox = panel.querySelector(".flick-fontsize-val");
  const curr = parseInt(titleEl.style.fontSize, 10) || 20;
  input.value = String(curr);
  valBox.textContent = curr + "px";
  // initialize percent variable for track fill (0~100%)
  const min = parseFloat(input.min) || 0;
  const max = parseFloat(input.max) || 100;
  const setPercent = () => {
    const v = parseFloat(input.value) || min;
    const p = ((v - min) / (max - min)) * 100;
    input.style.setProperty("--_percent", p + "%");
  // Thumb 색상 보간 (start: #FACF26, end: #F84B05)
  const t = Math.max(0, Math.min(1, p / 100));
  const s = { r: 0xFA, g: 0xCF, b: 0x26 }; // start color
  const eC = { r: 0xF8, g: 0x4B, b: 0x05 }; // end color
  const lerp = (a,b)=>Math.round(a + (b-a)*t);
  const r = lerp(s.r, eC.r), g = lerp(s.g, eC.g), b = lerp(s.b, eC.b);
  const hex = '#'+[r,g,b].map(n=>n.toString(16).padStart(2,'0')).join('');
  input.style.setProperty('--fs-thumb', hex);
  };
  setPercent();
  input.addEventListener("input", () => {
    const v = parseInt(input.value, 10);
    if (!isNaN(v)) {
      titleEl.style.fontSize = v + "px";
      valBox.textContent = v + "px";
      try {
        localStorage.setItem(storageKey, String(v));
      } catch (_) {}
      setPercent();
    }
  });
  const picker = panel.querySelector(".flick-hl-picker-main");
  picker?.addEventListener("input", () => {
    const v = picker.value;
    if (/^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(v)) {
      try {
        localStorage.setItem(HL_KEY, v);
      } catch (_) {}
    }
  });
  // 전체 강조 해제 버튼
  panel.querySelector(".flick-hl-reset-btn")?.addEventListener("click", () => {
    const spans = titleEl.querySelectorAll("[data-flick-hl]");
    spans.forEach((s) => {
      const parent = s.parentNode;
      if (!parent) return;
      while (s.firstChild) parent.insertBefore(s.firstChild, s);
      s.remove();
    });
  });
  const toggleBtn = document.querySelector(".flick-toggle-btn");
  function place() {
    const r = toggleBtn?.getBoundingClientRect();
    if (r) {
      panel.style.top = r.bottom + 8 + "px";
      panel.style.left = r.left + "px";
    } else {
      panel.style.top = "80px";
      panel.style.left = "16px";
    }
  }
  place();
  window.addEventListener("resize", place, { once: true });
  document.body.appendChild(panel);
}

function enableTitleFormatToolbar(titleEl) {
  let toolbar = null;
  let lastRange = null;
  function getStoredColor() {
    try {
      const c = localStorage.getItem("flick:highlightColor");
      if (c && /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(c)) return c;
    } catch (_) {}
    return "#ffff00";
  }
  function ensureToolbar() {
    if (toolbar) return toolbar;
    toolbar = document.createElement("div");
    toolbar.className = "flick-format-toolbar";
    toolbar.innerHTML = `<button data-act="apply">강조</button>`;
    document.body.appendChild(toolbar);
    toolbar.addEventListener("mousedown", (e) => e.preventDefault());
    toolbar.addEventListener("click", onClick);
    return toolbar;
  }
  function onClick(e) {
    const b = e.target.closest("button[data-act]");
    if (!b) return;
    const act = b.getAttribute("data-act");
    if (act === "apply") apply();
  }
  function validRange(r) {
    return r && !r.collapsed && titleEl.contains(r.commonAncestorContainer);
  }
  function currentRange() {
    const sel = window.getSelection();
    if (sel && sel.rangeCount) {
      const r = sel.getRangeAt(0);
      if (validRange(r)) return r;
    }
    return lastRange && validRange(lastRange) ? lastRange : null;
  }
  function apply() {
    const r = currentRange();
    if (!r) return;
    const color = getStoredColor(); // normalize overlapping
    const span = document.createElement("span");
    span.setAttribute("data-flick-hl", "");
    span.style.color = color;
    span.appendChild(r.extractContents());
    r.insertNode(span);
    const sel = window.getSelection();
    if (sel) {
      sel.removeAllRanges();
      const nr = document.createRange();
      nr.selectNodeContents(span);
      nr.collapse(false);
      sel.addRange(nr);
      lastRange = nr.cloneRange();
    }
    mergeAdjacent(span.parentNode, color);
  }
  function mergeAdjacent(parent, color) {
    if (!parent) return;
    const nodes = [...parent.querySelectorAll("[data-flick-hl]")];
    for (let i = 0; i < nodes.length - 1; i++) {
      const a = nodes[i],
        b = nodes[i + 1];
      if (a.nextSibling === b && a.style.color === b.style.color) {
        while (b.firstChild) a.appendChild(b.firstChild);
        b.remove();
      }
    }
  }
  function show() {
    const sel = window.getSelection();
    if (!sel || !sel.rangeCount) {
      hide();
      return;
    }
    const r = sel.getRangeAt(0);
    if (!validRange(r)) {
      hide();
      return;
    }
    const rect = r.getBoundingClientRect();
    const tb = ensureToolbar();
    tb.style.top = window.scrollY + rect.top + "px";
    tb.style.left = window.scrollX + rect.left + rect.width / 2 + "px";
    lastRange = r.cloneRange();
  }
  function hide() {
    if (toolbar) {
      toolbar.remove();
      toolbar = null;
    }
  }
  document.addEventListener("selectionchange", () => setTimeout(show, 0));
  titleEl.addEventListener("blur", () =>
    setTimeout(() => {
      const sel = window.getSelection();
      if (!sel || !sel.rangeCount) hide();
    }, 120)
  );
}
