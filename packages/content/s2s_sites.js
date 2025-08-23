// Site configuration & dispatcher
(function (ns) {
  const sites = [
    {
      id: "fmkorea",
      match: /https?:\/\/(www\.)?fmkorea\.com\//i,
      // 게시글 URL 패턴: /best/ 포함하거나, /숫자 (문서 번호), 혹은 index.php?mid= 형태
      articleMatch: /(\/best\/)|\/(\d+)(?:$|[?#])|index\.php\?mid=/i,
      // 단순 모드에서도 제외하고 싶은 컨테이너 (가까운 조상) 셀렉터
      skipClosest: ".mediaelement_video, .document_address"
      // NOTE: article-only 단순 추출 모드라 나머지 세부 설정은 사용하지 않음.
    },
    // 추가 사이트는 동일 패턴으로 push
  ];

  function pickSite() {
    return sites.find((s) => s.match.test(location.href)) || null;
  }

  ns.getActiveSiteConfig = function () {
    return pickSite();
  };
  ns.isSupportedArticle = function () {
    const s = pickSite();
    if (!s) return false;
    if (s.articleMatch && !s.articleMatch.test(location.href)) return false;
    return true;
  };
})((window.__S2S = window.__S2S || {}));
