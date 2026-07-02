import {
  DEFAULT_CONTENT_SIZE,
  DEFAULT_FOOTER_HEIGHT,
  DEFAULT_HEADER_HEIGHT,
  DEFAULT_TITLE_SIZE,
  KEY_CONTENT_FONT,
  KEY_CONTENT_FS,
  KEY_FOOTER,
  KEY_HEADER,
  KEY_SAFE_FIT,
  KEY_TITLE_FONT,
  KEY_TITLE_FS,
} from "./constants";
import { applyFontFamily, readFontStorage } from "./fonts";
import { readIntStorage, readStorage } from "./storage";

export function applyStoredSizing(
  header: HTMLElement,
  footer: HTMLElement,
  title: HTMLElement,
) {
  header.style.height =
    readIntStorage(KEY_HEADER, DEFAULT_HEADER_HEIGHT, 20, 360) + "px";
  footer.style.height =
    readIntStorage(KEY_FOOTER, DEFAULT_FOOTER_HEIGHT, 16, 260) + "px";
  title.style.fontSize =
    readIntStorage(KEY_TITLE_FS, DEFAULT_TITLE_SIZE, 12, 72) + "px";
}

export function applyStoredFonts(title: HTMLElement, body: HTMLElement) {
  applyFontFamily(title, readFontStorage(KEY_TITLE_FONT));
  applyFontFamily(body, readFontStorage(KEY_CONTENT_FONT));
}

export function applyContentFontSize(body: HTMLElement, size: number) {
  body.style.setProperty("--flick-content-font-size", size + "px");
}

export function applyStoredContentFontSize(body: HTMLElement) {
  applyContentFontSize(
    body,
    readIntStorage(KEY_CONTENT_FS, DEFAULT_CONTENT_SIZE, 12, 36),
  );
}

export function applyStoredSafeFit(body: HTMLElement) {
  body.classList.toggle(
    "flick-body-safe-fit",
    readStorage(KEY_SAFE_FIT) === "true",
  );
}
