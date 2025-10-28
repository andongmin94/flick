# 개드립 규칙

다양한 경로 패턴(`/숫자`, `/dogdrip/숫자`, `/doc/숫자`)의 문서를 파싱.

## URL 매칭
- `match`: `/https?:\/\/(?:www\.)?dogdrip\.net\//i`
- `articleMatch`: `/\/(?:((dogdrip|doc)\/)?\d+)(?:$|[?#])/`

## Root & 제목
- 우선 meta `og:title` → 없으면 대표 제목 후보 셀렉터 → fallback `document.title`
- 본문 1차 target: `div.rhymix_content.xe_content[class*='document_']`
- Fallback: `.ed`, `.document_view`, `.view_content`, `.read_body`, `.content_body`, `article`, `#content`, `body`

## 파서 두 가지 경로
1. Primary 컨테이너 발견: 내부 `p` 순회 전용 최적화
   - 각 `p` 내 이미지 즉시 image 블록
   - 텍스트는 비어있지 않으면 pending 배열 → flush 시 중복 제거 + 개행 정규화
2. Fallback: 범용 DFS (`walk`) 로 IMG/VIDEO/BR/블록 경계 처리

## 노이즈 필터
- 댓글 / 공유 / 태그 / 광고 / 배너 / pagination / aside 등 SKIP_SELECTOR
- ALT 가 긴 해시 또는 80자 초과 → ALT 제거
- 링크 노이즈 (단일 URL 라인) 제거
- Level 표기 `[레벨:숫자]` 패턴 제거

## 비디오 처리
- `<video>` + 내부 `<source>` 우선 src → `video` 블록 (poster 유지)
- 추가 후 autoplay/mute/loop 는 후처리에서 제어 가능 (현 버전은 별도 hook 없음)

## Placeholder
- 블록이 전혀 없을 때 카페 규칙과 동일한 empty placeholder 삽입

## 반환 예시
```json
{
  "title": "문서 제목",
  "blocks": [
    { "type": "image", "src": "https://...jpg", "alt": "" },
    { "type": "html",  "html": "문단1<br>문단2" }
  ]
}
```

## 개선 아이디어
- 투표/설문 위젯 감지 후 요약 형식 HTML 블록으로 치환
- GIF vs Video 판단하여 loop 정책 차등 적용
- 긴 코드/인용 blockquote 전용 스타일 추가
