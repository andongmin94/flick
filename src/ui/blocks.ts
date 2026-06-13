import type { Block, ExtractResult } from "../types/global";
import { makeButton } from "./dom";

function legacyHtmlToText(html: string) {
  const template = document.createElement("template");
  template.innerHTML = html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(?:p|div|li|h[1-6]|blockquote|pre)>/gi, "\n");
  return (template.content.textContent || "").replace(/\n{3,}/g, "\n\n").trim();
}

function pastePlainText(event: ClipboardEvent) {
  const text = event.clipboardData?.getData("text/plain");
  if (text == null) return;
  event.preventDefault();
  const selection = window.getSelection();
  if (!selection || !selection.rangeCount) return;
  selection.deleteFromDocument();
  selection.getRangeAt(0).insertNode(document.createTextNode(text));
  selection.collapseToEnd();
}

function createTextBlock(text: string) {
  const cleaned = text.trim();
  if (!cleaned) return null;
  const div = document.createElement("div");
  div.className = "flick-block flick-text-block";
  div.textContent = cleaned;
  div.contentEditable = "plaintext-only";
  div.spellcheck = false;
  div.title = "본문 수정 가능";
  div.setAttribute("aria-label", "본문 텍스트 수정");
  div.addEventListener("paste", pastePlainText);
  return div;
}

function applyBlockSpacing(el: HTMLElement, block: Block) {
  if (block.gapAfter) el.classList.add("flick-block-gap-after");
  return el;
}

function createBlockElement(block: Block) {
  if (block.type === "image") {
    if (!block.src) return null;
    const container = document.createElement("div");
    container.className = "flick-block flick-media-block";
    const img = document.createElement("img");
    img.className = "flick-img";
    img.src = block.src;
    img.alt = block.alt || "";
    container.appendChild(img);
    return applyBlockSpacing(container, block);
  }

  if (block.type === "video") {
    if (!block.src) return null;
    const container = document.createElement("div");
    container.className = "flick-block flick-media-block";
    const video = document.createElement("video");
    video.className = "flick-video";
    video.src = block.src;
    if (block.poster) video.poster = block.poster;
    video.controls = true;
    video.playsInline = true;
    video.preload = "metadata";
    container.appendChild(video);
    return applyBlockSpacing(container, block);
  }

  if (block.type === "text") {
    const el = createTextBlock(block.text);
    return el ? applyBlockSpacing(el, block) : null;
  }

  if (block.type === "trusted-html") {
    const div = document.createElement("div");
    div.className = "flick-block";
    div.innerHTML = block.html;
    return applyBlockSpacing(div, block);
  }

  const el = createTextBlock(legacyHtmlToText(block.html));
  return el ? applyBlockSpacing(el, block) : null;
}

function appendEmptyState(parent: HTMLElement, data: ExtractResult) {
  const block = document.createElement("div");
  block.className = "flick-block flick-state-block";
  block.dataset.flickBlockIndex = "0";

  const placeholder = document.createElement("div");
  placeholder.className = "flick-empty-placeholder";

  const title = document.createElement("strong");
  title.textContent =
    data.status === "error"
      ? "게시글을 읽지 못했습니다"
      : "가져올 본문이 없습니다";

  const message = document.createElement("p");
  message.textContent =
    data.message ||
    "원본 페이지 구조가 바뀌었거나, 아직 지원하지 않는 게시글 형식일 수 있습니다.";

  const sourceUrl = data.sourceUrl || location.href;
  const sourceButton = makeButton(
    "flick-empty-source-btn",
    "원본 열기",
    "원본 글 열기"
  );
  sourceButton.addEventListener("click", () => {
    window.open(sourceUrl, "_blank", "noopener,noreferrer");
  });

  placeholder.appendChild(title);
  placeholder.appendChild(message);
  placeholder.appendChild(sourceButton);
  block.appendChild(placeholder);
  parent.appendChild(block);
}

export function renderBlocks(parent: HTMLElement, data: ExtractResult) {
  let rendered = 0;
  data.blocks.forEach((block) => {
    const el = createBlockElement(block);
    if (!el) return;
    el.dataset.flickBlockIndex = String(rendered);
    parent.appendChild(el);
    rendered += 1;
  });

  if (rendered === 0) {
    appendEmptyState(parent, data);
    rendered = 1;
  }

  return rendered;
}
