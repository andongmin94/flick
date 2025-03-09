// src/entry.js (bundle entry)
import { isSupportedArticle, getActiveSiteConfig } from "./sites.js";
import { extractPost } from "./extract.js";
import { buildUI, closeShorts } from "./ui.js";
import "./shorts.css";

// attach minimal API (still provide __FLICK for backward compatibility)
const API = {
  isSupportedArticle,
  getActiveSiteConfig,
  extractPost,
  buildUI,
  closeShorts,
};
window.__FLICK = API; // keep same global for now
window.FLICK = API; // optional alias

function openShorts() {
  const data = extractPost();
  buildUI(data);
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
  const btn = document.querySelector(".flick-toggle-btn");
  if (!btn) return;
  const open = !!document.querySelector(".flick-wrap-injected");
  btn.textContent = open ? "쇼츠 닫기" : "쇼츠 보기";
}
if (document.readyState === "loading")
  document.addEventListener("DOMContentLoaded", ensureButton);
else ensureButton();

// optional keyboard shortcut (Shift+S)
window.addEventListener("keydown", (e) => {
  if (e.key === "S" && e.shiftKey) {
    toggle();
  }
});
