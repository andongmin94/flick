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
  if (!r) {
    return {
      title: "지원되지 않는 사이트",
      blocks: [],
      sourceUrl: location.href,
      status: "unsupported",
      message: "현재 페이지는 FLICK 지원 사이트가 아닙니다.",
    };
  }
  try {
    const data = r.extract(r) || {
      title: document.title || "제목 없음",
      blocks: [],
    };
    return {
      ...data,
      sourceUrl: data.sourceUrl || location.href,
      siteId: data.siteId || r.id,
      status: data.status || (data.blocks.length > 0 ? "ok" : "empty"),
      message:
        data.message ||
        (data.blocks.length > 0
          ? undefined
          : "본문, 이미지, 영상을 찾지 못했습니다."),
    };
  } catch (e) {
    console.error("[FLICK extract error]", e);
    return {
      title: document.title || "제목 없음",
      blocks: [],
      sourceUrl: location.href,
      siteId: r.id,
      status: "error",
      message: "게시글 추출 중 오류가 발생했습니다.",
    };
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
