import {
  KEY_LEGACY_BODY_BG_IMAGE,
  KEY_VIEWER_BG_IMAGE,
  KEY_VIEWER_BG_VISIBILITY,
  MAX_BG_SOURCE_BYTES,
  MAX_BG_STORED_CHARS,
} from "./constants";
import { readIntStorage, readStorage, removeStorage } from "./storage";

export function getViewerBackgroundVisibility() {
  return readIntStorage(KEY_VIEWER_BG_VISIBILITY, 100, 0, 100);
}

export function applyViewerBackground(
  wrap: HTMLElement,
  imageData: string | null,
  visibility = getViewerBackgroundVisibility(),
) {
  if (!imageData) {
    wrap.classList.remove("flick-wrap-has-bg-image");
    wrap.style.removeProperty("background-image");
    wrap.style.removeProperty("background-size");
    wrap.style.removeProperty("background-position");
    wrap.style.removeProperty("background-repeat");
    return;
  }

  wrap.classList.add("flick-wrap-has-bg-image");
  const overlayAlpha = Math.max(0, Math.min(1, (100 - visibility) / 100));
  wrap.style.backgroundImage = `linear-gradient(rgba(255, 255, 255, ${overlayAlpha}), rgba(255, 255, 255, ${overlayAlpha})), url("${imageData}")`;
  wrap.style.backgroundSize = "cover, cover";
  wrap.style.backgroundPosition = "center, center";
  wrap.style.backgroundRepeat = "no-repeat, no-repeat";
}

export function applyStoredViewerBackground(wrap: HTMLElement) {
  removeStorage(KEY_LEGACY_BODY_BG_IMAGE);
  applyViewerBackground(wrap, readStorage(KEY_VIEWER_BG_IMAGE));
}

function loadImage(file: File) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("이미지를 읽지 못했습니다."));
    };
    img.src = url;
  });
}

export async function prepareViewerBackgroundImage(file: File) {
  if (!file.type.startsWith("image/")) {
    throw new Error("이미지 파일만 사용할 수 있습니다.");
  }
  if (file.size > MAX_BG_SOURCE_BYTES) {
    throw new Error("6MB 이하 이미지만 사용할 수 있습니다.");
  }

  const img = await loadImage(file);
  const maxSide = 1600;
  const scale = Math.min(
    1,
    maxSide / Math.max(img.naturalWidth, img.naturalHeight),
  );
  const width = Math.max(1, Math.round(img.naturalWidth * scale));
  const height = Math.max(1, Math.round(img.naturalHeight * scale));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("이미지를 처리하지 못했습니다.");
  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, width, height);
  context.drawImage(img, 0, 0, width, height);
  const dataUrl = canvas.toDataURL("image/jpeg", 0.84);
  if (dataUrl.length > MAX_BG_STORED_CHARS) {
    throw new Error("이미지를 더 작게 줄여서 사용해 주세요.");
  }
  return dataUrl;
}
