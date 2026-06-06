import {
  DEFAULT_CONTENT_SIZE,
  DEFAULT_SANDBOX_BG,
  KEY_CONTENT_FONT,
  KEY_CONTENT_FS,
  KEY_FOOTER_BG,
  KEY_HEADER_BG,
  KEY_HIGHLIGHT,
  KEY_LEGACY_BODY_BG_IMAGE,
  KEY_SAFE_AREA,
  KEY_SAFE_FIT,
  KEY_TITLE_FONT,
  KEY_TITLE_FS,
  KEY_VIEWER_BG_IMAGE,
  KEY_VIEWER_BG_VISIBILITY,
} from "./constants";
import {
  applyViewerBackground,
  getViewerBackgroundVisibility,
  prepareViewerBackgroundImage,
} from "./background";
import {
  applySandboxColors,
  getHighlightColor,
  getStoredColor,
  normalizeHexColor,
} from "./colors";
import {
  clearTitleHighlight,
  createColorPicker,
  createFontField,
  createRangeControl,
  createSandboxColorLabel,
} from "./control-panel-controls";
import { flashButtonText, makeButton, setRangePercent } from "./dom";
import {
  applyFontFamily,
  hydrateFontSelects,
  readFontStorage,
  writeFontStorage,
} from "./fonts";
import { applyContentFontSize } from "./sizing";
import { readIntStorage, readStorage, removeStorage, writeStorage } from "./storage";

type StyleSectionArgs = {
  stage: HTMLElement;
  header: HTMLElement;
  footer: HTMLElement;
  title: HTMLElement;
  body: HTMLElement;
};

type BackgroundSectionArgs = {
  stage: HTMLElement;
  wrap: HTMLElement;
  body: HTMLElement;
};

function createControlRow(className: string) {
  const row = document.createElement("div");
  row.className = `flick-control-row ${className}`;
  return row;
}

function createControlSection() {
  const section = document.createElement("div");
  section.className = "flick-control-section";
  return section;
}

export function createStyleSection(args: StyleSectionArgs) {
  const { stage, header, footer, title, body } = args;
  const section = createControlSection();
  const titleRow = createControlRow("flick-control-row-title");
  const contentSizeRow = createControlRow("flick-control-row-content-size");
  const fontFamilyRow = createControlRow("flick-control-row-fonts");
  const colorRow = createControlRow("flick-control-row-colors");

  const titleSize = createRangeControl(
    "제목",
    parseInt(title.style.fontSize, 10) || 20,
    12,
    72,
    "px"
  );
  const contentSize = createRangeControl(
    "본문크기",
    readIntStorage(KEY_CONTENT_FS, DEFAULT_CONTENT_SIZE, 12, 36),
    12,
    36,
    "px"
  );

  const colorPicker = createColorPicker(getHighlightColor(), "강조색");
  const titleFont = createFontField(
    "제목폰트",
    "로컬에 설치된 제목 폰트",
    "제목 폰트",
    readFontStorage(KEY_TITLE_FONT)
  );
  const contentFont = createFontField(
    "본문폰트",
    "로컬에 설치된 본문 폰트",
    "본문 폰트",
    readFontStorage(KEY_CONTENT_FONT)
  );

  const resetHighlight = makeButton(
    "flick-tool-btn flick-text-tool-btn",
    "제목 강조해제",
    "제목 강조 해제"
  );

  const sandboxColorGroup = document.createElement("div");
  sandboxColorGroup.className = "flick-color-group";
  const headerColorPicker = createColorPicker(
    getStoredColor(KEY_HEADER_BG, DEFAULT_SANDBOX_BG),
    "위쪽 영역 색"
  );
  const footerColorPicker = createColorPicker(
    getStoredColor(KEY_FOOTER_BG, DEFAULT_SANDBOX_BG),
    "아래쪽 영역 색"
  );
  sandboxColorGroup.appendChild(createSandboxColorLabel("위", headerColorPicker));
  sandboxColorGroup.appendChild(createSandboxColorLabel("아래", footerColorPicker));

  titleSize.input.addEventListener("input", () => {
    const value = parseInt(titleSize.input.value, 10);
    if (isNaN(value)) return;
    title.style.fontSize = value + "px";
    titleSize.valueEl.textContent = value + "px";
    writeStorage(KEY_TITLE_FS, String(value));
    setRangePercent(titleSize.input);
  });

  contentSize.input.addEventListener("input", () => {
    const value = parseInt(contentSize.input.value, 10);
    if (isNaN(value)) return;
    applyContentFontSize(body, value);
    contentSize.valueEl.textContent = value + "px";
    writeStorage(KEY_CONTENT_FS, String(value));
    setRangePercent(contentSize.input);
  });

  hydrateFontSelects([titleFont.select, contentFont.select]);
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
  bindFontSelect(titleFont.select, KEY_TITLE_FONT, title);
  bindFontSelect(contentFont.select, KEY_CONTENT_FONT, body);

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
    applySandboxColors(stage, header, footer, title, headerColor, footerColor);
  }
  headerColorPicker.addEventListener("input", updateSandboxColors);
  footerColorPicker.addEventListener("input", updateSandboxColors);
  resetHighlight.addEventListener("click", () => clearTitleHighlight(title));

  titleRow.appendChild(titleSize.group);
  titleRow.appendChild(colorPicker);
  contentSizeRow.appendChild(contentSize.group);
  fontFamilyRow.appendChild(titleFont.field);
  fontFamilyRow.appendChild(contentFont.field);
  colorRow.appendChild(resetHighlight);
  colorRow.appendChild(sandboxColorGroup);

  section.appendChild(titleRow);
  section.appendChild(contentSizeRow);
  section.appendChild(fontFamilyRow);
  section.appendChild(colorRow);
  return section;
}

export function createBackgroundSection(args: BackgroundSectionArgs) {
  const { stage, wrap, body } = args;
  const section = createControlSection();
  const safeAreaRow = createControlRow("flick-control-row-safe-area");
  const backgroundRow = createControlRow("flick-control-row-background");
  const visibilityRow = createControlRow("flick-control-row-visibility");

  const bgVisibility = createRangeControl(
    "배경선명도",
    getViewerBackgroundVisibility(),
    0,
    100,
    "%"
  );
  bgVisibility.group.classList.add("flick-bg-visibility-group");

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
        parseInt(bgVisibility.input.value, 10)
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

  const bgSizeHint = document.createElement("span");
  bgSizeHint.className = "flick-bg-size-hint";
  bgSizeHint.textContent = "권장 1600×900";

  const safeAreaToggle = document.createElement("label");
  safeAreaToggle.className = "flick-switch-field";
  const safeAreaLabel = document.createElement("span");
  safeAreaLabel.textContent = "가이드라인";
  const safeAreaInput = document.createElement("input");
  safeAreaInput.type = "checkbox";
  safeAreaInput.className = "flick-switch-input";
  safeAreaInput.setAttribute("aria-label", "9:16 가이드라인 표시");
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
    "가이드라인 안에 맞추기",
    "본문을 가이드라인 안쪽으로 맞추기"
  );
  const setSafeFit = (enabled: boolean) => {
    body.classList.toggle("flick-body-safe-fit", enabled);
    safeFitButton.classList.toggle("is-active", enabled);
    safeFitButton.setAttribute("aria-pressed", String(enabled));
    writeStorage(KEY_SAFE_FIT, enabled ? "true" : "false");
  };
  setSafeFit(body.classList.contains("flick-body-safe-fit"));
  safeFitButton.addEventListener("click", () => {
    setSafeFit(!body.classList.contains("flick-body-safe-fit"));
  });

  bgVisibility.input.addEventListener("input", () => {
    const value = parseInt(bgVisibility.input.value, 10);
    if (isNaN(value)) return;
    bgVisibility.valueEl.textContent = value + "%";
    writeStorage(KEY_VIEWER_BG_VISIBILITY, String(value));
    setRangePercent(bgVisibility.input);
    applyViewerBackground(wrap, readStorage(KEY_VIEWER_BG_IMAGE), value);
  });

  backgroundGroup.appendChild(bgButton);
  backgroundGroup.appendChild(removeBgButton);
  backgroundGroup.appendChild(bgInput);
  safeAreaRow.appendChild(safeAreaToggle);
  safeAreaRow.appendChild(safeFitButton);
  backgroundRow.appendChild(backgroundGroup);
  backgroundRow.appendChild(bgSizeHint);
  visibilityRow.appendChild(bgVisibility.group);

  section.appendChild(safeAreaRow);
  section.appendChild(backgroundRow);
  section.appendChild(visibilityRow);
  return section;
}
