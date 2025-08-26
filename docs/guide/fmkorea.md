# 에펨코리아 추출 규칙

에펨코리아 게시글(#bd_capture 기준)을 Shorts 패널용 블록 구조로 변환하는 로직 요약.

## URL 매칭
- `match`: `/https?:\/\/(www\.)?fmkorea\.com\//i`
- `articleMatch`: 베스트(/best/) 또는 숫자 document_srl, 쿼리 `document_srl=` 포함 판단

## 주요 선택자 & Root
- 루트: `#bd_capture`
- 본문 우선: `#bd_capture .xe_content` 존재 시 사용, 없으면 루트 자체
- 제목: `h1|h2|h3` 텍스트 → fallback `document.title`

## 처리 순서 개략
1. 비디오 존재 여부 검사 → 있으면 모든 비디오 src 중복 제거 후 순서대로 `video` 블록 선추가
2. 마지막 비디오 이후의 실제 텍스트만 추출 (플레이어 컨트롤/시간/배속 등 노이즈 필터)
3. 비디오가 없다면 전통적 DOM walk:
   - 이미지/비디오/`pre` 즉시 flush 후 블록화
   - `p` 단위 문단 경계 처리 + gap(`br`) 개수 2개 제한
   - 중복 텍스트/이미지 제거 Set 관리
4. src 정규화: `//` → 프로토콜, `/` → origin prefix

## 노이즈 필터링
- Video 컨트롤 텍스트 패턴: 시간(`00:12 / 01:34`), 속도(`1.00x`) 등 제거
- 빈 문단/중복 문단 제거, 연속 개행 축소(최대 2)

## Hooks
- `prePrepare`: 원본 페이지 내 비디오 자동재생 중지 & 현재 volume 스냅샷 저장
- `postShortsMounted`: 쇼츠 패널 비디오 autoplay + 원본 volume 복원 (mute 해제 시도)

## 반환 예시
```json
{
  "title": "게시글 제목",
  "blocks": [
    { "type": "video", "src": "https://...mp4", "poster": "" },
    { "type": "image", "src": "https://...jpg", "alt": "" },
    { "type": "html",  "html": "문단1<br>문단2" }
  ]
}
```

## 한계 / 주의
- 매우 복잡한 embed(투표/위젯)는 현재 통째로 스킵
- iframe 내 콘텐츠는 추출 대상 아님
- 레이아웃 변경 시 `#bd_capture` 이름이 바뀌면 규칙 수정 필요

## 개선 아이디어
- 코드블록(`pre > code`) syntax highlight 적용
- 이미지 ALT 가 해시/잡문일 때 heuristics 확대
- 비디오 썸네일 생성 (poster 미존재 시 첫 frame 캡처)
