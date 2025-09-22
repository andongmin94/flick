// src/entry.js (bundle entry)
import {
  isSupportedArticle,
  getActiveSiteConfig,
  extractActive,
  runPreHook,
  runPostMountedHook,
} from "./rules/index.js";
import { buildUI, closeShorts } from "./ui.js";
import "./styles/styles.css"; // aggregate all CSS for single bundle

// fmkorea 전용 비디오 처리 훅
// 개별 훅은 registry 통해 실행

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
  const data = extractActive();
  buildUI(data);
  runPostMountedHook();
}

function ensureButton() {
  if (!isSupportedArticle()) return;
  // 로고 + 버튼 컨테이너 이미 있으면 스킵
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
  const cap = document.querySelector(".flick-capture-btn");
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

// SPA / 동적 내비게이션(네이버 카페 등) 대응: URL 변경 및 버튼 소실 감지
function setupRouteWatcher() {
  let lastHref = location.href;
  function check() {
    if (location.href !== lastHref) {
      lastHref = location.href;
      // 약간 지연 후 DOM 안정화 뒤 재확인
      setTimeout(() => {
        // 지원 안 되는 페이지면 버튼/쇼츠 제거
        if (!isSupportedArticle()) {
          removeButtonAndClose();
        } else {
          ensureButton();
        }
      }, 60);
    } else {
      // URL 그대로지만 버튼이 지워졌고 기사 페이지면 복구
      if (isSupportedArticle()) {
        if (!document.querySelector(".flick-toggle-wrapper")) ensureButton();
      } else {
        // 기사 페이지가 아니면 잔존 버튼/쇼츠 정리
        removeButtonAndClose();
      }
    }
  }
  // history API 패치
  ["pushState", "replaceState"].forEach((m) => {
    const orig = history[m];
    if (typeof orig === "function") {
      history[m] = function () {
        const ret = orig.apply(this, arguments);
        window.dispatchEvent(new Event("flick:locationchange"));
        return ret;
      };
    }
  });
  window.addEventListener("popstate", check, true);
  window.addEventListener("flick:locationchange", check, true);
  // 네이버 카페는 iframe/동적 교체가 잦으므로 MutationObserver 로 body 구조 변화 감시
  const mo = new MutationObserver((mut) => {
    // 자식 리스트 크게 변하면 체크
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
  // 안전망: 낮은 빈도의 interval (저부하) 로 더블 체크
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

// keyboard shortcut: F4 로 쇼츠 열기/닫기 토글
window.addEventListener("keydown", (e) => {
  // 입력 필드 포커스 중에는 방해하지 않음
  const tag = (e.target && e.target.tagName) || "";
  if (["INPUT", "TEXTAREA"].includes(tag) || e.target?.isContentEditable)
    return;
  if (e.key === "F4") {
    e.preventDefault();
    const open = !!document.querySelector(".flick-wrap-injected");
    if (open) {
      // 열려있으면 어디서든 닫기 허용
      closeShorts();
      updateBtn();
      return;
    }
    // 열려있지 않다면 기사 페이지에서만 열기
    if (!isSupportedArticle()) return;
    openShorts();
    updateBtn();
  }
});
