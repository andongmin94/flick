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

  // 카드 높이 균일화 (넓은 화면에서 두 카드 나란히 있을 때만)
  const cards = Array.from(document.querySelectorAll('.grid > .card'));
  function equalizeCards() {
    if (!cards.length) return;
    // 두 개 이상이고 가로로 배치될 폭인지 체크 (첫 카드 top == 두번째 카드 top이면 같은 행)
    // 먼저 초기화
    cards.forEach(c => c.style.height = 'auto');
    if (window.innerWidth < 720) return; // 좁은 뷰포트에서는 쌓이므로 자동 높이
    const firstTop = cards[0].getBoundingClientRect().top;
    const sameRow = cards.every(c => Math.abs(c.getBoundingClientRect().top - firstTop) < 2);
    if (!sameRow) return; // 이미 줄바꿈 되었으면 스킵
    let max = 0;
    cards.forEach(c => { max = Math.max(max, c.getBoundingClientRect().height); });
    cards.forEach(c => c.style.height = max + 'px');
  }
  const ro = new ResizeObserver(() => equalizeCards());
  cards.forEach(c => ro.observe(c));
  window.addEventListener('resize', equalizeCards, { passive: true });
  window.addEventListener('load', equalizeCards);
  setTimeout(equalizeCards, 50); // 초기 스타일 적용 후 한 번 더
})();
