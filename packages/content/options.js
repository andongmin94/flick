(() => {
  const SUPPORTED = ["에펨코리아"]; // TODO: 향후 확장 시 manifest / rule 자동 동기화
  const domainList = document.getElementById('domainList');
  if (!domainList) return;
  for (const d of SUPPORTED) {
    const li = document.createElement('li');
    li.style.listStyle = 'none';
    li.innerHTML = `<span style="display:inline-flex;align-items:center;gap:6px;padding:6px 12px 6px 10px;border:1px solid #3a434d;background:#222a33;border-radius:999px;font:500 12px/1 'Noto Sans KR',system-ui;letter-spacing:.4px;color:#e3e9ef;box-shadow:0 2px 6px -2px rgba(0,0,0,.5),0 0 0 1px rgba(255,255,255,0.04) inset;">${d}<span style="width:8px;height:8px;border-radius:50%;background:linear-gradient(135deg,var(--accent1),var(--accent2));box-shadow:0 0 0 1px rgba(0,0,0,.4) inset,0 0 0 1px rgba(255,255,255,.25);"></span></span>`;
    domainList.appendChild(li);
  }
})();
