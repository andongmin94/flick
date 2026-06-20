import { FONT_OPTIONS } from "./constants";
import { readStorage, removeStorage, writeStorage } from "./storage";

let localFontFamiliesPromise: Promise<string[]> | null = null;

export function cleanFontName(value: string | null) {
  return (value || "")
    .replace(/[\r\n\t]/g, " ")
    .replace(/[;"'`{}<>\\]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 80);
}

function quoteFontFamily(fontName: string) {
  return `"${fontName.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
}

export function applyFontFamily(target: HTMLElement, fontName: string) {
  const cleaned = cleanFontName(fontName);
  if (!cleaned) {
    target.style.removeProperty("font-family");
    return;
  }
  target.style.fontFamily = `${quoteFontFamily(cleaned)}, var(--shorts-font), sans-serif`;
}

export function readFontStorage(key: string) {
  return cleanFontName(readStorage(key));
}

export function writeFontStorage(key: string, value: string) {
  const cleaned = cleanFontName(value);
  if (cleaned) writeStorage(key, cleaned);
  else removeStorage(key);
  return cleaned;
}

export function setFontSelectOptions(
  select: HTMLSelectElement,
  selectedValue: string,
  localFonts: string[] = [],
) {
  const selected = cleanFontName(selectedValue);
  const options = new Map<string, string>();
  FONT_OPTIONS.forEach((option) => options.set(option.value, option.label));
  localFonts.forEach((font) => {
    const cleaned = cleanFontName(font);
    if (cleaned && !options.has(cleaned)) options.set(cleaned, cleaned);
  });
  if (selected && !options.has(selected)) options.set(selected, selected);

  select.replaceChildren();
  options.forEach((label, value) => {
    const option = document.createElement("option");
    option.value = value;
    option.textContent = label;
    select.appendChild(option);
  });
  select.value = selected;
}

async function readLocalFontFamilies() {
  if (!localFontFamiliesPromise) {
    localFontFamiliesPromise = (async () => {
      const fontWindow = window as Window & {
        queryLocalFonts?: () => Promise<Array<{ family?: string }>>;
      };
      if (!fontWindow.queryLocalFonts) return [];
      const fonts = await fontWindow.queryLocalFonts();
      const families = new Set<string>();
      fonts.forEach((font) => {
        const family = cleanFontName(font.family || "");
        if (family) families.add(family);
      });
      return Array.from(families).sort((a, b) => a.localeCompare(b, "ko"));
    })().catch(() => []);
  }
  return localFontFamiliesPromise;
}

export function hydrateFontSelects(selects: HTMLSelectElement[]) {
  const hydrate = async () => {
    const localFonts = await readLocalFontFamilies();
    if (!localFonts.length) return;
    selects.forEach((select) => {
      const currentValue = select.value;
      setFontSelectOptions(select, currentValue, localFonts);
    });
  };
  selects.forEach((select) => {
    select.addEventListener("pointerdown", hydrate);
    select.addEventListener("focus", hydrate);
  });
}
