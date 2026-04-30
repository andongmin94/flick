import type { Block, ExtractResult } from "./types/global";

const KEY_TITLE_FS = "flick:titleFontSize";
const KEY_HEADER = "flick:headerHeight";
const KEY_FOOTER = "flick:footerHeight";
const KEY_HIGHLIGHT = "flick:highlightColor";
const KEY_HEADER_BG = "flick:headerBg";
const KEY_FOOTER_BG = "flick:footerBg";
const KEY_SAFE_AREA = "flick:safeArea";
const DEFAULT_HEADER_HEIGHT = 96;
const DEFAULT_FOOTER_HEIGHT = 52;
const DEFAULT_TITLE_SIZE = 20;
const DEFAULT_SANDBOX_BG = "#000000";

let activeCleanups: Array<() => void> = [];

function addCleanup(cleanup: () => void) {
  activeCleanups.push(cleanup);
}

function runCleanups() {
  const cleanups = activeCleanups;
  activeCleanups = [];
  cleanups.forEach((cleanup) => {
    try {
      cleanup();
    } catch (_) {}
  });
}

function addWindowListener<K extends keyof WindowEventMap>(
  type: K,
  listener: (event: WindowEventMap[K]) => void,
  options?: boolean | AddEventListenerOptions
) {
  window.addEventListener(type, listener as EventListener, options);
  addCleanup(() =>
    window.removeEventListener(type, listener as EventListener, options)
  );
}

function addDocumentListener<K extends keyof DocumentEventMap>(
  type: K,
  listener: (event: DocumentEventMap[K]) => void,
  options?: boolean | AddEventListenerOptions
) {
  document.addEventListener(type, listener as EventListener, options);
  addCleanup(() =>
    document.removeEventListener(type, listener as EventListener, options)
  );
}

function readStorage(key: string) {
  try {
    return localStorage.getItem(key);
  } catch (_) {
    return null;
  }
}

function writeStorage(key: string, value: string) {
  try {
    localStorage.setItem(key, value);
  } catch (_) {}
}

function readIntStorage(
  key: string,
  fallback: number,
  min: number,
  max: number
) {
  const parsed = parseInt(readStorage(key) || "", 10);
  return !isNaN(parsed) && parsed >= min && parsed <= max ? parsed : fallback;
}

function getHighlightColor() {
  const stored = readStorage(KEY_HIGHLIGHT);
  if (stored && /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(stored)) return stored;
  return "#ffff00";
}

function getStoredColor(key: string, fallback: string) {
  const stored = readStorage(key);
  if (stored && /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(stored)) {
    return normalizeHexColor(stored);
  }
  return fallback;
}

function normalizeHexColor(color: string) {
  if (/^#[0-9a-f]{6}$/i.test(color)) return color.toLowerCase();
  const short = color.match(/^#([0-9a-f])([0-9a-f])([0-9a-f])$/i);
  if (!short) return color;
  return `#${short[1]}${short[1]}${short[2]}${short[2]}${short[3]}${short[3]}`.toLowerCase();
}

function getReadableTextColor(bgColor: string) {
  const color = normalizeHexColor(bgColor);
  const match = color.match(/^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i);
  if (!match) return "#ffffff";
  const r = parseInt(match[1], 16);
  const g = parseInt(match[2], 16);
  const b = parseInt(match[3], 16);
  const luminance = (r * 299 + g * 587 + b * 114) / 1000;
  return luminance > 150 ? "#111827" : "#ffffff";
}

function makeButton(className: string, label: string, title: string) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = className;
  button.textContent = label;
  button.title = title;
  button.setAttribute("aria-label", title);
  return button;
}

function legacyHtmlToText(html: string) {
  const template = document.createElement("template");
  template.innerHTML = html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(?:p|div|li|h[1-6]|blockquote|pre)>/gi, "\n");
  return (template.content.textContent || "").replace(/\n{3,}/g, "\n\n").trim();
}

function createTextBlock(text: string) {
  const cleaned = text.trim();
  if (!cleaned) return null;
  const div = document.createElement("div");
  div.className = "flick-block flick-text-block";
  div.textContent = cleaned;
  return div;
}

function createBlockElement(block: Block) {
  if (block.type === "image") {
    if (!block.src) return null;
    const container = document.createElement("div");
    container.className = "flick-block flick-media-block";
    const img = document.createElement("img");
    img.className = "flick-img";
    img.src = block.src;
    img.alt = block.alt || "";
    container.appendChild(img);
    return container;
  }

  if (block.type === "video") {
    if (!block.src) return null;
    const container = document.createElement("div");
    container.className = "flick-block flick-media-block";
    const video = document.createElement("video");
    video.className = "flick-video";
    video.src = block.src;
    if (block.poster) video.poster = block.poster;
    video.controls = true;
    video.playsInline = true;
    video.preload = "metadata";
    container.appendChild(video);
    return container;
  }

  if (block.type === "text") return createTextBlock(block.text);

  if (block.type === "trusted-html") {
    const div = document.createElement("div");
    div.className = "flick-block";
    div.innerHTML = block.html;
    return div;
  }

  return createTextBlock(legacyHtmlToText(block.html));
}

function appendEmptyState(parent: HTMLElement, data: ExtractResult) {
  const block = document.createElement("div");
  block.className = "flick-block flick-state-block";
  block.dataset.flickBlockIndex = "0";

  const placeholder = document.createElement("div");
  placeholder.className = "flick-empty-placeholder";

  const title = document.createElement("strong");
  title.textContent =
    data.status === "error"
      ? "게시글을 읽지 못했습니다"
      : "가져올 본문이 없습니다";

  const message = document.createElement("p");
  message.textContent =
    data.message ||
    "원본 페이지 구조가 바뀌었거나, 아직 지원하지 않는 게시글 형식일 수 있습니다.";

  const sourceUrl = data.sourceUrl || location.href;
  const sourceButton = makeButton(
    "flick-empty-source-btn",
    "원본 열기",
    "원본 글 열기"
  );
  sourceButton.addEventListener("click", () => {
    window.open(sourceUrl, "_blank", "noopener,noreferrer");
  });

  placeholder.appendChild(title);
  placeholder.appendChild(message);
  placeholder.appendChild(sourceButton);
  block.appendChild(placeholder);
  parent.appendChild(block);
}

function renderBlocks(parent: HTMLElement, data: ExtractResult) {
  let rendered = 0;
  data.blocks.forEach((block) => {
    const el = createBlockElement(block);
    if (!el) return;
    el.dataset.flickBlockIndex = String(rendered);
    parent.appendChild(el);
    rendered += 1;
  });

  if (rendered === 0) {
    appendEmptyState(parent, data);
    rendered = 1;
  }

  return rendered;
}

function applyStoredSizing(
  header: HTMLElement,
  footer: HTMLElement,
  title: HTMLElement
) {
  header.style.height =
    readIntStorage(KEY_HEADER, DEFAULT_HEADER_HEIGHT, 20, 360) + "px";
  footer.style.height =
    readIntStorage(KEY_FOOTER, DEFAULT_FOOTER_HEIGHT, 16, 260) + "px";
  title.style.fontSize =
    readIntStorage(KEY_TITLE_FS, DEFAULT_TITLE_SIZE, 12, 72) + "px";
}

function applySandboxColors(
  header: HTMLElement,
  footer: HTMLElement,
  title: HTMLElement,
  headerColor: string,
  footerColor: string
) {
  const headerTextColor = getReadableTextColor(headerColor);
  const footerTextColor = getReadableTextColor(footerColor);
  header.style.backgroundColor = headerColor;
  header.style.color = headerTextColor;
  title.style.color = headerTextColor;
  footer.style.backgroundColor = footerColor;
  footer.style.color = footerTextColor;
}

function applyStoredSandboxColors(
  header: HTMLElement,
  footer: HTMLElement,
  title: HTMLElement
) {
  applySandboxColors(
    header,
    footer,
    title,
    getStoredColor(KEY_HEADER_BG, DEFAULT_SANDBOX_BG),
    getStoredColor(KEY_FOOTER_BG, DEFAULT_SANDBOX_BG)
  );
}

export function buildUI(data: ExtractResult) {
  if (document.querySelector(".flick-wrap-injected")) return;
  runCleanups();

  const wrap = document.createElement("div");
  wrap.className = "flick-wrap-injected";
  wrap.dataset.status =
    data.status || (data.blocks.length > 0 ? "ok" : "empty");
  if (data.siteId) wrap.dataset.site = data.siteId;

  const stage = document.createElement("div");
  stage.className = "flick-stage flick-fade-in";
  if (readStorage(KEY_SAFE_AREA) === "true") {
    stage.classList.add("flick-safe-area-on");
  }

  const header = document.createElement("div");
  header.className = "flick-header";

  const title = document.createElement("div");
  title.className = "flick-title";
  title.textContent = data.title || document.title || "제목 없음";
  title.contentEditable = "true";
  title.spellcheck = false;
  title.title = "제목 수정 가능";
  title.style.whiteSpace = "pre-wrap";
  title.style.wordBreak = "break-word";
  title.style.textAlign = "center";

  header.appendChild(title);

  const body = document.createElement("div");
  body.className = "flick-body";
  renderBlocks(body, data);

  const footer = document.createElement("div");
  footer.className = "flick-footer";

  applyStoredSizing(header, footer, title);
  applyStoredSandboxColors(header, footer, title);

  const handleHeader = document.createElement("div");
  handleHeader.className = "flick-resize-handle flick-resize-header";
  const handleFooter = document.createElement("div");
  handleFooter.className = "flick-resize-handle flick-resize-footer";
  stage.appendChild(header);
  stage.appendChild(handleHeader);
  stage.appendChild(body);
  stage.appendChild(handleFooter);
  stage.appendChild(footer);

  const controls = createControlPanel({
    data,
    stage,
    header,
    footer,
    title,
  });

  wrap.appendChild(stage);
  wrap.appendChild(controls.panel);
  document.body.appendChild(wrap);
  document.body.classList.add("flick-body-lock");

  const onEscape = (event: KeyboardEvent) => {
    if (event.key === "Escape") closeShorts();
  };
  addDocumentListener("keydown", onEscape);

  const suppress = (event: KeyboardEvent) => {
    if (document.activeElement === title) {
      if (event.key === "Escape") return;
      event.stopImmediatePropagation();
    }
  };
  ["keydown", "keypress", "keyup"].forEach((type) =>
    addWindowListener(type as keyof WindowEventMap, suppress as EventListener, true)
  );

  setupResize(stage, header, footer);
  addCleanup(enableAutoHighlight(title));

  window.dispatchEvent(new CustomEvent("flick:shortschange", { detail: true }));
}

export function closeShorts() {
  const wrap = document.querySelector(".flick-wrap-injected");
  runCleanups();
  wrap?.remove();
  document.body.classList.remove("flick-body-lock");
  document.querySelector(".flick-fontsize-panel")?.remove();
  document.querySelector(".flick-format-toolbar")?.remove();
  document.querySelector(".flick-control-panel")?.remove();
  window.dispatchEvent(new CustomEvent("flick:shortschange", { detail: false }));
}

function createControlPanel(args: {
  data: ExtractResult;
  stage: HTMLElement;
  header: HTMLElement;
  footer: HTMLElement;
  title: HTMLElement;
}) {
  const { data, stage, header, footer, title } = args;
  const panel = document.createElement("div");
  panel.className = "flick-control-panel";

  const topRow = document.createElement("div");
  topRow.className = "flick-control-row flick-control-row-main";

  const sourceButton = makeButton("flick-tool-btn", "↗", "원본 글 열기");
  const closeButton = makeButton("flick-tool-btn flick-tool-btn-close", "×", "닫기");

  sourceButton.addEventListener("click", () => {
    window.open(data.sourceUrl || location.href, "_blank", "noopener,noreferrer");
  });
  closeButton.addEventListener("click", closeShorts);

  topRow.appendChild(sourceButton);
  topRow.appendChild(closeButton);

  const toolRow = document.createElement("div");
  toolRow.className = "flick-control-row flick-control-row-tools";

  const fontGroup = document.createElement("label");
  fontGroup.className = "flick-range-group";
  const fontLabel = document.createElement("span");
  fontLabel.textContent = "제목";
  const fontInput = document.createElement("input");
  fontInput.type = "range";
  fontInput.min = "12";
  fontInput.max = "72";
  fontInput.step = "1";
  fontInput.className = "flick-fontsize-input";
  const currentFontSize = parseInt(title.style.fontSize, 10) || 20;
  fontInput.value = String(currentFontSize);
  const fontValue = document.createElement("span");
  fontValue.className = "flick-fontsize-val";
  fontValue.textContent = currentFontSize + "px";
  fontGroup.appendChild(fontLabel);
  fontGroup.appendChild(fontInput);
  fontGroup.appendChild(fontValue);

  const colorPicker = document.createElement("input");
  colorPicker.type = "color";
  colorPicker.className = "flick-hl-picker-main";
  colorPicker.value = getHighlightColor();
  colorPicker.title = "강조색";
  colorPicker.setAttribute("aria-label", "강조색");

  const resetHighlight = makeButton(
    "flick-tool-btn flick-text-tool-btn",
    "제목 강조해제",
    "제목 강조 해제"
  );

  const sandboxColorGroup = document.createElement("div");
  sandboxColorGroup.className = "flick-color-group";
  const headerColorLabel = document.createElement("label");
  headerColorLabel.className = "flick-color-label";
  const headerColorText = document.createElement("span");
  headerColorText.textContent = "위";
  const headerColorPicker = document.createElement("input");
  headerColorPicker.type = "color";
  headerColorPicker.className = "flick-hl-picker-main";
  headerColorPicker.value = getStoredColor(KEY_HEADER_BG, DEFAULT_SANDBOX_BG);
  headerColorPicker.title = "위쪽 영역 색";
  headerColorPicker.setAttribute("aria-label", "위쪽 영역 색");
  headerColorLabel.appendChild(headerColorText);
  headerColorLabel.appendChild(headerColorPicker);

  const footerColorLabel = document.createElement("label");
  footerColorLabel.className = "flick-color-label";
  const footerColorText = document.createElement("span");
  footerColorText.textContent = "아래";
  const footerColorPicker = document.createElement("input");
  footerColorPicker.type = "color";
  footerColorPicker.className = "flick-hl-picker-main";
  footerColorPicker.value = getStoredColor(KEY_FOOTER_BG, DEFAULT_SANDBOX_BG);
  footerColorPicker.title = "아래쪽 영역 색";
  footerColorPicker.setAttribute("aria-label", "아래쪽 영역 색");
  footerColorLabel.appendChild(footerColorText);
  footerColorLabel.appendChild(footerColorPicker);
  sandboxColorGroup.appendChild(headerColorLabel);
  sandboxColorGroup.appendChild(footerColorLabel);

  const safeAreaButton = makeButton(
    "flick-tool-btn flick-text-tool-btn",
    "안전영역",
    "9:16 안전영역 표시"
  );
  const setSafeArea = (enabled: boolean) => {
    stage.classList.toggle("flick-safe-area-on", enabled);
    safeAreaButton.classList.toggle("is-active", enabled);
    safeAreaButton.setAttribute("aria-pressed", enabled ? "true" : "false");
    writeStorage(KEY_SAFE_AREA, enabled ? "true" : "false");
  };
  setSafeArea(stage.classList.contains("flick-safe-area-on"));
  safeAreaButton.addEventListener("click", () => {
    setSafeArea(!stage.classList.contains("flick-safe-area-on"));
  });

  setRangePercent(fontInput);
  fontInput.addEventListener("input", () => {
    const value = parseInt(fontInput.value, 10);
    if (isNaN(value)) return;
    title.style.fontSize = value + "px";
    fontValue.textContent = value + "px";
    writeStorage(KEY_TITLE_FS, String(value));
    setRangePercent(fontInput);
  });

  colorPicker.addEventListener("input", () => {
    if (/^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(colorPicker.value)) {
      writeStorage(KEY_HIGHLIGHT, colorPicker.value);
    }
  });

  function updateSandboxColors() {
    const headerColor = normalizeHexColor(headerColorPicker.value);
    const footerColor = normalizeHexColor(footerColorPicker.value);
    writeStorage(KEY_HEADER_BG, headerColor);
    writeStorage(KEY_FOOTER_BG, footerColor);
    applySandboxColors(header, footer, title, headerColor, footerColor);
  }
  headerColorPicker.addEventListener("input", updateSandboxColors);
  footerColorPicker.addEventListener("input", updateSandboxColors);

  resetHighlight.addEventListener("click", () => {
    title.querySelectorAll("[data-flick-hl]").forEach((span) => {
      const parent = span.parentNode as HTMLElement | null;
      if (!parent) return;
      while (span.firstChild) parent.insertBefore(span.firstChild, span);
      (span as HTMLElement).remove();
    });
  });

  toolRow.appendChild(fontGroup);
  toolRow.appendChild(colorPicker);
  toolRow.appendChild(resetHighlight);
  toolRow.appendChild(sandboxColorGroup);
  toolRow.appendChild(safeAreaButton);

  panel.appendChild(topRow);
  panel.appendChild(toolRow);

  return { panel };
}

function setRangePercent(input: HTMLInputElement) {
  const min = parseFloat(input.min) || 0;
  const max = parseFloat(input.max) || 100;
  const value = parseFloat(input.value) || min;
  const percent = ((value - min) / (max - min)) * 100;
  input.style.setProperty("--_percent", percent + "%");
  const t = Math.max(0, Math.min(1, percent / 100));
  const start = { r: 0xfa, g: 0xcf, b: 0x26 };
  const end = { r: 0xf8, g: 0x4b, b: 0x05 };
  const lerp = (a: number, b: number) => Math.round(a + (b - a) * t);
  const hex =
    "#" +
    [lerp(start.r, end.r), lerp(start.g, end.g), lerp(start.b, end.b)]
      .map((n) => n.toString(16).padStart(2, "0"))
      .join("");
  input.style.setProperty("--fs-thumb", hex);
}

function setupResize(
  stage: HTMLElement,
  header: HTMLElement,
  footer: HTMLElement
) {
  const state: {
    dragging: "header" | "footer" | null;
    startY: number;
    startH: number;
  } = {
    dragging: null,
    startY: 0,
    startH: 0,
  };

  function onDown(event: MouseEvent) {
    const target = event.target as HTMLElement;
    if (!target.classList.contains("flick-resize-handle")) return;
    state.dragging = target.classList.contains("flick-resize-header")
      ? "header"
      : "footer";
    state.startY = event.clientY;
    state.startH =
      state.dragging === "header" ? header.offsetHeight : footer.offsetHeight;
    target.classList.add("active");
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp, { once: true });
    event.preventDefault();
  }

  function onMove(event: MouseEvent) {
    if (!state.dragging) return;
    const dy = event.clientY - state.startY;
    if (state.dragging === "header") {
      header.style.height = Math.max(20, state.startH + dy) + "px";
    } else {
      footer.style.height = Math.max(16, state.startH - dy) + "px";
    }
  }

  function onUp() {
    document
      .querySelectorAll(".flick-resize-handle.active")
      .forEach((handle) => (handle as HTMLElement).classList.remove("active"));
    state.dragging = null;
    document.removeEventListener("mousemove", onMove);
    writeStorage(KEY_HEADER, String(parseInt(header.style.height, 10)));
    writeStorage(KEY_FOOTER, String(parseInt(footer.style.height, 10)));
  }

  stage.addEventListener("mousedown", onDown);
  addCleanup(() => {
    stage.removeEventListener("mousedown", onDown);
    document.removeEventListener("mousemove", onMove);
    document.removeEventListener("mouseup", onUp);
  });
}

function enableAutoHighlight(titleEl: HTMLElement) {
  function validRange(range: Range) {
    return (
      range &&
      !range.collapsed &&
      titleEl.contains(range.commonAncestorContainer)
    );
  }

  function mergeAdjacent(parent: Element | null, color: string) {
    if (!parent) return;
    const nodes = Array.from(parent.querySelectorAll("[data-flick-hl]"));
    for (let i = 0; i < nodes.length - 1; i++) {
      const current = nodes[i] as HTMLElement;
      const next = nodes[i + 1] as HTMLElement;
      if (current.nextSibling === next && current.style.color === next.style.color) {
        while (next.firstChild) current.appendChild(next.firstChild);
        next.remove();
      }
    }
  }

  function applySelection() {
    const selection = window.getSelection();
    if (!selection || !selection.rangeCount) return;
    const range = selection.getRangeAt(0);
    if (!validRange(range)) return;
    const span = document.createElement("span");
    span.setAttribute("data-flick-hl", "");
    span.style.color = getHighlightColor();
    span.appendChild(range.extractContents());
    range.insertNode(span);
    selection.removeAllRanges();
    const nextRange = document.createRange();
    nextRange.selectNodeContents(span);
    nextRange.collapse(false);
    selection.addRange(nextRange);
    mergeAdjacent(span.parentNode as Element | null, span.style.color);
  }

  const onMouseUp = () => setTimeout(applySelection, 0);
  const onKeyUp = (event: KeyboardEvent) => {
    if (event.key === "Shift") setTimeout(applySelection, 0);
  };
  document.addEventListener("mouseup", onMouseUp);
  document.addEventListener("keyup", onKeyUp);
  return () => {
    document.removeEventListener("mouseup", onMouseUp);
    document.removeEventListener("keyup", onKeyUp);
  };
}
