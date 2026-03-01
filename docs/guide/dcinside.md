# 디시인사이드 추출 규칙

디시인사이드(DCinside)의 일반 갤러리·마이너 갤러리 게시글에서 본문 콘텐츠를 깔끔하게 뽑아내는 규칙입니다.

광고, 댓글, 추천 영역 등 불필요한 요소를 걸러내고, 이미지·동영상·텍스트를 표준 블록 구조로 변환해 Shorts 패널에서 보여줄 수 있도록 만들어 줍니다.

## URL 매칭

Flick이 디시인사이드 페이지인지 판별할 때 아래 정규식을 사용합니다.

| 항목 | 패턴 |
|------|-------|
| 사이트 매칭 | `/https?:\/\/gall\.dcinside\.com\//i` |
| 게시글 매칭 | `/board\/view\/\?[^#]*?(?:&|^)no=\d+/i` |

## 제목과 본문 탐색

게시글 제목은 `.title_subject` 셀렉터에서 먼저 찾고, 없으면 `document.title`을 대신 사용합니다.

본문 영역은 여러 후보 중 실제로 존재하는 첫 번째 요소를 선택합니다.

```
.write_div
#container .write_view
.gallview_contents
#dgn_content_de
article
```

## 노이즈 스킵 셀렉터

댓글, 추천 박스, 광고, 첨부파일 목록, 랭킹 위젯 등 본문과 관련 없는 요소가 섞이지 않도록 아래 셀렉터에 해당하는 영역은 전부 건너뜁니다.

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

본문 DOM을 순차적으로 깊이 우선 탐색(DFS)하면서 콘텐츠를 수집합니다.

- `IMG`, `VIDEO`, `BR` 같은 인라인 요소는 만나는 즉시 처리합니다.
- `P`, `DIV`, `SECTION`, `Hn`, `LI` 등 블록 요소의 경계에서는 개행을 삽입하되, 연속 3개 이상이 되면 자동으로 줄여 줍니다.
- 내용이 없는 빈 블록은 간격(gap)으로 취급하고, HTML 블록 끝에 `<br>`을 최대 2개까지만 붙입니다.

## 텍스트 정리

추출된 텍스트는 한 번 더 깔끔하게 정리합니다.

- `\u00A0`(Non-Breaking Space)은 일반 공백으로 바꿉니다.
- 연속된 공백은 1개로, 3줄 이상 연속 개행은 2줄로 제한합니다.
- 중복되는 문단은 Set을 이용해 제거합니다.

## 비디오 처리

`<video>` 태그를 만나면 내부의 첫 번째 `<source>`에서 src를 가져와 `video` 블록으로 추가합니다. 자동재생이나 반복 재생 같은 설정은 추출 단계가 아닌 Post Hook에서 별도로 적용합니다.

## Post Hook

`postShortsMounted` 훅에서는 쇼츠 패널 안의 모든 비디오에 `autoplay`, `loop`, `muted`, `playsInline` 속성을 부여하고 컨트롤 UI를 제거합니다. 덕분에 마치 GIF처럼 자연스럽게 반복 재생되는 느낌을 줄 수 있습니다.

## 반환 예시

최종적으로 아래와 같은 구조의 데이터가 반환됩니다.

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

## 한계 / 주의

::: warning 알아두세요
- 글 하단에 동적으로 로딩되는 이미지가 있을 경우, 최초 열기 시점에 아직 로드되지 않아 누락될 수 있습니다. 이럴 때는 한 번 새로고침하면 정상적으로 표시됩니다.
- 디시인사이드 측에서 광고 위젯의 class 이름을 변경하면 필터가 제대로 동작하지 않을 수 있습니다. 이런 경우 heuristic 기반 보강이 필요합니다.
:::

## 개선 아이디어

- **원본 이미지 옵션**: 외부 썸네일(`viewimage.php`의 리사이즈 파라미터)을 원본 해상도로 전환하는 옵션을 추가하면 좋겠습니다.
- **자동 loop 세분화**: 긴 스티커나 움짤을 감지한 뒤, 콘텐츠 유형에 따라 반복 재생 정책을 다르게 적용하는 것도 고려해 볼 만합니다.
