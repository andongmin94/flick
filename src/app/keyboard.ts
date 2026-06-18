type KeyboardActions = {
  openShorts: () => void;
  closeShorts: () => void;
  updateButton: () => void;
  isSupportedArticle: () => boolean;
};

function isEditableTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false;
  if (["INPUT", "TEXTAREA"].includes(target.tagName)) return true;
  return target.isContentEditable;
}

export function setupKeyboardShortcut(actions: KeyboardActions) {
  window.addEventListener("keydown", (event) => {
    if (isEditableTarget(event.target)) return;
    if (event.key !== "F4") return;

    event.preventDefault();
    const open = !!document.querySelector(".flick-wrap-injected");
    if (open) {
      actions.closeShorts();
      actions.updateButton();
      return;
    }
    if (!actions.isSupportedArticle()) return;
    actions.openShorts();
    actions.updateButton();
  });
}
