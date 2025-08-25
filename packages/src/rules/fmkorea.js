// src/rules/fmkorea.js (#bd_capture 내부 컨테이너 순서 + 내부 이미지/텍스트 분할)
export function extractFmkorea(cfg) {
  const root = document.querySelector("#bd_capture");
  const content = root && (root.querySelector(".xe_content") || root);
  const title =
    (root && (root.querySelector("h1,h2,h3")?.textContent || "").trim()) ||
    document.title ||
    "제목 없음";
  if (!content) return { title, blocks: [] };
  const skipSel = cfg && cfg.skipClosest;
  const blocks = [];
  const seenImg = new Set();
  const seenText = new Set();

  function normSrc(src) {
    if (!src) return "";
    if (src.startsWith("//")) return location.protocol + src;
    if (src.startsWith("/")) return location.origin + src;
    return src;
  }

  function pushImage(rawSrc, alt) {
    const src = normSrc(rawSrc);
    if (!src || seenImg.has(src)) return;
    seenImg.add(src);
    blocks.push({ type: "image", src, alt: alt || "" });
  }

  function cleanText(t) {
    return t
      .replace(/\u00A0/g, " ")
      .replace(/\s+$/g, "")
      .replace(/^\s+/g, "")
      .replace(/[ \t]+/g, " ")
      .replace(/\n{2,}/g, "\n")
      .trim();
  }

  function addGap() {
    const last = blocks[blocks.length - 1];
    if (!last || last.type !== "html") return; // 시작 부분 gap은 무시
    const m = last.html.match(/(?:<br\s*\/?>)+$/i);
    const count = m ? (m[0].match(/<br/gi) || []).length : 0;
    if (count >= 2) return; // 최대 2개까지만
    last.html += "<br>";
  }

  function flushBuffer(buf) {
    const raw = buf.join("");
    const cleaned = cleanText(raw);
    if (!cleaned) {
      if (/\n+/.test(raw)) addGap();
      return;
    }
    if (seenText.has(cleaned)) return; // 동일 문단 중복 제거
    seenText.add(cleaned);
    const html = cleaned
      .split(/\n+/)
      .map((line) => line.trim())
      .filter(Boolean)
      .join("<br>");
    if (html) blocks.push({ type: "html", html });
  }

  function isGapElement(el) {
    if (!el || el.nodeType !== 1) return false;
    if (el.querySelector("img,pre")) return false;
    const html = el.innerHTML.replace(/\u00A0/g, " ").trim();
    if (!html) return true;
    return /^(?:<br\s*\/?>|\s)+$/i.test(html);
  }

  function walkInline(node, buf) {
    if (!node) return;
    if (node.nodeType === 1) {
      // ELEMENT
      const el = node;
      if (skipSel && el.closest(skipSel)) return;
      const tag = el.tagName;
      if (tag === "P") {
        // 문단 경계로 보고 독립 처리
        flushBuffer(buf);
        buf.length = 0;
        if (isGapElement(el)) {
          addGap();
          return;
        }
        const pBuf = [];
        for (const child of Array.from(el.childNodes)) walkInline(child, pBuf);
        flushBuffer(pBuf);
        return;
      }
      if (tag === "IMG") {
        // flush text before image
        flushBuffer(buf);
        buf.length = 0;
        const src =
          el.getAttribute("data-original") ||
          el.getAttribute("data-src") ||
          el.getAttribute("src");
        pushImage(src, el.getAttribute("alt") || "");
        return;
      }
      if (tag === "VIDEO") {
        flushBuffer(buf);
        buf.length = 0;
        // video src 우선순위: source[src] > video[src] > data-original
        let vSrc = "";
        const sourceEl = el.querySelector("source[src]");
        if (sourceEl) vSrc = sourceEl.getAttribute("src");
        if (!vSrc) vSrc = el.getAttribute("src");
        if (!vSrc) vSrc = el.getAttribute("data-original");
        if (vSrc) {
          if (vSrc.startsWith("//")) vSrc = location.protocol + vSrc;
          else if (vSrc.startsWith("/")) vSrc = location.origin + vSrc;
          blocks.push({
            type: "video",
            src: vSrc,
            poster: el.getAttribute("poster") || "",
          });
        }
        return;
      }
      if (tag === "PRE") {
        flushBuffer(buf);
        buf.length = 0;
        blocks.push({ type: "html", html: el.outerHTML });
        return;
      }
      if (tag === "BR") {
        buf.push("\n");
        return;
      }
      if (isGapElement(el)) {
        flushBuffer(buf);
        buf.length = 0;
        addGap();
        return;
      }
      // Anchor: descend (이미지/텍스트 혼재 가능)
      // Generic container: descend.
      for (const child of Array.from(el.childNodes)) {
        walkInline(child, buf);
      }
      return;
    } else if (node.nodeType === 3) {
      // TEXT
      const text = node.nodeValue.replace(/\s+/g, " ");
      if (text.trim()) buf.push(text);
    }
  }

  // 1) 비디오 존재 시: 모든 비디오(중복 src 제거) + 마지막 비디오 이후의 실제 텍스트만 추출
  const videoEls = Array.from(content.querySelectorAll("video"));
  if (videoEls.length) {
    const seenVideoSrc = new Set();
    const orderedVideos = [];
    videoEls.forEach((v) => {
      // src 우선순위: source[src] > video[src] > data-original
      let vSrc =
        v.querySelector("source[src]")?.getAttribute("src") ||
        v.getAttribute("src") ||
        v.getAttribute("data-original") ||
        "";
      if (vSrc) {
        if (vSrc.startsWith("//")) vSrc = location.protocol + vSrc;
        else if (vSrc.startsWith("/")) vSrc = location.origin + vSrc;
        if (!seenVideoSrc.has(vSrc)) {
          seenVideoSrc.add(vSrc);
          orderedVideos.push({
            el: v,
            src: vSrc,
            poster: v.getAttribute("poster") || "",
          });
        }
      }
    });
    // 비디오 블록 추가 (순서 유지)
    orderedVideos.forEach((obj) => {
      blocks.push({ type: "video", src: obj.src, poster: obj.poster });
    });

    // 마지막 비디오 이후 텍스트 수집
    const lastVideo = orderedVideos[orderedVideos.length - 1].el;
    const forbiddenClassRe =
      /(mejs-|mejs__|control|player|volume|progress|time|screen|sr-only|blind|tooltip|aria)/i;
    const textBuf = [];

    // 재생 컨트롤 노이즈 텍스트 패턴 필터
    function isNoiseText(t) {
      if (!t) return true; // 빈 공백 성격
      const s = t.trim();
      if (!s) return true;
      // 단독 슬래시
      if (s === "/") return true;
      // 단독 속도표시: '1x', '1.00x', '/ 1.00x'
      if (/^\/?\s*\d+(?:\.\d+)?x$/i.test(s)) return true;
      // 진행 시간: '00:12', '1:02:33'
      if (/^(?:\d{1,2}:)?\d{1,2}:\d{2}$/.test(s)) return true;
      // 전체 시간 형태: '00:12 / 01:34'
      if (
        /^(?:\d{1,2}:)?\d{1,2}:\d{2}\s*\/\s*(?:\d{1,2}:)?\d{1,2}:\d{2}$/.test(s)
      )
        return true;
      // 조합된 속도 구문 포함: '/ 1.00x' 같은 잔여
      if (/\/\s*\d+(?:\.\d+)?x$/i.test(s)) return true;
      // 접근성 안내 문구 (영문 위주)
      if (/^Video Player$/i.test(s)) return true;
      return false;
    }

    function isForbiddenElement(el) {
      if (!el || el.nodeType !== 1) return false;
      if (skipSel && el.closest(skipSel)) return true;
      const cls = el.className || "";
      if (typeof cls === "string" && forbiddenClassRe.test(cls)) return true;
      const tag = el.tagName;
      if (/^(SCRIPT|STYLE|VIDEO|SOURCE|AUDIO|IFRAME)$/i.test(tag)) return true;
      return false;
    }

    function nextNode(node, boundary) {
      if (!node) return null;
      if (node.firstChild) return node.firstChild;
      while (node) {
        if (node === boundary) return null;
        if (node.nextSibling) return node.nextSibling;
        node = node.parentNode;
      }
      return null;
    }

    let cur = nextNode(lastVideo, content); // 마지막 비디오 다음 노드부터 시작
    while (cur) {
      // boundary check already in nextNode
      if (cur.nodeType === 1) {
        if (!isForbiddenElement(cur)) {
          // 줄바꿈 의미가 있는 block-level 태그면 개행 삽입
          if (
            /^(P|DIV|BR|SECTION|ARTICLE|LI|UL|OL|H1|H2|H3|H4|H5|H6)$/i.test(
              cur.tagName
            )
          ) {
            if (cur.tagName === "BR") textBuf.push("\n");
            // 텍스트 노드는 별도 처리, element 자체의 textContent 직접 사용하지 않고 child 순회
          }
        }
      } else if (cur.nodeType === 3) {
        const parent = cur.parentNode;
        if (!isForbiddenElement(parent)) {
          const t = cur.nodeValue.replace(/\s+/g, " ");
          if (t.trim() && !isNoiseText(t)) textBuf.push(t);
        }
      }
      cur = nextNode(cur, content);
    }

    const rawTrailing = textBuf.join("").replace(/\n{3,}/g, "\n\n");
    // 라인 단위로 한 번 더 노이즈 제거
    const filteredLines = rawTrailing
      .split(/\n+/)
      .map((l) => l.trim())
      .filter((l) => l && !isNoiseText(l));
    const cleanedTrailing = cleanText(filteredLines.join("\n"));
    if (cleanedTrailing) {
      // 기존 flushBuffer 중복 제거 로직 재사용을 위해 직접 검사
      if (!seenText.has(cleanedTrailing)) {
        seenText.add(cleanedTrailing);
        const html = cleanedTrailing
          .split(/\n+/)
          .map((l) => l.trim())
          .filter(Boolean)
          .join("<br>");
        if (html) blocks.push({ type: "html", html });
      }
    }
    return { title, blocks };
  }

  // 2) 비디오 없을 때: 루트 직속 텍스트 먼저 수집 후 요소 파싱
  const rootTextBuf = [];
  for (const node of Array.from(content.childNodes)) {
    if (node.nodeType === 3) {
      // TEXT
      const t = node.nodeValue.replace(/\s+/g, " ");
      if (t.trim()) rootTextBuf.push(t);
    }
  }
  flushBuffer(rootTextBuf);

  const containers = Array.from(content.children);
  containers.forEach((container) => {
    const buf = [];
    walkInline(container, buf);
    flushBuffer(buf);
  });

  return { title, blocks };
}

// ---------------- fmkorea 전용 비디오 볼륨/재생 훅 ----------------
let __fmkVideoVolumes = {};
export function preFmkoreaPrepare() {
  // 원본 비디오 볼륨 스냅샷 & 자동재생 중지
  __fmkVideoVolumes = {};
  document.querySelectorAll("#bd_capture video").forEach((v) => {
    try {
      const src =
        v.getAttribute("src") ||
        v.querySelector("source[src]")?.getAttribute("src") ||
        v.getAttribute("data-original") ||
        "";
      if (src && !(src in __fmkVideoVolumes)) __fmkVideoVolumes[src] = v.volume;
      v.pause();
      v.removeAttribute("autoplay");
    } catch (_) {}
  });
}
export function postFmkoreaShortsMounted() {
  // 쇼츠 내 비디오 자동재생 & 볼륨 복원
  const vids = document.querySelectorAll(".flick-wrap-injected video");
  vids.forEach((v) => {
    try {
      v.autoplay = true;
      // 원본 볼륨 적용 전 mute 해제 (필요시 재생 실패 대응)
      v.muted = false;
      const src = v.getAttribute("src");
      if (src && __fmkVideoVolumes[src] != null)
        v.volume = __fmkVideoVolumes[src];
      else if (!src && Object.keys(__fmkVideoVolumes).length === 1) {
        v.volume = Object.values(__fmkVideoVolumes)[0];
      }
      v.play().catch(() => {});
    } catch (_) {}
  });
}

// rule 객체 (sites.js 대체용). id는 기존 ruleId 대응.
export const fmkoreaRule = {
  id: "fmkorea",
  match: /https?:\/\/(www\.)?fmkorea\.com\//i,
  articleMatch: /(\/best\/)|\/(\d+)(?:$|[?#])|document_srl=\d+/i,
  skipClosest: ".document_address",
  extract: extractFmkorea,
  prePrepare: preFmkoreaPrepare,
  postShortsMounted: postFmkoreaShortsMounted,
};
