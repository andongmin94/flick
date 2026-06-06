import {
  DEFAULT_SANDBOX_BG,
  KEY_FOOTER_BG,
  KEY_HEADER_BG,
  KEY_HIGHLIGHT,
} from "./constants";
import { readStorage } from "./storage";

export function getHighlightColor() {
  const stored = readStorage(KEY_HIGHLIGHT);
  if (stored && /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(stored)) return stored;
  return "#ffd60a";
}

export function getStoredColor(key: string, fallback: string) {
  const stored = readStorage(key);
  if (stored && /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(stored)) {
    return normalizeHexColor(stored);
  }
  return fallback;
}

export function normalizeHexColor(color: string) {
  if (/^#[0-9a-f]{6}$/i.test(color)) return color.toLowerCase();
  const short = color.match(/^#([0-9a-f])([0-9a-f])([0-9a-f])$/i);
  if (!short) return color;
  return `#${short[1]}${short[1]}${short[2]}${short[2]}${short[3]}${short[3]}`.toLowerCase();
}

function getReadableTextColor(bgColor: string) {
  const color = normalizeHexColor(bgColor);
  const match = color.match(/^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i);
  if (!match) return "#ffffff";
  const r = parseInt(match[1], 16);
  const g = parseInt(match[2], 16);
  const b = parseInt(match[3], 16);
  const luminance = (r * 299 + g * 587 + b * 114) / 1000;
  return luminance > 150 ? "#111827" : "#ffffff";
}

export function applySandboxColors(
  stage: HTMLElement,
  header: HTMLElement,
  footer: HTMLElement,
  title: HTMLElement,
  headerColor: string,
  footerColor: string
) {
  const headerTextColor = getReadableTextColor(headerColor);
  const footerTextColor = getReadableTextColor(footerColor);
  header.style.backgroundColor = headerColor;
  header.style.color = headerTextColor;
  title.style.color = headerTextColor;
  footer.style.backgroundColor = footerColor;
  footer.style.color = footerTextColor;
  stage.style.setProperty("--flick-resize-header-bg", headerColor);
  stage.style.setProperty("--flick-resize-footer-bg", footerColor);
  stage.style.setProperty("--flick-resize-header-bar", headerTextColor);
  stage.style.setProperty("--flick-resize-footer-bar", footerTextColor);
}

export function applyStoredSandboxColors(
  stage: HTMLElement,
  header: HTMLElement,
  footer: HTMLElement,
  title: HTMLElement
) {
  applySandboxColors(
    stage,
    header,
    footer,
    title,
    getStoredColor(KEY_HEADER_BG, DEFAULT_SANDBOX_BG),
    getStoredColor(KEY_FOOTER_BG, DEFAULT_SANDBOX_BG)
  );
}
