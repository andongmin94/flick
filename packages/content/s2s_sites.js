// Site configuration & dispatcher
(function(ns){
  const sites = [
    {
      id: 'fmkorea',
      match: /https?:\/\/(www\.)?fmkorea\.com\//i,
      articleMatch: /\/best\//i,
      titleSanitizers: [
        [/\s*-\s*FM코리아.*/i, ''],
        [/\|\s*FMKOREA.*/i, ''],
        [/\s*:\s*네이버\s*뉴스.*/i, '']
      ],
      titleSelectors: [
        '.read_header h1', '.rd_hd h1', '.read_header .np_18px', '.np_18px'
      ],
      contentSelector: '.read_body, .rd_body, .view_content, .article_body, .content, #articleBody',
      skipClosest: '.mediaelement_video, .document_address'
    }
    // 추가 사이트는 동일 패턴으로 push
  ];

  function pickSite(){
    return sites.find(s => s.match.test(location.href)) || null;
  }

  ns.getActiveSiteConfig = function(){ return pickSite(); };
  ns.isSupportedArticle = function(){
    const s = pickSite();
    if(!s) return false;
    if(s.articleMatch && !s.articleMatch.test(location.href)) return false;
    return true;
  };
})(window.__S2S = window.__S2S || {});
