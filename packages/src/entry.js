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

function toggle() {
  const open = !!document.querySelector(".flick-wrap-injected");
  open ? closeShorts() : openShorts();
  updateBtn();
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
  wrap.appendChild(logo);

  const btn = document.createElement("button");
  btn.className = "flick-toggle-btn flick-toggle-floating";
  btn.type = "button";
  btn.textContent = "쇼츠 보기";
  btn.addEventListener("click", toggle);
  wrap.appendChild(btn);
  document.body.appendChild(wrap);
  updateBtn();
}
function updateBtn() {
  const open = !!document.querySelector(".flick-wrap-injected");
  const main = document.querySelector(".flick-toggle-btn");
  if (main) main.textContent = open ? "쇼츠 닫기" : "쇼츠 보기";
  const cap = document.querySelector(".flick-capture-btn");
  if (cap) cap.disabled = open;
}
if (document.readyState === "loading")
  document.addEventListener("DOMContentLoaded", ensureButton);
else ensureButton();

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
