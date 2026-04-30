// src/entry.ts (bundle entry)
import {
  isSupportedArticle,
  getActiveSiteConfig,
  extractActive,
  runPreHook,
  runPostMountedHook,
} from "./rules/index";
import { buildUI, closeShorts } from "./ui";
import "./styles/styles.css"; // aggregate all CSS for single bundle
import type { ExtractResult } from "./types/global";

type ToggleState =
  | "ready"
  | "open"
  | "loading"
  | "empty"
  | "error"
  | "unsupported";

const flickRuntime = window as Window & {
  __flickHistoryPatched?: boolean;
  __flickRouteWatcherInstalled?: boolean;
};

// attach minimal API (still provide __FLICK for backward compatibility)
const API = {
  isSupportedArticle,
  getActiveSiteConfig,
  extractPost: extractActive,
  buildUI,
  closeShorts,
};
window.FLICK = API;

function openShorts() {
  if (!isSupportedArticle()) {
    setToggleState("unsupported", "게시글 아님");
    return;
  }

  setToggleState("loading", "불러오는 중");
  try {
    runPreHook();
    const data: ExtractResult = extractActive();
    buildUI(data);
    runPostMountedHook();
    setToggleState(
      data.status === "error"
        ? "error"
        : data.status === "empty"
          ? "empty"
          : "open"
    );
  } catch (error) {
    console.error("[FLICK open error]", error);
    setToggleState("error", "열기 실패");
  }
}

function ensureButton() {
  if (!getActiveSiteConfig()) return;
  if (document.querySelector(".flick-toggle-wrapper")) return;
  const wrap = document.createElement("div");
  wrap.className = "flick-toggle-wrapper";

  const logo = document.createElement("button");
  logo.type = "button";
  logo.className = "flick-logo-badge";
  logo.textContent = "FLICK"; // 필요시 SVG나 이미지로 교체
  logo.title = "쇼츠 보기/닫기"; // 시각적 텍스트는 붙이지 않음
  logo.addEventListener("click", () => {
    if (!isSupportedArticle()) {
      setToggleState("unsupported", "게시글 아님");
      return;
    }
    const open = !!document.querySelector(".flick-wrap-injected");
    open ? closeShorts() : openShorts();
    updateBtn();
  });
  const status = document.createElement("div");
  status.className = "flick-toggle-status";
  wrap.appendChild(logo);
  wrap.appendChild(status);
  document.body.appendChild(wrap);
  updateBtn();
}

function setToggleState(state: ToggleState, message?: string) {
  const open = !!document.querySelector(".flick-wrap-injected");
  const logo = document.querySelector<HTMLButtonElement>(".flick-logo-badge");
  if (logo) {
    const openValue = open ? "true" : "false";
    const disabled = state === "loading" || state === "unsupported";
    if (logo.dataset.state !== state) logo.dataset.state = state;
    if (logo.dataset.open !== openValue) logo.dataset.open = openValue;
    if (logo.disabled !== disabled) logo.disabled = disabled;
    if (logo.getAttribute("aria-pressed") !== openValue) {
      logo.setAttribute("aria-pressed", openValue);
    }
  }
  const status = document.querySelector<HTMLElement>(".flick-toggle-status");
  if (status) {
    const statusText =
      message ||
      {
        ready: "열 수 있음",
        open: "열림",
        loading: "불러오는 중",
        empty: "본문 없음",
        error: "실패",
        unsupported: "게시글 아님",
      }[state];
    if (status.textContent !== statusText) status.textContent = statusText;
  }
}

function updateBtn() {
  const open = !!document.querySelector(".flick-wrap-injected");
  if (!getActiveSiteConfig()) return;
  if (open) {
    setToggleState("open");
  } else if (isSupportedArticle()) {
    setToggleState("ready");
  } else {
    setToggleState("unsupported", "게시글 아님");
  }
  const cap = document.querySelector(
    ".flick-capture-btn"
  ) as HTMLButtonElement | null;
  if (cap) cap.disabled = open;
}
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => {
    ensureButton();
    setupRouteWatcher();
  });
} else {
  ensureButton();
  setupRouteWatcher();
}

// SPA / 동적 내비게이션 대응: URL 변경 및 버튼 소실 감지
function setupRouteWatcher() {
  if (flickRuntime.__flickRouteWatcherInstalled) return;
  flickRuntime.__flickRouteWatcherInstalled = true;
  let lastHref = location.href;
  function check() {
    if (location.href !== lastHref) {
      lastHref = location.href;
      setTimeout(() => {
        if (!getActiveSiteConfig()) {
          removeButtonAndClose();
        } else {
          ensureButton();
          updateBtn();
        }
      }, 60);
    } else {
      if (getActiveSiteConfig()) {
        if (!document.querySelector(".flick-toggle-wrapper")) ensureButton();
        updateBtn();
      } else {
        removeButtonAndClose();
      }
    }
  }
  if (!flickRuntime.__flickHistoryPatched) {
    try {
      (["pushState", "replaceState"] as const).forEach((method) => {
        const original = history[method];
        history[method] = function (
          this: History,
          ...args: Parameters<typeof original>
        ) {
          const ret = original.apply(this, args);
          window.dispatchEvent(new Event("flick:locationchange"));
          return ret;
        } as typeof original;
      });
      flickRuntime.__flickHistoryPatched = true;
    } catch (error) {
      console.warn("[flick history patch failed]", error);
    }
  }
  window.addEventListener("popstate", check, true);
  window.addEventListener("flick:locationchange", check, true);
  const mo = new MutationObserver((mut) => {
    for (const m of mut) {
      if (m.type === "childList") {
        check();
        break;
      }
    }
  });
  try {
    mo.observe(document.body, { childList: true, subtree: true });
  } catch (_) {}
  setInterval(check, 3000);
}

function removeButtonAndClose() {
  const wrap = document.querySelector(".flick-toggle-wrapper");
  if (wrap) wrap.remove();
  const open = document.querySelector(".flick-wrap-injected");
  if (open) {
    try {
      closeShorts();
    } catch (_) {}
  }
}

// keyboard shortcut: F4 toggle
window.addEventListener("keydown", (e) => {
  const tag = (e.target as Element | null)?.tagName || "";
  if (
    ["INPUT", "TEXTAREA"].includes(tag) ||
    (e.target as any)?.isContentEditable
  )
    return;
  if (e.key === "F4") {
    e.preventDefault();
    const open = !!document.querySelector(".flick-wrap-injected");
    if (open) {
      closeShorts();
      updateBtn();
      return;
    }
    if (!isSupportedArticle()) return;
    openShorts();
    updateBtn();
  }
});

window.addEventListener("flick:shortschange", updateBtn);
