// rules/index.js - 중앙 rule registry (확장 용이)
import { fmkoreaRule } from "./fmkorea.js";

const rules = [fmkoreaRule];

export function getActiveRule() {
  return rules.find((r) => r.match.test(location.href)) || null;
}
export function getActiveSiteConfig() {
  return getActiveRule();
}

export function isSupportedArticle() {
  const r = getActiveRule();
  if (!r) return false;
  if (r.articleMatch && !r.articleMatch.test(location.href)) return false;
  return true;
}

export function extractActive() {
  const r = getActiveRule();
  if (!r) return { title: "지원되지 않는 사이트", blocks: [] };
  try {
    return r.extract(r) || { title: document.title || "제목 없음", blocks: [] };
  } catch (e) {
    console.error("[FLICK extract error]", e);
    return { title: document.title || "제목 없음", blocks: [] };
  }
}

export function runPreHook() {
  const r = getActiveRule();
  if (r?.prePrepare) {
    try {
      r.prePrepare();
    } catch (e) {
      console.warn("[flick pre hook error]", e);
    }
  }
}
export function runPostMountedHook() {
  const r = getActiveRule();
  if (r?.postShortsMounted) {
    try {
      r.postShortsMounted();
    } catch (e) {
      console.warn("[flick post hook error]", e);
    }
  }
}
