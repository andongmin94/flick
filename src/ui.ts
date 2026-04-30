import type { Block, ExtractResult } from "./types/global";

type LayoutPresetId = "balanced" | "headline" | "caption";
type ThemePresetId = "classic" | "paper" | "dark";

type NavControls = {
  prevButton: HTMLButtonElement;
  nextButton: HTMLButtonElement;
  progress: HTMLElement;
};

const KEY_TITLE_FS = "flick:titleFontSize";
const KEY_HEADER = "flick:headerHeight";
const KEY_FOOTER = "flick:footerHeight";
const KEY_HIGHLIGHT = "flick:highlightColor";
const KEY_LAYOUT = "flick:layoutPreset";
const KEY_THEME = "flick:themePreset";
const KEY_SAFE_AREA = "flick:safeArea";

const LAYOUT_PRESETS: Record<
  LayoutPresetId,
  { label: string; header: number; footer: number; titleSize: number }
> = {
  balanced: { label: "기본", header: 96, footer: 52, titleSize: 20 },
  headline: { label: "제목", header: 152, footer: 36, titleSize: 28 },
  caption: { label: "자막", header: 64, footer: 124, titleSize: 18 },
};

const THEME_PRESETS: Record<
  ThemePresetId,
  {
    label: string;
    swatch: string;
    overlay: string;
    stage: string;
    fg: string;
    header: string;
    footer: string;
    font: string;
  }
> = {
  classic: {
    label: "기본",
    swatch: "linear-gradient(135deg,#111 0 50%,#fff 50% 100%)",
    overlay: "#ffffff",
    stage: "#ffffff",
    fg: "#222222",
    header: "#000000",
    footer: "#000000",
    font: "Pretendard, system-ui, -apple-system, BlinkMacSystemFont, sans-serif",
  },
  paper: {
    label: "밝게",
    swatch: "linear-gradient(135deg,#f8f8f2 0 50%,#17324d 50% 100%)",
    overlay: "#22272e",
    stage: "#f8f8f2",
    fg: "#202124",
    header: "#17324d",
    footer: "#17324d",
    font: "Pretendard, system-ui, -apple-system, BlinkMacSystemFont, sans-serif",
  },
  dark: {
    label: "어둡게",
    swatch: "linear-gradient(135deg,#050505 0 50%,#f4d35e 50% 100%)",
    overlay: "#050505",
    stage: "#111111",
    fg: "#f4f4f4",
    header: "#000000",
    footer: "#000000",
    font: "Pretendard, system-ui, -apple-system, BlinkMacSystemFont, sans-serif",
  },
};

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

function isLayoutPreset(value: string | null): value is LayoutPresetId {
  return !!value && value in LAYOUT_PRESETS;
}

function isThemePreset(value: string | null): value is ThemePresetId {
  return !!value && value in THEME_PRESETS;
}

function getLayoutPreset(): LayoutPresetId {
  const stored = readStorage(KEY_LAYOUT);
  return isLayoutPreset(stored) ? stored : "balanced";
}

function getThemePreset(): ThemePresetId {
  const stored = readStorage(KEY_THEME);
  return isThemePreset(stored) ? stored : "classic";
}

function getHighlightColor() {
  const stored = readStorage(KEY_HIGHLIGHT);
  if (stored && /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(stored)) return stored;
  return "#ffff00";
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

function applyTheme(
  wrap: HTMLElement,
  stage: HTMLElement,
  presetId: ThemePresetId
) {
  const preset = THEME_PRESETS[presetId];
  wrap.style.setProperty("--shorts-overlay-bg", preset.overlay);
  wrap.style.setProperty("--shorts-font", preset.font);
  stage.style.setProperty("--shorts-stage-bg", preset.stage);
  stage.style.setProperty("--shorts-fg", preset.fg);
  stage.style.setProperty("--shorts-header-bg", preset.header);
  stage.style.setProperty("--shorts-footer-bg", preset.footer);
}

function applyLayout(
  header: HTMLElement,
  footer: HTMLElement,
  title: HTMLElement,
  presetId: LayoutPresetId
) {
  const preset = LAYOUT_PRESETS[presetId];
  header.style.height = preset.header + "px";
  footer.style.height = preset.footer + "px";
  title.style.fontSize = preset.titleSize + "px";
  writeStorage(KEY_HEADER, String(preset.header));
  writeStorage(KEY_FOOTER, String(preset.footer));
  writeStorage(KEY_TITLE_FS, String(preset.titleSize));
  writeStorage(KEY_LAYOUT, presetId);
}

function applyStoredSizing(
  header: HTMLElement,
  footer: HTMLElement,
  title: HTMLElement
) {
  const preset = LAYOUT_PRESETS[getLayoutPreset()];
  header.style.height =
    readIntStorage(KEY_HEADER, preset.header, 20, 360) + "px";
  footer.style.height =
    readIntStorage(KEY_FOOTER, preset.footer, 16, 260) + "px";
  title.style.fontSize =
    readIntStorage(KEY_TITLE_FS, preset.titleSize, 12, 72) + "px";
}

function siteLabel(siteId?: string) {
  const labels: Record<string, string> = {
    fmkorea: "펨코",
    dcinside: "디시",
    navercafe: "네이버 카페",
    dogdrip: "도그드립",
  };
  return siteId ? labels[siteId] || siteId : "지원 사이트";
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
  applyTheme(wrap, stage, getThemePreset());

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
  const renderedCount = renderBlocks(body, data);

  const footer = document.createElement("div");
  footer.className = "flick-footer";
  const footerStatus = document.createElement("div");
  footerStatus.className = "flick-footer-status";
  footerStatus.textContent =
    data.status === "empty" || data.blocks.length === 0
      ? `${siteLabel(data.siteId)} · 본문 없음`
      : `${siteLabel(data.siteId)} · ${data.blocks.length}개`;
  footer.appendChild(footerStatus);

  applyStoredSizing(header, footer, title);

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
    wrap,
    stage,
    header,
    footer,
    title,
    renderedCount,
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
  setupBlockNavigation(body, controls.nav);
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
  wrap: HTMLElement;
  stage: HTMLElement;
  header: HTMLElement;
  footer: HTMLElement;
  title: HTMLElement;
  renderedCount: number;
}) {
  const { data, wrap, stage, header, footer, title, renderedCount } = args;
  const panel = document.createElement("div");
  panel.className = "flick-control-panel";

  const topRow = document.createElement("div");
  topRow.className = "flick-control-row flick-control-row-main";

  const sourceButton = makeButton("flick-tool-btn", "↗", "원본 글 열기");
  const prevButton = makeButton("flick-tool-btn", "↑", "이전 블록");
  const nextButton = makeButton("flick-tool-btn", "↓", "다음 블록");
  const closeButton = makeButton("flick-tool-btn flick-tool-btn-close", "×", "닫기");
  const progress = document.createElement("span");
  progress.className = "flick-progress-pill";
  progress.textContent = `1/${renderedCount}`;

  sourceButton.addEventListener("click", () => {
    window.open(data.sourceUrl || location.href, "_blank", "noopener,noreferrer");
  });
  closeButton.addEventListener("click", closeShorts);

  topRow.appendChild(sourceButton);
  topRow.appendChild(prevButton);
  topRow.appendChild(progress);
  topRow.appendChild(nextButton);
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
    "강조해제",
    "제목 강조 해제"
  );

  const layoutGroup = document.createElement("div");
  layoutGroup.className = "flick-segment-group";

  const setLayoutActive = (activeId: LayoutPresetId | null) => {
    layoutGroup
      .querySelectorAll<HTMLButtonElement>(".flick-segment-btn")
      .forEach((button) => {
        button.classList.toggle("is-active", button.dataset.value === activeId);
      });
  };

  (Object.keys(LAYOUT_PRESETS) as LayoutPresetId[]).forEach((presetId) => {
    const preset = LAYOUT_PRESETS[presetId];
    const button = makeButton(
      "flick-segment-btn",
      preset.label,
      `${preset.label} 레이아웃`
    );
    button.dataset.value = presetId;
    button.addEventListener("click", () => {
      applyLayout(header, footer, title, presetId);
      fontInput.value = String(preset.titleSize);
      fontValue.textContent = preset.titleSize + "px";
      setRangePercent(fontInput);
      setLayoutActive(presetId);
    });
    layoutGroup.appendChild(button);
  });
  setLayoutActive(getLayoutPreset());

  const themeGroup = document.createElement("div");
  themeGroup.className = "flick-swatch-group";

  const setThemeActive = (activeId: ThemePresetId) => {
    themeGroup
      .querySelectorAll<HTMLButtonElement>(".flick-swatch-btn")
      .forEach((button) => {
        button.classList.toggle("is-active", button.dataset.value === activeId);
      });
  };

  (Object.keys(THEME_PRESETS) as ThemePresetId[]).forEach((presetId) => {
    const preset = THEME_PRESETS[presetId];
    const button = makeButton("flick-swatch-btn", "", `${preset.label} 배경`);
    button.dataset.value = presetId;
    button.style.background = preset.swatch;
    button.addEventListener("click", () => {
      applyTheme(wrap, stage, presetId);
      writeStorage(KEY_THEME, presetId);
      setThemeActive(presetId);
    });
    themeGroup.appendChild(button);
  });
  setThemeActive(getThemePreset());

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
  toolRow.appendChild(layoutGroup);
  toolRow.appendChild(themeGroup);
  toolRow.appendChild(safeAreaButton);

  panel.appendChild(topRow);
  panel.appendChild(toolRow);

  return {
    panel,
    nav: {
      prevButton,
      nextButton,
      progress,
    },
  };
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

function setupBlockNavigation(body: HTMLElement, controls: NavControls) {
  let currentIndex = 0;
  let raf = 0;

  const getBlocks = () =>
    Array.from(body.querySelectorAll<HTMLElement>(".flick-block"));

  const setProgress = (index: number, total: number) => {
    currentIndex = Math.max(0, Math.min(Math.max(total - 1, 0), index));
    controls.progress.textContent = `${currentIndex + 1}/${total}`;
    controls.prevButton.disabled = currentIndex <= 0;
    controls.nextButton.disabled = currentIndex >= total - 1;
  };

  const update = () => {
    const blocks = getBlocks();
    if (blocks.length === 0) {
      controls.progress.textContent = "0/0";
      controls.prevButton.disabled = true;
      controls.nextButton.disabled = true;
      return;
    }

    const bodyRect = body.getBoundingClientRect();
    const anchor = bodyRect.top + 8;
    let nearest = 0;
    let nearestDistance = Number.POSITIVE_INFINITY;
    blocks.forEach((block, index) => {
      const rect = block.getBoundingClientRect();
      const distance = Math.abs(rect.top - anchor);
      if (distance < nearestDistance) {
        nearest = index;
        nearestDistance = distance;
      }
    });

    setProgress(nearest, blocks.length);
  };

  const requestUpdate = () => {
    if (raf) cancelAnimationFrame(raf);
    raf = requestAnimationFrame(update);
  };

  const scrollToIndex = (index: number) => {
    const blocks = getBlocks();
    const next = Math.max(0, Math.min(blocks.length - 1, index));
    const target = blocks[next];
    if (target) {
      body.scrollTo({
        top: target.offsetTop - body.offsetTop,
        behavior: "smooth",
      });
    }
    setProgress(next, blocks.length);
    requestUpdate();
  };

  controls.prevButton.addEventListener("click", () =>
    scrollToIndex(currentIndex - 1)
  );
  controls.nextButton.addEventListener("click", () =>
    scrollToIndex(currentIndex + 1)
  );
  body.addEventListener("scroll", requestUpdate, { passive: true });

  const onKeyDown = (event: KeyboardEvent) => {
    const target = event.target as HTMLElement | null;
    if (
      target?.isContentEditable ||
      target?.tagName === "INPUT" ||
      target?.tagName === "TEXTAREA"
    ) {
      return;
    }
    if (event.key === "ArrowUp") {
      event.preventDefault();
      scrollToIndex(currentIndex - 1);
    } else if (event.key === "ArrowDown") {
      event.preventDefault();
      scrollToIndex(currentIndex + 1);
    }
  };
  addDocumentListener("keydown", onKeyDown);
  addCleanup(() => {
    body.removeEventListener("scroll", requestUpdate);
    controls.prevButton.disabled = true;
    controls.nextButton.disabled = true;
    if (raf) cancelAnimationFrame(raf);
  });

  setTimeout(update, 0);
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
