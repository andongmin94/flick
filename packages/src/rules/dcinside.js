// src/rules/dcinside.js - DCInside (일반/마이너 갤러리) 게시글 추출
// URL 예: https://gall.dcinside.com/board/view/?id=dcbest&no=358580
//        https://gall.dcinside.com/mgallery/board/view/?id=github&no=83515&page=1

function normUrl(src) {
  if (!src) return "";
  if (src.startsWith("//")) return location.protocol + src;
  if (src.startsWith("/")) return location.origin + src;
  return src;
}

export function extractDcinside(ruleCfg) {
  // 제목
  let title =
    document.querySelector(".title_subject")?.textContent?.trim() ||
    document.title ||
    "제목 없음";

  // 본문 컨테이너 후보 (환경에 따라 class 변동 대비 다중 후보)
  const content =
    document.querySelector(".write_div") ||
    document.querySelector("#container .write_view") ||
    document.querySelector(".gallview_contents") ||
    document.querySelector("#dgn_content_de") ||
    document.querySelector("article") ||
    null;
  if (!content)
    return {
      title,
      blocks: [],
    };

  const blocks = [];
  const seenImg = new Set();
  const seenText = new Set();

  // 스킵할 공통 선택자 (댓글/광고/추천/첨부목록/위젯/배너 등)
  const SKIP_SELECTOR = [
    ".recomm_box",
    ".user_comment",
    ".bottom_box",
    ".app_bottom_ad",
    "#recomm_layer",
    ".img_comment",
    ".img_comment_box",
    ".comment_wrap",
    ".view_comment",
    ".btn_recommend_box",
    ".recom_bottom_box",
    ".dctrend_ranking",
    ".appending_file_box", // 원본 첨부파일 목록 (이미지 파일명들은 이미 본문 이미지와 중복)
    "#taboola-below-article-thumbnails",
    ".con_banner",
    ".sch_alliance_box",
    ".positionr", // 랭킹/광고 wrapper
  ".btn_imgcmtopen", // 이미지 댓글 열기 버튼
  ].join(",");

  function pushImage(raw, alt) {
    const src = normUrl(raw);
    if (!src || seenImg.has(src)) return;
    // 광고/통계 gif 필터
    if (/pixel|ads|banner/i.test(src)) return;
  // dcinside viewimage.php 외부 크기/썸네일 변형 파라미터 그대로 사용 (필요시 리사이즈 파라미터 정규화 가능)
  let cleanAlt = (alt || "").trim();
  // 의미 없는 긴 해시 alt 제거
  if (/^[a-f0-9]{24,}$/i.test(cleanAlt) || cleanAlt.length > 120) cleanAlt = "";
    seenImg.add(src);
  blocks.push({ type: "image", src, alt: cleanAlt });
  }

  function cleanText(t) {
    return t
      .replace(/\u00A0/g, " ")
      .replace(/[ \t]+/g, " ")
      .replace(/\n{3,}/g, "\n\n")
      .trim();
  }

  // DCInside 본문은 이미지 + <br> 혼합 구조가 흔함 → 순차 DOM walk
  function walk(node, buf) {
    if (!node) return;
    if (node.nodeType === 1) {
      const el = node;
      // 스킵 영역 (댓글, 추천박스, 광고 등)
  if (el.matches(SKIP_SELECTOR)) return;
  // style="clear:both" 같은 정리용 div 스킵
  const inlineStyle = el.getAttribute("style") || "";
  if (/clear\s*:\s*both/i.test(inlineStyle)) return;
  const tagName = el.tagName;
  // 태그 레벨 스킵
  if (/^(SCRIPT|STYLE|IFRAME|TEMPLATE|NOSCRIPT)$/i.test(tagName)) return;
  // 번호 표시 span.num & 버튼류 제거
  if (el.classList.contains("num") || el.classList.contains("btn")) return;
      const tag = el.tagName;
      if (tag === "IMG") {
        flush(buf);
        const src =
          el.getAttribute("data-original") ||
          el.getAttribute("data-src") ||
          el.getAttribute("src");
        pushImage(src, el.getAttribute("alt") || "");
        return;
      }
      if (tag === "VIDEO") {
        flush(buf);
        let vSrc =
          el.querySelector("source[src]")?.getAttribute("src") ||
          el.getAttribute("src") ||
          el.getAttribute("data-original") ||
          "";
        if (vSrc) blocks.push({ type: "video", src: normUrl(vSrc) });
        return;
      }
      if (tag === "BR") {
        buf.push("\n");
        return;
      }
      if (/^(P|DIV|SECTION|ARTICLE|LI|UL|OL|H[1-6])$/.test(tag)) {
        // Block 경계 전환 처리: 기존 버퍼에 개행 삽입
        if (buf.length && !/\n$/.test(buf[buf.length - 1])) buf.push("\n");
      }
      for (const child of el.childNodes) walk(child, buf);
      return;
    } else if (node.nodeType === 3) {
      const text = node.nodeValue.replace(/\s+/g, " ");
      if (text.trim()) buf.push(text);
    }
  }

  function flush(buf) {
    if (!buf.length) return;
    const raw = buf.join("");
    buf.length = 0;
    const cleaned = cleanText(raw);
    if (!cleaned) return;
    if (seenText.has(cleaned)) return;
    seenText.add(cleaned);
    const html = cleaned
      .split(/\n+/)
      .map((l) => l.trim())
      .filter(Boolean)
      .join("<br>");
    if (html) blocks.push({ type: "html", html });
  }

  const buf = [];
  for (const node of content.childNodes) walk(node, buf);
  flush(buf);

  return { title, blocks };
}

export const dcinsideRule = {
  id: "dcinside",
  match: /https?:\/\/gall\.dcinside\.com\//i,
  // board/view/?id=...&no=숫자 (mgallery 경로 포함) 인지 확인
  articleMatch: /board\/view\/\?[^#]*?(?:&|^)no=\d+/i,
  extract: extractDcinside,
};
