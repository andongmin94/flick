import type { Block, ExtractResult } from "./types/global";

const KEY_TITLE_FS = "flick:titleFontSize";
const KEY_CONTENT_FS = "flick:contentFontSize";
const KEY_HEADER = "flick:headerHeight";
const KEY_FOOTER = "flick:footerHeight";
const KEY_HIGHLIGHT = "flick:highlightColor";
const KEY_HEADER_BG = "flick:headerBg";
const KEY_FOOTER_BG = "flick:footerBg";
const KEY_VIEWER_BG_IMAGE = "flick:viewerBgImage";
const KEY_VIEWER_BG_VISIBILITY = "flick:viewerBgVisibility";
const KEY_LEGACY_BODY_BG_IMAGE = "flick:bodyBgImage";
const KEY_SAFE_AREA = "flick:safeArea";
const KEY_SAFE_FIT = "flick:safeFit";
const KEY_TITLE_FONT = "flick:titleFont";
const KEY_CONTENT_FONT = "flick:contentFont";
const DEFAULT_HEADER_HEIGHT = 96;
const DEFAULT_FOOTER_HEIGHT = 52;
const DEFAULT_TITLE_SIZE = 20;
const DEFAULT_CONTENT_SIZE = 16;
const DEFAULT_SANDBOX_BG = "#000000";
const MAX_BG_SOURCE_BYTES = 6 * 1024 * 1024;
const MAX_BG_STORED_CHARS = 2_500_000;
const FONT_OPTIONS = [
  { value: "", label: "기본" },
  { value: "Pretendard", label: "Pretendard" },
  { value: "Malgun Gothic", label: "맑은 고딕" },
  { value: "Apple SD Gothic Neo", label: "Apple SD Gothic Neo" },
  { value: "Noto Sans KR", label: "Noto Sans KR" },
  { value: "Nanum Gothic", label: "나눔고딕" },
  { value: "Arial", label: "Arial" },
  { value: "Helvetica", label: "Helvetica" },
  { value: "Georgia", label: "Georgia" },
  { value: "Times New Roman", label: "Times New Roman" },
  { value: "Courier New", label: "Courier New" },
];

let activeCleanups: Array<() => void> = [];
let localFontFamiliesPromise: Promise<string[]> | null = null;

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

function removeStorage(key: string) {
  try {
    localStorage.removeItem(key);
  } catch (_) {}
}

function cleanFontName(value: string | null) {
  return (value || "")
    .replace(/[\r\n\t]/g, " ")
    .replace(/[;"'`{}<>\\]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 80);
}

function quoteFontFamily(fontName: string) {
  return `"${fontName.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
}

function applyFontFamily(target: HTMLElement, fontName: string) {
  const cleaned = cleanFontName(fontName);
  if (!cleaned) {
    target.style.removeProperty("font-family");
    return;
  }
  target.style.fontFamily = `${quoteFontFamily(cleaned)}, var(--shorts-font), sans-serif`;
}

function readFontStorage(key: string) {
  return cleanFontName(readStorage(key));
}

function writeFontStorage(key: string, value: string) {
  const cleaned = cleanFontName(value);
  if (cleaned) writeStorage(key, cleaned);
  else removeStorage(key);
  return cleaned;
}

function setFontSelectOptions(
  select: HTMLSelectElement,
  selectedValue: string,
  localFonts: string[] = []
) {
  const selected = cleanFontName(selectedValue);
  const options = new Map<string, string>();
  FONT_OPTIONS.forEach((option) => options.set(option.value, option.label));
  localFonts.forEach((font) => {
    const cleaned = cleanFontName(font);
    if (cleaned && !options.has(cleaned)) options.set(cleaned, cleaned);
  });
  if (selected && !options.has(selected)) options.set(selected, selected);

  select.replaceChildren();
  options.forEach((label, value) => {
    const option = document.createElement("option");
    option.value = value;
    option.textContent = label;
    select.appendChild(option);
  });
  select.value = selected;
}

async function readLocalFontFamilies() {
  if (!localFontFamiliesPromise) {
    localFontFamiliesPromise = (async () => {
      const fontWindow = window as Window & {
        queryLocalFonts?: () => Promise<Array<{ family?: string }>>;
      };
      if (!fontWindow.queryLocalFonts) return [];
      const fonts = await fontWindow.queryLocalFonts();
      const families = new Set<string>();
      fonts.forEach((font) => {
        const family = cleanFontName(font.family || "");
        if (family) families.add(family);
      });
      return Array.from(families).sort((a, b) => a.localeCompare(b, "ko"));
    })().catch(() => []);
  }
  return localFontFamiliesPromise;
}

function hydrateFontSelects(selects: HTMLSelectElement[]) {
  const hydrate = async () => {
    const localFonts = await readLocalFontFamilies();
    if (!localFonts.length) return;
    selects.forEach((select) => {
      const currentValue = select.value;
      setFontSelectOptions(select, currentValue, localFonts);
    });
  };
  selects.forEach((select) => {
    select.addEventListener("pointerdown", hydrate);
    select.addEventListener("focus", hydrate);
  });
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
  return "#ffd60a";
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
  div.contentEditable = "plaintext-only";
  div.spellcheck = false;
  div.title = "본문 수정 가능";
  div.setAttribute("aria-label", "본문 텍스트 수정");
  div.addEventListener("paste", pastePlainText);
  return div;
}

function pastePlainText(event: ClipboardEvent) {
  const text = event.clipboardData?.getData("text/plain");
  if (text == null) return;
  event.preventDefault();
  const selection = window.getSelection();
  if (!selection || !selection.rangeCount) return;
  selection.deleteFromDocument();
  selection.getRangeAt(0).insertNode(document.createTextNode(text));
  selection.collapseToEnd();
}

function isEditableTarget(target: Element | null, wrap: HTMLElement) {
  if (!(target instanceof HTMLElement)) return false;
  if (!wrap.contains(target)) return false;
  return target.isContentEditable;
}

function applyBlockSpacing(el: HTMLElement, block: Block) {
  if (block.gapAfter) el.classList.add("flick-block-gap-after");
  return el;
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
    return applyBlockSpacing(container, block);
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
    return applyBlockSpacing(container, block);
  }

  if (block.type === "text") {
    const el = createTextBlock(block.text);
    return el ? applyBlockSpacing(el, block) : null;
  }

  if (block.type === "trusted-html") {
    const div = document.createElement("div");
    div.className = "flick-block";
    div.innerHTML = block.html;
    return applyBlockSpacing(div, block);
  }

  const el = createTextBlock(legacyHtmlToText(block.html));
  return el ? applyBlockSpacing(el, block) : null;
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

function applyStoredFonts(title: HTMLElement, body: HTMLElement) {
  applyFontFamily(title, readFontStorage(KEY_TITLE_FONT));
  applyFontFamily(body, readFontStorage(KEY_CONTENT_FONT));
}

function applyContentFontSize(body: HTMLElement, size: number) {
  body.style.setProperty("--flick-content-font-size", size + "px");
}

function applyStoredContentFontSize(body: HTMLElement) {
  applyContentFontSize(
    body,
    readIntStorage(KEY_CONTENT_FS, DEFAULT_CONTENT_SIZE, 12, 36)
  );
}

function applyStoredSafeFit(body: HTMLElement) {
  body.classList.toggle(
    "flick-body-safe-fit",
    readStorage(KEY_SAFE_FIT) === "true"
  );
}

function getViewerBackgroundVisibility() {
  return readIntStorage(KEY_VIEWER_BG_VISIBILITY, 100, 0, 100);
}

function applyViewerBackground(
  wrap: HTMLElement,
  imageData: string | null,
  visibility = getViewerBackgroundVisibility()
) {
  if (!imageData) {
    wrap.classList.remove("flick-wrap-has-bg-image");
    wrap.style.removeProperty("background-image");
    wrap.style.removeProperty("background-size");
    wrap.style.removeProperty("background-position");
    wrap.style.removeProperty("background-repeat");
    return;
  }

  wrap.classList.add("flick-wrap-has-bg-image");
  const overlayAlpha = Math.max(0, Math.min(1, (100 - visibility) / 100));
  wrap.style.backgroundImage = `linear-gradient(rgba(255, 255, 255, ${overlayAlpha}), rgba(255, 255, 255, ${overlayAlpha})), url("${imageData}")`;
  wrap.style.backgroundSize = "cover, cover";
  wrap.style.backgroundPosition = "center, center";
  wrap.style.backgroundRepeat = "no-repeat, no-repeat";
}

function applyStoredViewerBackground(wrap: HTMLElement) {
  removeStorage(KEY_LEGACY_BODY_BG_IMAGE);
  applyViewerBackground(wrap, readStorage(KEY_VIEWER_BG_IMAGE));
}

function loadImage(file: File) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("이미지를 읽지 못했습니다."));
    };
    img.src = url;
  });
}

async function prepareViewerBackgroundImage(file: File) {
  if (!file.type.startsWith("image/")) {
    throw new Error("이미지 파일만 사용할 수 있습니다.");
  }
  if (file.size > MAX_BG_SOURCE_BYTES) {
    throw new Error("6MB 이하 이미지만 사용할 수 있습니다.");
  }

  const img = await loadImage(file);
  const maxSide = 1600;
  const scale = Math.min(1, maxSide / Math.max(img.naturalWidth, img.naturalHeight));
  const width = Math.max(1, Math.round(img.naturalWidth * scale));
  const height = Math.max(1, Math.round(img.naturalHeight * scale));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("이미지를 처리하지 못했습니다.");
  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, width, height);
  context.drawImage(img, 0, 0, width, height);
  const dataUrl = canvas.toDataURL("image/jpeg", 0.84);
  if (dataUrl.length > MAX_BG_STORED_CHARS) {
    throw new Error("이미지를 더 작게 줄여서 사용해 주세요.");
  }
  return dataUrl;
}

function flashButtonText(
  button: HTMLButtonElement,
  text: string,
  restoreText: string
) {
  button.textContent = text;
  window.setTimeout(() => {
    button.textContent = restoreText;
  }, 1400);
}

export function buildUI(data: ExtractResult) {
  if (document.querySelector(".flick-wrap-injected")) return;
  runCleanups();

  const wrap = document.createElement("div");
  wrap.className = "flick-wrap-injected";
  applyStoredViewerBackground(wrap);
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
  applyStoredFonts(title, body);
  applyStoredContentFontSize(body);
  applyStoredSafeFit(body);

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
    wrap,
    header,
    footer,
    title,
    body,
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
    if (isEditableTarget(document.activeElement, wrap)) {
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
  wrap: HTMLElement;
  header: HTMLElement;
  footer: HTMLElement;
  title: HTMLElement;
  body: HTMLElement;
}) {
  const { data, stage, wrap, header, footer, title, body } = args;
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

  const titleRow = document.createElement("div");
  titleRow.className = "flick-control-row flick-control-row-title";

  const colorRow = document.createElement("div");
  colorRow.className = "flick-control-row flick-control-row-colors";

  const fontFamilyRow = document.createElement("div");
  fontFamilyRow.className = "flick-control-row flick-control-row-fonts";

  const contentSizeRow = document.createElement("div");
  contentSizeRow.className =
    "flick-control-row flick-control-row-content-size";

  const backgroundRow = document.createElement("div");
  backgroundRow.className = "flick-control-row flick-control-row-background";

  const safeAreaRow = document.createElement("div");
  safeAreaRow.className = "flick-control-row flick-control-row-safe-area";

  const visibilityRow = document.createElement("div");
  visibilityRow.className = "flick-control-row flick-control-row-visibility";

  const styleSection = document.createElement("div");
  styleSection.className = "flick-control-section";
  const backgroundSection = document.createElement("div");
  backgroundSection.className = "flick-control-section";

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

  const contentSizeGroup = document.createElement("label");
  contentSizeGroup.className = "flick-range-group";
  const contentSizeLabel = document.createElement("span");
  contentSizeLabel.textContent = "본문크기";
  const contentSizeInput = document.createElement("input");
  contentSizeInput.type = "range";
  contentSizeInput.min = "12";
  contentSizeInput.max = "36";
  contentSizeInput.step = "1";
  contentSizeInput.className = "flick-fontsize-input";
  const currentContentSize = readIntStorage(
    KEY_CONTENT_FS,
    DEFAULT_CONTENT_SIZE,
    12,
    36
  );
  contentSizeInput.value = String(currentContentSize);
  const contentSizeValue = document.createElement("span");
  contentSizeValue.className = "flick-fontsize-val";
  contentSizeValue.textContent = currentContentSize + "px";
  contentSizeGroup.appendChild(contentSizeLabel);
  contentSizeGroup.appendChild(contentSizeInput);
  contentSizeGroup.appendChild(contentSizeValue);

  const colorPicker = document.createElement("input");
  colorPicker.type = "color";
  colorPicker.className = "flick-hl-picker-main";
  colorPicker.value = getHighlightColor();
  colorPicker.title = "강조색";
  colorPicker.setAttribute("aria-label", "강조색");

  const titleFontField = document.createElement("label");
  titleFontField.className = "flick-font-field";
  const titleFontLabel = document.createElement("span");
  titleFontLabel.textContent = "제목폰트";
  const titleFontSelect = document.createElement("select");
  titleFontSelect.className = "flick-font-select";
  titleFontSelect.title = "로컬에 설치된 제목 폰트";
  titleFontSelect.setAttribute("aria-label", "제목 폰트");
  setFontSelectOptions(titleFontSelect, readFontStorage(KEY_TITLE_FONT));
  titleFontField.appendChild(titleFontLabel);
  titleFontField.appendChild(titleFontSelect);

  const contentFontField = document.createElement("label");
  contentFontField.className = "flick-font-field";
  const contentFontLabel = document.createElement("span");
  contentFontLabel.textContent = "본문폰트";
  const contentFontSelect = document.createElement("select");
  contentFontSelect.className = "flick-font-select";
  contentFontSelect.title = "로컬에 설치된 본문 폰트";
  contentFontSelect.setAttribute("aria-label", "본문 폰트");
  setFontSelectOptions(contentFontSelect, readFontStorage(KEY_CONTENT_FONT));
  contentFontField.appendChild(contentFontLabel);
  contentFontField.appendChild(contentFontSelect);

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

  const backgroundGroup = document.createElement("div");
  backgroundGroup.className = "flick-bg-control-group";
  const bgInput = document.createElement("input");
  bgInput.type = "file";
  bgInput.accept = "image/*";
  bgInput.className = "flick-hidden-file-input";
  const hasViewerBg = !!readStorage(KEY_VIEWER_BG_IMAGE);
  const defaultBgButtonText = "전체 배경";
  const bgButton = makeButton(
    "flick-background-action",
    defaultBgButtonText,
    "전체 배경 이미지 선택"
  );
  const removeBgButton = makeButton(
    "flick-tool-btn flick-text-tool-btn flick-bg-remove-btn",
    "배경삭제",
    "전체 배경 이미지 삭제"
  );
  removeBgButton.disabled = !hasViewerBg;
  bgButton.addEventListener("click", () => bgInput.click());
  bgInput.addEventListener("change", async () => {
    const file = bgInput.files?.[0];
    if (!file) return;
    const originalText = bgButton.textContent || defaultBgButtonText;
    bgButton.disabled = true;
    bgButton.textContent = "처리중";
    try {
      const dataUrl = await prepareViewerBackgroundImage(file);
      writeStorage(KEY_VIEWER_BG_IMAGE, dataUrl);
      applyViewerBackground(
        wrap,
        dataUrl,
        parseInt(bgVisibilityInput.value, 10)
      );
      bgButton.textContent = defaultBgButtonText;
      removeBgButton.disabled = false;
    } catch (error) {
      flashButtonText(
        bgButton,
        error instanceof Error ? error.message : "실패",
        originalText
      );
    } finally {
      bgInput.value = "";
      bgButton.disabled = false;
      if (bgButton.textContent === "처리중") bgButton.textContent = originalText;
    }
  });
  removeBgButton.addEventListener("click", () => {
    removeStorage(KEY_VIEWER_BG_IMAGE);
    removeStorage(KEY_LEGACY_BODY_BG_IMAGE);
    applyViewerBackground(wrap, null);
    bgButton.textContent = defaultBgButtonText;
    removeBgButton.disabled = true;
  });
  backgroundGroup.appendChild(bgButton);
  backgroundGroup.appendChild(removeBgButton);
  backgroundGroup.appendChild(bgInput);

  const bgVisibilityGroup = document.createElement("label");
  bgVisibilityGroup.className = "flick-range-group flick-bg-visibility-group";
  const bgVisibilityLabel = document.createElement("span");
  bgVisibilityLabel.textContent = "배경선명도";
  const bgVisibilityInput = document.createElement("input");
  bgVisibilityInput.type = "range";
  bgVisibilityInput.min = "0";
  bgVisibilityInput.max = "100";
  bgVisibilityInput.step = "1";
  bgVisibilityInput.className = "flick-fontsize-input";
  bgVisibilityInput.value = String(getViewerBackgroundVisibility());
  const bgVisibilityValue = document.createElement("span");
  bgVisibilityValue.className = "flick-fontsize-val";
  bgVisibilityValue.textContent = bgVisibilityInput.value + "%";
  bgVisibilityGroup.appendChild(bgVisibilityLabel);
  bgVisibilityGroup.appendChild(bgVisibilityInput);
  bgVisibilityGroup.appendChild(bgVisibilityValue);

  const safeAreaToggle = document.createElement("label");
  safeAreaToggle.className = "flick-switch-field";
  const safeAreaLabel = document.createElement("span");
  safeAreaLabel.textContent = "안전영역";
  const safeAreaInput = document.createElement("input");
  safeAreaInput.type = "checkbox";
  safeAreaInput.className = "flick-switch-input";
  safeAreaInput.setAttribute("aria-label", "9:16 안전영역 표시");
  const safeAreaTrack = document.createElement("span");
  safeAreaTrack.className = "flick-switch-track";
  safeAreaToggle.appendChild(safeAreaLabel);
  safeAreaToggle.appendChild(safeAreaInput);
  safeAreaToggle.appendChild(safeAreaTrack);
  const setSafeArea = (enabled: boolean) => {
    stage.classList.toggle("flick-safe-area-on", enabled);
    safeAreaInput.checked = enabled;
    writeStorage(KEY_SAFE_AREA, enabled ? "true" : "false");
  };
  setSafeArea(stage.classList.contains("flick-safe-area-on"));
  safeAreaInput.addEventListener("change", () => {
    setSafeArea(safeAreaInput.checked);
  });

  const safeFitButton = makeButton(
    "flick-tool-btn flick-text-tool-btn flick-safe-fit-btn",
    "안전영역 안에 맞추기",
    "본문을 안전영역 안쪽으로 맞추기"
  );
  const setSafeFit = (enabled: boolean) => {
    body.classList.toggle("flick-body-safe-fit", enabled);
    safeFitButton.classList.toggle("is-active", enabled);
    safeFitButton.setAttribute("aria-pressed", String(enabled));
    writeStorage(KEY_SAFE_FIT, enabled ? "true" : "false");
    if (enabled) setSafeArea(true);
  };
  setSafeFit(body.classList.contains("flick-body-safe-fit"));
  safeFitButton.addEventListener("click", () => {
    setSafeFit(!body.classList.contains("flick-body-safe-fit"));
  });

  setRangePercent(fontInput);
  setRangePercent(contentSizeInput);
  setRangePercent(bgVisibilityInput);
  fontInput.addEventListener("input", () => {
    const value = parseInt(fontInput.value, 10);
    if (isNaN(value)) return;
    title.style.fontSize = value + "px";
    fontValue.textContent = value + "px";
    writeStorage(KEY_TITLE_FS, String(value));
    setRangePercent(fontInput);
  });

  contentSizeInput.addEventListener("input", () => {
    const value = parseInt(contentSizeInput.value, 10);
    if (isNaN(value)) return;
    applyContentFontSize(body, value);
    contentSizeValue.textContent = value + "px";
    writeStorage(KEY_CONTENT_FS, String(value));
    setRangePercent(contentSizeInput);
  });

  bgVisibilityInput.addEventListener("input", () => {
    const value = parseInt(bgVisibilityInput.value, 10);
    if (isNaN(value)) return;
    bgVisibilityValue.textContent = value + "%";
    writeStorage(KEY_VIEWER_BG_VISIBILITY, String(value));
    setRangePercent(bgVisibilityInput);
    applyViewerBackground(wrap, readStorage(KEY_VIEWER_BG_IMAGE), value);
  });

  hydrateFontSelects([titleFontSelect, contentFontSelect]);

  const bindFontSelect = (
    select: HTMLSelectElement,
    key: string,
    target: HTMLElement
  ) => {
    const update = () => {
      const fontName = writeFontStorage(key, select.value);
      applyFontFamily(target, fontName);
    };
    select.addEventListener("change", update);
  };
  bindFontSelect(titleFontSelect, KEY_TITLE_FONT, title);
  bindFontSelect(contentFontSelect, KEY_CONTENT_FONT, body);

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

  titleRow.appendChild(fontGroup);
  titleRow.appendChild(colorPicker);
  fontFamilyRow.appendChild(titleFontField);
  fontFamilyRow.appendChild(contentFontField);
  contentSizeRow.appendChild(contentSizeGroup);
  colorRow.appendChild(resetHighlight);
  colorRow.appendChild(sandboxColorGroup);
  backgroundRow.appendChild(backgroundGroup);
  safeAreaRow.appendChild(safeFitButton);
  safeAreaRow.appendChild(safeAreaToggle);
  visibilityRow.appendChild(bgVisibilityGroup);

  styleSection.appendChild(titleRow);
  styleSection.appendChild(contentSizeRow);
  styleSection.appendChild(fontFamilyRow);
  styleSection.appendChild(colorRow);
  backgroundSection.appendChild(backgroundRow);
  backgroundSection.appendChild(safeAreaRow);
  backgroundSection.appendChild(visibilityRow);

  panel.appendChild(topRow);
  panel.appendChild(styleSection);
  panel.appendChild(backgroundSection);

  return { panel };
}

function setRangePercent(input: HTMLInputElement) {
  const min = parseFloat(input.min) || 0;
  const max = parseFloat(input.max) || 100;
  const value = parseFloat(input.value) || min;
  const percent = ((value - min) / (max - min)) * 100;
  input.style.setProperty("--_percent", percent + "%");
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
