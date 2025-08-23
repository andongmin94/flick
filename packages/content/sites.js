/**
 * sites.js (was s2s_sites.js)
 * ----------------------------------------------------------------------
 * 사이트(도메인)별 게시글 판별 & 설정 저장.
 * 전역 네임스페이스: window.__FLICK
 * 구조/설명은 기존 파일과 동일.
 */
(function (ns) {
  const sites = [
    {
      id: "fmkorea",
      match: /https?:\/\/(www\.)?fmkorea\.com\//i,
      articleMatch: /(\/best\/)|\/(\d+)(?:$|[?#])|index\.php\?mid=/i,
      skipClosest: ".mediaelement_video, .document_address",
      ruleId: "fmkorea"
    },
  ];

  function pickSite() {
    return sites.find((s) => s.match.test(location.href)) || null;
  }

  ns.getActiveSiteConfig = function () { return pickSite(); };
  ns.isSupportedArticle = function () {
    const s = pickSite();
    if (!s) return false;
    if (s.articleMatch && !s.articleMatch.test(location.href)) return false;
    return true;
  };
})(window.__FLICK = window.__FLICK || {});
