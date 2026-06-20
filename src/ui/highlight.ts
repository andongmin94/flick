import { getHighlightColor } from "./colors";

export function enableAutoHighlight(titleEl: HTMLElement) {
  function validRange(range: Range) {
    return (
      range &&
      !range.collapsed &&
      titleEl.contains(range.commonAncestorContainer)
    );
  }

  function mergeAdjacent(parent: Element | null, color: string) {
    if (!parent) return;
    const nodes = Array.from(parent.querySelectorAll("[data-flick-hl]"));
    for (let i = 0; i < nodes.length - 1; i++) {
      const current = nodes[i] as HTMLElement;
      const next = nodes[i + 1] as HTMLElement;
      if (
        current.nextSibling === next &&
        current.style.color === next.style.color
      ) {
        while (next.firstChild) current.appendChild(next.firstChild);
        next.remove();
      }
    }
  }

  function applySelection() {
    const selection = window.getSelection();
    if (!selection || !selection.rangeCount) return;
    const range = selection.getRangeAt(0);
    if (!validRange(range)) return;
    const span = document.createElement("span");
    span.setAttribute("data-flick-hl", "");
    span.style.color = getHighlightColor();
    span.appendChild(range.extractContents());
    range.insertNode(span);
    selection.removeAllRanges();
    const nextRange = document.createRange();
    nextRange.selectNodeContents(span);
    nextRange.collapse(false);
    selection.addRange(nextRange);
    mergeAdjacent(span.parentNode as Element | null, span.style.color);
  }

  const onMouseUp = () => setTimeout(applySelection, 0);
  const onKeyUp = (event: KeyboardEvent) => {
    if (event.key === "Shift") setTimeout(applySelection, 0);
  };
  document.addEventListener("mouseup", onMouseUp);
  document.addEventListener("keyup", onKeyUp);
  return () => {
    document.removeEventListener("mouseup", onMouseUp);
    document.removeEventListener("keyup", onKeyUp);
  };
}
