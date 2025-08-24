// src/rules/fmkorea.js
export function extractFmkorea(cfg) {
  const article = document.querySelector("article");
  const title =
    (article &&
      (article.querySelector("h1,h2,h3")?.textContent || "").trim()) ||
    document.title ||
    "제목 없음";
  if (!article) return { title, blocks: [] };
  const skipSel = cfg && cfg.skipClosest;
  const blocks = [];
  const addedImg = new Set();
  const seenText = new Set();
  // 이미지/텍스트를 분리 수집하면 이미지가 먼저 몰리는 문제 → 단일 selector 로 DOM 순서 유지
  const selector = "img, p, h1, h2, h3, h4, h5, h6, li, blockquote, pre";
  article.querySelectorAll(selector).forEach((el) => {
    if (skipSel && el.closest(skipSel)) return;
    if (el.tagName === "IMG") {
      const img = el;
      const src =
        img.getAttribute("data-src") ||
        img.getAttribute("data-original") ||
        img.src;
      if (!src || addedImg.has(src)) return;
      addedImg.add(src);
      blocks.push({ type: "image", src, alt: img.alt || "" });
      return;
    }
    // 텍스트 블록 처리
    const txt = (el.textContent || "").replace(/\s+/g, " ").trim();
    if (!txt) return;
    if (txt.length === 1 && /[\p{P}\p{S}]/u.test(txt)) return; // 단일 기호 제외
    if (seenText.has(txt)) return; // 완전 동일 텍스트 중복 제거
    seenText.add(txt);
    if (el.tagName === "PRE") blocks.push({ type: "html", html: el.outerHTML });
    else blocks.push({ type: "html", html: el.innerHTML.trim() });
  });
  const hasText = blocks.some((b) => b.type === "html");
  if (!hasText) {
    const raw = article.innerText
      .split(/\n+/)
      .map((l) => l.trim())
      .filter((l) => l.length > 1);
    raw.forEach((line) => {
      if (seenText.has(line)) return;
      seenText.add(line);
      blocks.push({ type: "html", html: line });
    });
  }
  try {
    console.debug("[FLICK fmkorea extract]", {
      images: addedImg.size,
      textBlocks: blocks.filter((b) => b.type === "html").length,
    });
  } catch (_) {}
  return { title, blocks };
}
