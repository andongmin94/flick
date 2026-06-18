import { getActiveSiteConfig, isSupportedArticle } from "../rules/index";

export type ToggleState =
  | "ready"
  | "open"
  | "loading"
  | "empty"
  | "error"
  | "unsupported";

type ToggleButtonActions = {
  openShorts: () => void;
  closeShorts: () => void;
};

export function ensureButton(actions: ToggleButtonActions) {
  if (!getActiveSiteConfig()) return;
  if (document.querySelector(".flick-toggle-wrapper")) return;
  const wrap = document.createElement("div");
  wrap.className = "flick-toggle-wrapper";

  const logo = document.createElement("button");
  logo.type = "button";
  logo.className = "flick-logo-badge";
  logo.textContent = "FLICK";
  logo.title = "쇼츠 보기/닫기";
  logo.addEventListener("click", () => {
    if (!isSupportedArticle()) {
      setToggleState("unsupported", "게시글 아님");
      return;
    }
    const open = !!document.querySelector(".flick-wrap-injected");
    open ? actions.closeShorts() : actions.openShorts();
    updateButton();
  });

  const status = document.createElement("div");
  status.className = "flick-toggle-status";
  wrap.appendChild(logo);
  wrap.appendChild(status);
  document.body.appendChild(wrap);
  updateButton();
}

export function setToggleState(state: ToggleState, message?: string) {
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

export function updateButton() {
  const open = !!document.querySelector(".flick-wrap-injected");
  if (!getActiveSiteConfig()) return;
  if (open) {
    setToggleState("open");
  } else if (isSupportedArticle()) {
    setToggleState("ready");
  } else {
    setToggleState("unsupported", "게시글 아님");
  }
}

export function removeButtonAndClose(closeShorts: () => void) {
  document.querySelector(".flick-toggle-wrapper")?.remove();
  if (!document.querySelector(".flick-wrap-injected")) return;
  try {
    closeShorts();
  } catch (_) {}
}
