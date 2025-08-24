// src/ui.js
export function buildUI(data) {
  if (document.querySelector(".flick-wrap-injected")) return;
  const wrap = document.createElement("div");
  wrap.className = "flick-wrap-injected";
  const stage = document.createElement("div");
  stage.className = "flick-stage flick-fade-in";
  const header = document.createElement("div");
  header.className = "flick-header";
  const title = document.createElement("div");
  title.className = "flick-title";
  title.textContent = data.title;
  title.contentEditable = "true";
  title.spellcheck = false;
  title.title = "제목 수정 가능";
  const suppress = (e) => {
    if (document.activeElement === title) {
      if (e.type === "keydown" && e.key === "Enter") e.preventDefault();
      e.stopImmediatePropagation();
    }
  };
  ["keydown", "keypress", "keyup"].forEach((t) =>
    window.addEventListener(t, suppress, true)
  );
  header.appendChild(title);
  const body = document.createElement("div");
  body.className = "flick-body";
  data.blocks.forEach((b) => {
    if (b.type === "image") {
      const img = document.createElement("img");
      img.className = "flick-img";
      img.src = b.src;
      img.alt = b.alt || "";
      body.appendChild(img);
    } else if (b.type === "video") {
      const wrap = document.createElement("div");
      wrap.className = "flick-block";
      const vid = document.createElement("video");
      vid.className = "flick-video";
      vid.src = b.src;
      if (b.poster) vid.poster = b.poster;
      vid.controls = true;
      vid.playsInline = true;
      vid.preload = "metadata";
      wrap.appendChild(vid);
      body.appendChild(wrap);
    } else if (b.type === "html") {
      const div = document.createElement("div");
      div.className = "flick-block";
      div.innerHTML = b.html;
      body.appendChild(div);
    }
  });
  const footer = document.createElement("div");
  footer.className = "flick-footer";
  footer.innerHTML = "<span>Flick Prototype</span>";
  // 리사이즈 핸들 생성 (헤더 아래, 푸터 위)
  const handleHeader = document.createElement("div");
  handleHeader.className = "flick-resize-handle flick-resize-header";
  const handleFooter = document.createElement("div");
  handleFooter.className = "flick-resize-handle flick-resize-footer";
  stage.appendChild(header);
  stage.appendChild(handleHeader);
  stage.appendChild(body);
  stage.appendChild(handleFooter);
  stage.appendChild(footer);
  wrap.appendChild(stage);
  document.body.appendChild(wrap);
  document.body.classList.add("flick-body-lock");
  document.addEventListener(
    "keydown",
    function onKey(e) {
      if (e.key === "Escape") closeShorts();
    },
    { once: true }
  );

  // 드래그 리사이즈 로직
  const state = { dragging: null, startY: 0, startH: 0 };
  const KEY_HEADER = "flick:headerHeight";
  const KEY_FOOTER = "flick:footerHeight";
  // 저장된 높이 복원
  try {
    const hH = parseInt(localStorage.getItem(KEY_HEADER) || "", 10);
    if (!isNaN(hH) && hH > 0) header.style.height = hH + "px";
    const fH = parseInt(localStorage.getItem(KEY_FOOTER) || "", 10);
    if (!isNaN(fH) && fH > 0) footer.style.height = fH + "px";
  } catch (_) {}
  function onDown(e) {
    const target = e.target;
    if (target.classList.contains("flick-resize-handle")) {
      state.dragging = target.classList.contains("flick-resize-header")
        ? "header"
        : "footer";
      state.startY = e.clientY;
      state.startH =
        state.dragging === "header" ? header.offsetHeight : footer.offsetHeight;
      target.classList.add("active");
      document.addEventListener("mousemove", onMove);
      document.addEventListener("mouseup", onUp, { once: true });
      e.preventDefault();
    }
  }
  function onMove(e) {
    if (!state.dragging) return;
    const dy = e.clientY - state.startY;
    if (state.dragging === "header") {
      let next = state.startH + dy;
      if (next < 20) next = 20; // 너무 작아지면 최소 20px
      header.style.height = next + "px";
    } else if (state.dragging === "footer") {
      let next = state.startH - dy;
      if (next < 16) next = 16;
      footer.style.height = next + "px";
    }
  }
  function onUp() {
    document
      .querySelectorAll(".flick-resize-handle.active")
      .forEach((h) => h.classList.remove("active"));
    state.dragging = null;
    document.removeEventListener("mousemove", onMove);
    // 높이 저장
    try {
      if (header.style.height) {
        localStorage.setItem(KEY_HEADER, parseInt(header.style.height, 10));
      }
      if (footer.style.height) {
        localStorage.setItem(KEY_FOOTER, parseInt(footer.style.height, 10));
      }
    } catch (_) {}
  }
  stage.addEventListener("mousedown", onDown);
}

export function closeShorts() {
  const wrap = document.querySelector(".flick-wrap-injected");
  if (!wrap) return;
  wrap.remove();
  document.body.classList.remove("flick-body-lock");
}
