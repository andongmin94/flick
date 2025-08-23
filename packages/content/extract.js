/**
 * extract.js (dispatcher)
 * 사이트별 규칙(rule_*.js) 실행 진입점
 */
(function(ns){
  ns.extractPost = function(){
    const cfg = ns.getActiveSiteConfig && ns.getActiveSiteConfig();
    if(!cfg) return { title: '지원되지 않는 사이트', blocks: [] };
    const ruleId = cfg.ruleId;
    const registry = ns.__RULES || {};
    const ruleFn = ruleId && registry[ruleId];
    try {
      if (typeof ruleFn === 'function') {
        return ruleFn(cfg) || { title: document.title || '제목 없음', blocks: [] };
      }
      return { title: document.title || '제목 없음', blocks: [] };
    } catch(err){
      console.error('[FLICK extract error]', err);
      return { title: document.title || '제목 없음', blocks: [] };
    }
  };
})(window.__FLICK = window.__FLICK || {});
