/**
 * s2s_extract.js (Dispatcher)
 * ------------------------------------------------------------
 * 사이트별 개별 추출 로직(rule_*.js) 을 선택 실행하는 디스패처.
 * - s2s_sites.js 에서 site.ruleId 로 어떤 규칙 사용할지 지정.
 * - 규칙들은 window.__S2S.__RULES[ruleId] 형태로 등록.
 * - 규칙 함수 시그니처: (siteConfig) => { title, blocks }
 * - 규칙 없거나 실패 시 기본 fallback (빈 blocks) 반환.
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
      // ruleId 없으면 향후 공통 휴리스틱 로직 자리
      return { title: document.title || '제목 없음', blocks: [] };
    } catch(err){
      console.error('[S2S extract error]', err);
      return { title: document.title || '제목 없음', blocks: [] };
    }
  };
})(window.__S2S = window.__S2S || {});
