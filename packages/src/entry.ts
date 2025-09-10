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
  runPreHook();
  const data: ExtractResult = extractActive();
  buildUI(data);
  runPostMountedHook();
}

function ensureButton() {
  if (!isSupportedArticle()) return;
  if (document.querySelector(".flick-toggle-wrapper")) return;
  const wrap = document.createElement("div");
  wrap.className = "flick-toggle-wrapper";

  const logo = document.createElement("div");
  logo.className = "flick-logo-badge";
  logo.textContent = "FLICK"; // 필요시 SVG나 이미지로 교체
  logo.title = "쇼츠 보기/닫기"; // 시각적 텍스트는 붙이지 않음
  logo.addEventListener("click", () => {
    const open = !!document.querySelector(".flick-wrap-injected");
    open ? closeShorts() : openShorts();
    updateBtn();
  });
  wrap.appendChild(logo);
  document.body.appendChild(wrap);
  updateBtn();
}
function updateBtn() {
  const open = !!document.querySelector(".flick-wrap-injected");
  const logo = document.querySelector(".flick-logo-badge");
  if (logo) logo.setAttribute("data-open", open ? "true" : "false");
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
  let lastHref = location.href;
  function check() {
    if (location.href !== lastHref) {
      lastHref = location.href;
      setTimeout(() => {
        if (!isSupportedArticle()) {
          removeButtonAndClose();
        } else {
          ensureButton();
        }
      }, 60);
    } else {
      if (isSupportedArticle()) {
        if (!document.querySelector(".flick-toggle-wrapper")) ensureButton();
      } else {
        removeButtonAndClose();
      }
    }
  }
  // history API patch
  (["pushState", "replaceState"] as const).forEach((m) => {
    const orig = (history as any)[m] as (...args: any[]) => any;
    if (typeof orig === "function") {
      (history as any)[m] = function (this: unknown, ...args: any[]) {
        const ret = orig.apply(this as any, args);
        window.dispatchEvent(new Event("flick:locationchange"));
        return ret;
      } as any;
    }
  });
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
  const tag = ((e.target as Element | null)?.tagName) || "";
  if (["INPUT", "TEXTAREA"].includes(tag) || (e.target as any)?.isContentEditable)
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
