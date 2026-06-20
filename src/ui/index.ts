import type { ExtractResult } from "../types/global";
import { applyStoredViewerBackground } from "./background";
import { renderBlocks } from "./blocks";
import { applyStoredSandboxColors } from "./colors";
import { createControlPanel } from "./control-panel";
import { KEY_SAFE_AREA } from "./constants";
import { enableAutoHighlight } from "./highlight";
import { setupResize } from "./resize";
import {
  applyStoredContentFontSize,
  applyStoredFonts,
  applyStoredSafeFit,
  applyStoredSizing,
} from "./sizing";
import { readStorage } from "./storage";

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
  options?: boolean | AddEventListenerOptions,
) {
  window.addEventListener(type, listener as EventListener, options);
  addCleanup(() =>
    window.removeEventListener(type, listener as EventListener, options),
  );
}

function addDocumentListener<K extends keyof DocumentEventMap>(
  type: K,
  listener: (event: DocumentEventMap[K]) => void,
  options?: boolean | AddEventListenerOptions,
) {
  document.addEventListener(type, listener as EventListener, options);
  addCleanup(() =>
    document.removeEventListener(type, listener as EventListener, options),
  );
}

function isEditableTarget(target: Element | null, wrap: HTMLElement) {
  if (!(target instanceof HTMLElement)) return false;
  if (!wrap.contains(target)) return false;
  return target.isContentEditable;
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
  applyStoredSandboxColors(stage, header, footer, title);
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
    onClose: closeShorts,
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
  (["keydown", "keypress", "keyup"] as const).forEach((type) =>
    addWindowListener(type, suppress, true),
  );

  addCleanup(setupResize(stage, header, footer));
  addCleanup(enableAutoHighlight(title));

  window.dispatchEvent(new CustomEvent("flick:shortschange", { detail: true }));
}

export function closeShorts() {
  const wrap = document.querySelector(".flick-wrap-injected");
  runCleanups();
  wrap?.remove();
  document.body.classList.remove("flick-body-lock");
  document.querySelector(".flick-control-panel")?.remove();
  window.dispatchEvent(
    new CustomEvent("flick:shortschange", { detail: false }),
  );
}
