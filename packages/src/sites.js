// src/sites.js
export const sites = [
  {
    id: "fmkorea",
    match: /https?:\/\/(www\.)?fmkorea\.com\//i,
    articleMatch: /(\/best\/)|\/(\d+)(?:$|[?#])|index\.php\?mid=/i,
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
