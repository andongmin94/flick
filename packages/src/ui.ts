import type { ExtractResult } from "./types/global";

export function buildUI(data: ExtractResult) {
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
  (title.style as any).whiteSpace = "pre-wrap";
  (title.style as any).wordBreak = "break-word";
  (title.style as any).textAlign = "center";

  const KEY_TITLE_FS = "flick:titleFontSize";
  try {
    const savedFs = parseInt(localStorage.getItem(KEY_TITLE_FS) || "", 10);
    (title.style as any).fontSize =
      !isNaN(savedFs) && savedFs >= 10 && savedFs <= 120
        ? savedFs + "px"
        : "20px";
  } catch (_) {
    (title.style as any).fontSize = "20px";
  }

  const suppress = (e: KeyboardEvent) => {
    if (document.activeElement === title) {
      if (e.key === "Escape") return; // allow close
      e.stopImmediatePropagation();
    }
  };
  ["keydown", "keypress", "keyup"].forEach((t) =>
    window.addEventListener(t, suppress as any, true)
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
      (vid as any).playsInline = true;
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
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") closeShorts();
    },
    { once: true }
  );

  // Resize logic
  const state: { dragging: "header" | "footer" | null; startY: number; startH: number } = {
    dragging: null,
    startY: 0,
    startH: 0,
  };
  const KEY_HEADER = "flick:headerHeight";
  const KEY_FOOTER = "flick:footerHeight";
  try {
    const hH = parseInt(localStorage.getItem(KEY_HEADER) || "", 10);
    if (!isNaN(hH) && hH > 0) (header.style as any).height = hH + "px";
    const fH = parseInt(localStorage.getItem(KEY_FOOTER) || "", 10);
    if (!isNaN(fH) && fH > 0) (footer.style as any).height = fH + "px";
  } catch (_) {}
  function onDown(e: MouseEvent) {
    const t = e.target as HTMLElement;
    if (t.classList.contains("flick-resize-handle")) {
      state.dragging = t.classList.contains("flick-resize-header")
        ? "header"
        : "footer";
      state.startY = e.clientY;
      state.startH =
        state.dragging === "header" ? header.offsetHeight : footer.offsetHeight;
      t.classList.add("active");
      document.addEventListener("mousemove", onMove as any);
      document.addEventListener("mouseup", onUp as any, { once: true } as any);
      e.preventDefault();
    }
  }
  function onMove(e: MouseEvent) {
    if (!state.dragging) return;
    const dy = e.clientY - state.startY;
    if (state.dragging === "header") {
      let next = state.startH + dy;
      if (next < 20) next = 20;
      (header.style as any).height = next + "px";
    } else {
      let next = state.startH - dy;
      if (next < 16) next = 16;
      (footer.style as any).height = next + "px";
    }
  }
  function onUp() {
    document
      .querySelectorAll(".flick-resize-handle.active")
      .forEach((h) => (h as HTMLElement).classList.remove("active"));
    state.dragging = null;
    document.removeEventListener("mousemove", onMove as any);
    try {
      if ((header.style as any).height)
        localStorage.setItem(KEY_HEADER, parseInt((header.style as any).height, 10) as any);
      if ((footer.style as any).height)
        localStorage.setItem(KEY_FOOTER, parseInt((footer.style as any).height, 10) as any);
    } catch (_) {}
  }
  stage.addEventListener("mousedown", onDown as any);

  createFontSizePanel(KEY_TITLE_FS, title);
  enableAutoHighlight(title);
}

export function closeShorts() {
  const wrap = document.querySelector(".flick-wrap-injected");
  if (!wrap) return;
  wrap.remove();
  document.body.classList.remove("flick-body-lock");
  document.querySelector(".flick-fontsize-panel")?.remove();
  document.querySelector(".flick-format-toolbar")?.remove();
}

function createFontSizePanel(storageKey: string, titleEl: HTMLElement) {
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
  } as any);
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
  const input = panel.querySelector<HTMLInputElement>(".flick-fontsize-input")!;
  const valBox = panel.querySelector<HTMLElement>(".flick-fontsize-val")!;
  const curr = parseInt((titleEl.style as any).fontSize, 10) || 20;
  input.value = String(curr);
  valBox.textContent = curr + "px";
  const min = parseFloat(input.min) || 0;
  const max = parseFloat(input.max) || 100;
  const setPercent = () => {
    const v = parseFloat(input.value) || min;
    const p = ((v - min) / (max - min)) * 100;
    (input.style as any).setProperty("--_percent", p + "%");
    const t = Math.max(0, Math.min(1, p / 100));
    const s = { r: 0xfa, g: 0xcf, b: 0x26 };
    const eC = { r: 0xf8, g: 0x4b, b: 0x05 };
    const lerp = (a: number, b: number) => Math.round(a + (b - a) * t);
    const r = lerp(s.r, eC.r),
      g = lerp(s.g, eC.g),
      b = lerp(s.b, eC.b);
    const hex =
      "#" + [r, g, b].map((n) => n.toString(16).padStart(2, "0")).join("");
    (input.style as any).setProperty("--fs-thumb", hex);
  };
  setPercent();
  input.addEventListener("input", () => {
    const v = parseInt(input.value, 10);
    if (!isNaN(v)) {
      (titleEl.style as any).fontSize = v + "px";
      valBox.textContent = v + "px";
      try {
        localStorage.setItem(storageKey, String(v));
      } catch (_) {}
      setPercent();
    }
  });
  const picker = panel.querySelector<HTMLInputElement>(".flick-hl-picker-main");
  picker?.addEventListener("input", () => {
    const v = picker.value;
    if (/^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(v)) {
      try {
        localStorage.setItem(HL_KEY, v);
      } catch (_) {}
    }
  });
  panel.querySelector(".flick-hl-reset-btn")?.addEventListener("click", () => {
    const spans = titleEl.querySelectorAll("[data-flick-hl]");
    spans.forEach((s) => {
      const parent = s.parentNode as HTMLElement | null;
      if (!parent) return;
      while (s.firstChild) parent.insertBefore(s.firstChild, s);
      (s as HTMLElement).remove();
    });
  });
  const toggleBtn = document.querySelector(".flick-logo-badge");
  function place() {
    const r = toggleBtn?.getBoundingClientRect();
    if (r) {
      (panel.style as any).top = r.bottom + 8 + "px";
      (panel.style as any).left = r.left + "px";
    } else {
      (panel.style as any).top = "80px";
      (panel.style as any).left = "16px";
    }
  }
  place();
  window.addEventListener("resize", place, { once: true } as any);
  document.body.appendChild(panel);
}

function enableAutoHighlight(titleEl: HTMLElement) {
  function getStoredColor() {
    try {
      const c = localStorage.getItem("flick:highlightColor");
      if (c && /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(c)) return c;
    } catch (_) {}
    return "#ffff00";
  }
  function validRange(r: Range) {
    return r && !r.collapsed && titleEl.contains(r.commonAncestorContainer);
  }
  function mergeAdjacent(parent: Element | null, color: string) {
    if (!parent) return;
  const nodes = Array.from(parent.querySelectorAll("[data-flick-hl]"));
    for (let i = 0; i < nodes.length - 1; i++) {
      const a = nodes[i] as HTMLElement,
        b = nodes[i + 1] as HTMLElement;
      if (a.nextSibling === b && (a.style as any).color === (b.style as any).color) {
        while (b.firstChild) a.appendChild(b.firstChild);
        b.remove();
      }
    }
  }
  function applySelection() {
    const sel = window.getSelection();
    if (!sel || !sel.rangeCount) return;
    const r = sel.getRangeAt(0);
    if (!validRange(r)) return;
    const span = document.createElement("span");
    span.setAttribute("data-flick-hl", "");
    (span.style as any).color = getStoredColor();
    span.appendChild(r.extractContents());
    r.insertNode(span);
    sel.removeAllRanges();
    const nr = document.createRange();
    nr.selectNodeContents(span);
    nr.collapse(false);
    sel.addRange(nr);
    mergeAdjacent(span.parentNode as Element | null, (span.style as any).color);
  }
  document.addEventListener("mouseup", () => setTimeout(applySelection, 0));
  document.addEventListener("keyup", (e) => {
    if ((e as KeyboardEvent).key === "Shift") setTimeout(applySelection, 0);
  });
}
