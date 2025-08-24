// src/entry.js (bundle entry)
import { isSupportedArticle, getActiveSiteConfig } from "./sites.js";
import { extractPost } from "./extract.js";
import { buildUI, closeShorts } from "./ui.js";
import "./styles/styles.css"; // aggregate all CSS for single bundle

// fmkorea 전용 비디오 처리 훅
import {
  preFmkoreaPrepare,
  postFmkoreaShortsMounted,
} from "./rules/fmkorea.js";

// attach minimal API (still provide __FLICK for backward compatibility)
const API = {
  isSupportedArticle,
  getActiveSiteConfig,
  extractPost,
  buildUI,
  closeShorts,
};
window.FLICK = API;

function openShorts() {
  const cfg = getActiveSiteConfig();
  if (cfg?.ruleId === "fmkorea") {
    try {
      preFmkoreaPrepare();
    } catch (e) {
      console.warn("[flick] pre fmkorea hook error", e);
    }
  }
  const data = extractPost();
  buildUI(data);
  if (cfg?.ruleId === "fmkorea") {
    try {
      postFmkoreaShortsMounted();
    } catch (e) {
      console.warn("[flick] post fmkorea hook error", e);
    }
  }
}

function toggle() {
  const open = !!document.querySelector(".flick-wrap-injected");
  open ? closeShorts() : openShorts();
  updateBtn();
}
function ensureButton() {
  if (!isSupportedArticle()) return;
  if (document.querySelector(".flick-toggle-btn")) return;
  const btn = document.createElement("button");
  btn.className = "flick-toggle-btn flick-toggle-floating";
  btn.type = "button";
  btn.textContent = "쇼츠 보기";
  btn.addEventListener("click", toggle);
  document.body.appendChild(btn);
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
    toggle();
  }
});
