/**
 * s2s_sites.js
 * ----------------------------------------------------------------------
 * (역할 개요)
 *   - 다수의 사이트(도메인)별 "게시글 페이지인지" 판별하기 위한 최소 설정을 보관.
 *   - 현재 초간단 모드에서는: 추출 로직(s2s_extract.js)이 <article> 만 보기 때문에
 *     과거에 사용하던 titleSelectors / contentSelector 등 복잡한 필드는 제거.
 *   - 남겨둔 것은:
 *       id          : 사이트 식별용 문자열
 *       match       : location.href 가 이 정규식과 매칭되면 해당 사이트 후보
 *       articleMatch: 사이트 안에서도 '실제 게시글 URL' 인지 2차 필터
 *       skipClosest : (선택) 추출 대상 노드가 이 선택자 조상을 갖고 있으면 제외
 *   - pickSite() 로 현재 페이지에 해당하는 사이트 설정을 찾고,
 *     isSupportedArticle() 에서 최종 게시글 여부 boolean 제공.
 *
 * (확장 포인트)
 *   - 다중 사이트 추가: 배열에 객체를 push
 *   - 고급 모드 복귀: titleSelectors, contentSelector, titleSanitizers 등을 다시 추가
 *   - 특정 사이트만 다른 전략 사용: 사이트 객체에 customExtract 함수를 넣고
 *     extractPost() 에서 존재하면 우선 호출하도록 분기 가능
 *
 * (주의)
 *   - match 정규식은 반드시 특정 도메인을 정확히 한정 (너무 느슨한 예: any domain 포함 패턴 지양)
 *   - articleMatch 가 너무 광범위하면 목록/검색페이지도 통과 → 쇼츠 버튼 오염
 *   - skipClosest 는 쉼표(,) 로 구분되는 CSS 셀렉터 목록; closest("A, B") 패턴 사용.
 */
(function (ns) {
  /**
   * sites 배열
   *  - 각 요소: 한 사이트에 대한 최소 판별 정보
   */
  const sites = [
    {
      id: "fmkorea", // 내부 식별용 키
      match: /https?:\/\/(www\.)?fmkorea\.com\//i, // 현재 URL 이 이 도메인인지
      // articleMatch: 실제 '게시글 상세' URL 인가? (best 게시판 or 숫자 문서번호 or mid 파라미터)
      articleMatch: /(\/best\/)|\/(\d+)(?:$|[?#])|index\.php\?mid=/i,
      // skipClosest: 광고/주소 영역 등 빼고 싶은 조상 컨테이너. (공백 없이 쉼표로 추가)
  skipClosest: ".mediaelement_video, .document_address",
  // 사이트별 추출 로직 식별자 (rule_fmkorea.js 에서 등록)
  ruleId: "fmkorea"
      // 고급 필드(titleSelectors 등)는 단순 모드에서는 미사용
    },
    // 예) 다른 사이트 추가 시
    // {
    //   id: "example",
    //   match: /https?:\/\/(www\.)?example\.com\//i,
    //   articleMatch: /\/posts\/\d+/i,
    //   skipClosest: ".ad-box, .sponsored"
    // },
  ];

  /**
   * pickSite()
   *  - 현재 location.href 와 match 가 맞는 첫 사이트 객체 반환
   *  - 없으면 null
   */
  function pickSite() {
    return sites.find((s) => s.match.test(location.href)) || null;
  }

  /**
   * getActiveSiteConfig()
   *  - 외부에서 현재 사이트 설정 필요할 때 사용 (null 가능)
   */
  ns.getActiveSiteConfig = function () {
    return pickSite();
  };

  /**
   * isSupportedArticle()
   *  - (1) 사이트 자체가 매칭돼야 하고
   *  - (2) articleMatch 가 있으면 URL 이 그 패턴도 만족해야 true
   *  - 둘 다 되면 쇼츠 버튼/동작 활성화
   */
  ns.isSupportedArticle = function () {
    const s = pickSite();
    if (!s) return false; // 사이트 자체 미지원
    if (s.articleMatch && !s.articleMatch.test(location.href)) return false; // 게시글 아님
    return true; // 통과
  };
})(window.__S2S = window.__S2S || {});
