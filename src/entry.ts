// src/entry.ts (bundle entry)
import { isSupportedArticle } from "./rules/index";
import "./styles/styles.css"; // aggregate all CSS for single bundle
import { setupKeyboardShortcut } from "./app/keyboard";
import { setupRouteWatcher } from "./app/route-watcher";
import { API, closeShorts, openShorts } from "./app/shorts-controller";
import {
  ensureButton,
  removeButtonAndClose,
  updateButton,
} from "./app/toggle-button";

window.FLICK = API;

const toggleActions = { openShorts, closeShorts };

function ensureToggleButton() {
  ensureButton(toggleActions);
}

function init() {
  ensureToggleButton();
  setupRouteWatcher({
    ensureButton: ensureToggleButton,
    updateButton,
    removeButtonAndClose: () => removeButtonAndClose(closeShorts),
  });
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}

setupKeyboardShortcut({
  openShorts,
  closeShorts,
  updateButton,
  isSupportedArticle,
});

window.addEventListener("flick:shortschange", updateButton);
