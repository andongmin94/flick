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
  article.querySelectorAll("img").forEach((img) => {
    if (skipSel && img.closest(skipSel)) return;
    const src =
      img.getAttribute("data-src") ||
      img.getAttribute("data-original") ||
      img.src;
    if (!src || addedImg.has(src)) return;
    addedImg.add(src);
    blocks.push({ type: "image", src, alt: img.alt || "" });
  });
  const seenText = new Set();
  const textSelectors = "p, h1, h2, h3, h4, h5, h6, li, blockquote, pre";
  article.querySelectorAll(textSelectors).forEach((el) => {
    if (skipSel && el.closest(skipSel)) return;
    const txt = (el.textContent || "").replace(/\s+/g, " ").trim();
    if (!txt) return;
    if (txt.length === 1 && /[\p{P}\p{S}]/u.test(txt)) return;
    if (seenText.has(txt)) return;
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
