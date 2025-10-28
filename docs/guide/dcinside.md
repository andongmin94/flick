# 디시인사이드 추출 규칙

일반/마이너 갤러리 게시글을 표준 블록으로 변환.

## URL 매칭
- `match`: `/https?:\/\/gall\.dcinside\.com\//i`
- `articleMatch`: `/board\/view\/\?[^#]*?(?:&|^)no=\d+/i`

## Root & 제목
- 제목: `.title_subject` → fallback `document.title`
- 본문 후보: `.write_div`, `#container .write_view`, `.gallview_contents`, `#dgn_content_de`, `article`

## 노이즈 스킵 셀렉터
댓글, 추천, 광고, 첨부목록, 랭킹 위젯 등:
```
.recomm_box,
.user_comment,
.bottom_box,
.app_bottom_ad,
#recomm_layer,
.img_comment,
.img_comment_box,
.comment_wrap,
.view_comment,
.btn_recommend_box,
.recom_bottom_box,
.dctrend_ranking,
.appending_file_box,
#taboola-below-article-thumbnails,
.con_banner,
.sch_alliance_box,
.positionr,
.btn_imgcmtopen,
#dcappfooter
```

## DOM Walk 전략
- 순차 DFS
- IMG/VIDEO/BR 인라인 처리
- 블록요소(P/DIV/SECTION/Hn/LI 등) 경계에서 개행 삽입 → 연속 3개 이상 축소
- 빈 블록은 gap 로 간주, html 블록 끝에 `<br>` 최대 2회 까지 추가

## 텍스트 정리
- `\u00A0` → space
- 연속 공백 1개, 3+ 연속 개행 → 2개 제한
- 중복 문단(set) 제거

## 비디오
- `<video>` + 첫 `<source>` 우선 src
- `video` 블록 추가 후 그대로 (loop/mute 설정은 post hook 에서)

## Post Hook
- `postShortsMounted`: 쇼츠 패널 내 모든 비디오 `autoplay + loop + muted + playsInline`, 컨트롤 제거 → GIF 느낌

## 반환 예시
```json
{
  "title": "제목",
  "blocks": [
    { "type": "image", "src": "https://...jpg", "alt": "" },
    { "type": "video", "src": "https://...mp4" },
    { "type": "html",  "html": "문단A<br><br>문단B" }
  ]
}
```

## 한계/주의
- 글 하단에 동적 로딩되는 추가 이미지가 늦게 붙으면 최초 열기 때 누락될 수 있음 (리프레시 필요)
- 일부 광고 위젯 class 가 바뀌면 필터 미스 → 추후 heuristic 보강 필요

## 개선 아이디어
- 외부 썸네일(viewimage.php 리사이즈 파라미터) 원본화 옵션
- 긴 스티커/움짤 detect 후 자동 loop 정책 세분화
