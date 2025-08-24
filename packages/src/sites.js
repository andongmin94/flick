// src/sites.js
export const sites = [
  {
    id: "fmkorea",
    match: /https?:\/\/(www\.)?fmkorea\.com\//i,
  // 게시글 URL 기준:
  // 1) /best/ 포함
  // 2) 경로 끝이 /숫자 (문서 번호 직접 접근)
  // 3) query string 에 document_srl= 존재
  // 목록(index.php?mid=...) 만 있는 경우는 제외
  articleMatch: /(\/best\/)|\/(\d+)(?:$|[?#])|document_srl=\d+/i,
    // video 도 수집해야 하므로 mediaelement_video 제거
    skipClosest: ".document_address",
    ruleId: "fmkorea",
  },
];

export function getActiveSiteConfig() {
  return sites.find((s) => s.match.test(location.href)) || null;
}

export function isSupportedArticle() {
  const s = getActiveSiteConfig();
  if (!s) return false;
  if (s.articleMatch && !s.articleMatch.test(location.href)) return false;
  return true;
}
