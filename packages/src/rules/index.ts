import type { Rule, ExtractResult } from "../types/global";
import { fmkoreaRule } from "./fmkorea";
import { dcinsideRule } from "./dcinside";
import { navercafeRule } from "./navercafe";
import { dogdripRule } from "./dogdrip";

const rules: Rule[] = [fmkoreaRule, dcinsideRule, navercafeRule, dogdripRule];

export function getActiveRule(): Rule | null {
  return rules.find((r) => r.match.test(location.href)) || null;
}
export function getActiveSiteConfig(): Rule | null {
  return getActiveRule();
}

export function isSupportedArticle(): boolean {
  const r = getActiveRule();
  if (!r) return false;
  if (r.articleMatch && !r.articleMatch.test(location.href)) return false;
  return true;
}

export function extractActive(): ExtractResult {
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
