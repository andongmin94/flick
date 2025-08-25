(() => {
  const SUPPORTED = [
    { label: "에펨코리아", url: "https://www.fmkorea.com" }
  ]; // TODO: 향후 확장 시 manifest / rule 자동 동기화
  const domainList = document.getElementById('domainList');
  if (!domainList) return;
  for (const site of SUPPORTED) {
    const li = document.createElement('li');
    li.style.listStyle = 'none';
    li.innerHTML = `<a href="${site.url}" target="_blank" rel="noopener" class="domain-pill" data-domain="${site.url}">${site.label}<span class="dot"></span></a>`;
    domainList.appendChild(li);
  }
})();
