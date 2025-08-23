// src/extract.js
import { getActiveSiteConfig } from "./sites.js";
import { extractFmkorea } from "./rules/fmkorea.js";

const registry = { fmkorea: extractFmkorea };

export function extractPost() {
  const cfg = getActiveSiteConfig();
  if (!cfg) return { title: "지원되지 않는 사이트", blocks: [] };
  const fn = registry[cfg.ruleId];
  try {
    if (typeof fn === "function")
      return fn(cfg) || { title: document.title || "제목 없음", blocks: [] };
    return { title: document.title || "제목 없음", blocks: [] };
  } catch (e) {
    console.error("[FLICK extract error]", e);
    return { title: document.title || "제목 없음", blocks: [] };
  }
}
