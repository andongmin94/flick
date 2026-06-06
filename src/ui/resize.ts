import { KEY_FOOTER, KEY_HEADER } from "./constants";
import { writeStorage } from "./storage";

export function setupResize(
  stage: HTMLElement,
  header: HTMLElement,
  footer: HTMLElement
) {
  const state: {
    dragging: "header" | "footer" | null;
    startY: number;
    startH: number;
  } = {
    dragging: null,
    startY: 0,
    startH: 0,
  };

  function onDown(event: MouseEvent) {
    const target = event.target as HTMLElement;
    if (!target.classList.contains("flick-resize-handle")) return;
    state.dragging = target.classList.contains("flick-resize-header")
      ? "header"
      : "footer";
    state.startY = event.clientY;
    state.startH =
      state.dragging === "header" ? header.offsetHeight : footer.offsetHeight;
    target.classList.add("active");
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp, { once: true });
    event.preventDefault();
  }

  function onMove(event: MouseEvent) {
    if (!state.dragging) return;
    const dy = event.clientY - state.startY;
    if (state.dragging === "header") {
      header.style.height = Math.max(20, state.startH + dy) + "px";
    } else {
      footer.style.height = Math.max(16, state.startH - dy) + "px";
    }
  }

  function onUp() {
    document
      .querySelectorAll(".flick-resize-handle.active")
      .forEach((handle) => (handle as HTMLElement).classList.remove("active"));
    state.dragging = null;
    document.removeEventListener("mousemove", onMove);
    writeStorage(KEY_HEADER, String(parseInt(header.style.height, 10)));
    writeStorage(KEY_FOOTER, String(parseInt(footer.style.height, 10)));
  }

  stage.addEventListener("mousedown", onDown);
  return () => {
    stage.removeEventListener("mousedown", onDown);
    document.removeEventListener("mousemove", onMove);
    document.removeEventListener("mouseup", onUp);
  };
}
