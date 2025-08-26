# 네이버 카페 규칙

`/cafes/<숫자>/articles/` 경로의 새 에디터(se-) 기반 게시글을 파싱.

## URL 매칭
- `match`: `/https?:\/\/cafe\.naver\.com\//i`
- `articleMatch`: `/\/cafes\/\d+\/articles\//i`

## Root 탐색
1. `.se-main-container`
2. `#app .se-main-container`
3. `#cafe_main` iframe 내부 동일 선택자
4. Fallback: `document.body`

## 제목 결정 로직
1. `<h3 class="title_text">` (iframe 포함) 존재하면 우선
2. 없으면 `<title>` 텍스트에서 카페명 접두부 `xxx: ` 제거

## 컴포넌트 파싱 순서
- `.se-component` 나열 순으로 처리
- 타입별:
  - `.se-text`: `p.se-text-paragraph` → 빈 p 는 gap (`\n\n`), 링크 노이즈(단일 URL) 필터
  - `.se-oembed`: (요청) 스킵 (외부 동영상 카드 제거)
  - OG Link: `.se-section-oglink` or `.se-module-oglink` → 썸네일/제목/요약/URL 구조화하여 커스텀 HTML 카드 (`.flick-oglink`)
  - `.se-image`: 내부 모든 `img[src]` → image 블록
  - Sticker: `.se-sticker-image` → image 블록 (alt="sticker")

## Fallback 처리
- 컴포넌트 기반 결과가 비거나 거의 없을 때: 전체 root 복제 → script/style/nav 제거 → 광역 텍스트 스캔
- 메뉴/헤더 노이즈 판단 heuristic (`isMenuNoise`) 로 매우 짧거나 메뉴 위주 텍스트 제외

## 텍스트 정리
- Zero-width / NBSP 제거
- 4+ 연속 개행 → 2개
- 링크 노이즈: 공백 없는 단일 URL 라인 제외
- `\n\n` → `<br><br>`, 단일 `\n` → `<br>`

## 블록 예시
```json
{
  "title": "카페 게시글 제목",
  "blocks": [
    { "type": "image", "src": "https://...jpg", "alt": "" },
    { "type": "html",  "html": "문단1<br><br>문단2" },
    { "type": "html",  "html": "<div class=\"flick-oglink\">…</div>" }
  ]
}
```

## Placeholder
- 의미있는 블록이 최종적으로 없을 때: 안내 placeholder HTML 블록 삽입 (사용자 혼란 방지)

## 개선 아이디어
- OG Link 카드 다크모드 스타일 추가
- 이미지 그룹이 많은 글의 지연 로딩(src 교체) 재시도
- `oembed` 내 동영상 → 선택적(옵션 기반) 허용 기능
