// 모듈 기반 부트스트랩 (namespace: __FLICK)
(function () {
  const NS = window.__FLICK;
  if (!NS || !NS.isSupportedArticle || !NS.isSupportedArticle()) return;
  if (window.__FLICK_BOOTSTRAPPED__) return;
  window.__FLICK_BOOTSTRAPPED__ = true;

  function openShorts() {
    const data = NS.extractPost();
    NS.buildUI(data);
  }
  function closeShorts() {
    NS.closeShorts();
  }

  // 페이지 내 좌측 상단 토글 버튼 삽입
  function injectToggleButton() {
  if (document.querySelector(".flick-toggle-btn")) return; // already injected
    const btn = document.createElement("button");
  btn.className = "flick-toggle-btn flick-toggle-floating";
    btn.type = "button";
    btn.dataset.role = "s2s-toggle";
    btn.innerHTML = "쇼츠 보기";
    btn.addEventListener("click", () => {
      const open = !!document.querySelector(".flick-wrap-injected");
      open ? closeShorts() : openShorts();
      updateToggleButton();
    });
    document.body.appendChild(btn);
    updateToggleButton();
  }

  function updateToggleButton() {
    const btn = document.querySelector(
      '.flick-toggle-btn[data-role="s2s-toggle"]'
    );
    if (!btn) return;
    const open = !!document.querySelector(".flick-wrap-injected");
    btn.textContent = open ? "쇼츠 닫기" : "쇼츠 보기";
  }

  // DOMContentLoaded 이후 시도 (이미 로드되어 있으면 바로)
  if (document.readyState === "loading")
    document.addEventListener("DOMContentLoaded", injectToggleButton);
  else injectToggleButton();
})();
