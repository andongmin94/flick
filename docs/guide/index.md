# FLICK 시작하기

FLICK 는 커뮤니티 게시글을 **YouTube Shorts 스타일 세로 뷰어** 로 즉시 재구성하는 Chrome 확장입니다.

지원되는 사이트의 글 페이지에 진입하면 작은 배지(FLICK)가 나타나고, 클릭 또는 단축키(F4) 로 쇼츠 패널을 열고 닫을 수 있습니다.

이 가이드는 개발용 설치부터 기본 사용, 커스터마이징, 규칙(추출 로직) 확장까지 한 번에 다룹니다.

## 이 문서의 범위

이 문서는 `flick/packages` 코드 기준으로 작성됩니다.

- 확장 소스: `flick/packages`
- 문서 소스: `flick/docs`
- 구조 요약: [패키지 구성](./packages.md)

## 개발/로컬 설치

릴리즈 패키지가 아직 없다면 저장소를 클론 후 직접 빌드하여 로드할 수 있습니다.

```bash
git clone https://github.com/andongmin94/flick.git
cd flick/packages
npm install
npm run build   # dist = content/ (bundle.js, bundle.css)
```

Chrome → 주소창 `chrome://extensions` → 개발자 모드 On → "압축해제된 확장 프로그램을 로드" → `packages/content` 선택.

업데이트 시(코드 수정 후) `npm run build` 다시 실행 → 확장 페이지에서 새로고침 버튼 클릭.

## 지원 사이트 (기본 번들)

현재 버전이 내부 규칙으로 인식하는 게시글 페이지:

- fmkorea
- dcinside
- Naver Cafe
- DogDrip

규칙은 `packages/src/rules/*.ts` 에서 정의되며, `match` + `articleMatch` 정규식 조합으로 활성화 여부를 판단합니다.

## 기본 사용 흐름

1. 지원 게시글 페이지 접속 → 우측(혹은 body 끝) FLICK 배지 자동 삽입
2. 배지 클릭 또는 `F4` → 쇼츠 패널 오픈: 추출된 미디어(이미지, 비디오) + 텍스트 블록 순서대로 표시
3. 제목은 직접 수정 가능 (contentEditable)
4. 드래그로 텍스트 부분 강조 (자동 색상 적용) → 색상/초기화 패널에서 조정
5. 헤더/푸터 경계선 드래그로 패딩 높이 조절 (로컬 저장)
6. `Esc` 혹은 배지 토글로 닫기 → DOM/스크롤 상태 복원

## UI 구성 요소 한눈에 보기

| 요소 | 클래스 / 키 | 설명 |
|------|--------------|------|
| 토글 배지 | `.flick-logo-badge` | 열기/닫기 (data-open 속성) |
| 루트 래퍼 | `.flick-wrap-injected` | 패널 전체 컨테이너 (중복 삽입 방지) |
| 제목 | `.flick-title` | 인라인 편집 & 크기 로컬 저장 |
| 본문 미디어 | `.flick-img`, `.flick-video` | 이미지 / 비디오 요소 |
| 리사이즈 핸들 | `.flick-resize-handle` | 헤더 / 푸터 높이 조절 |
| 폰트/강조 패널 | `.flick-fontsize-panel` | 제목 사이즈 슬라이더 / 강조색 선택 |

## 저장되는 사용자 설정

LocalStorage를 사용하여 사용자 설정을 저장합니다.

| Key | 용도 |
|-----|------|
| `flick:titleFontSize` | 제목 폰트 크기(px) |
| `flick:headerHeight`, `flick:footerHeight` | 헤더/푸터 영역 높이 |
| `flick:highlightColor` | 현재 강조 span 색상 |

삭제 또는 브라우저 스토리지 비우기 → 기본값으로 초기화.

## 추출 블록 구조

각 사이트 규칙은 아래 형태의 데이터를 반환합니다.

```ts
type FlickBlock =
	| { type: 'image'; src: string; alt: string }
	| { type: 'video'; src: string; poster?: string }
	| { type: 'html'; html: string };

interface ExtractResult {
	title: string;
	blocks: FlickBlock[];
}
```

`ui.ts` 의 `buildUI()` 는 이 목록을 순서대로 렌더합니다. 비어 있거나 노이즈(댓글, 광고, 플레이어 컨트롤 잔여 텍스트)는 규칙 내부에서 제거합니다.

## 규칙 추가(확장) 빠른 가이드

1. 새 파일: `packages/src/rules/<site>.ts`
2. `match` (도메인 범위), `articleMatch` (실제 글 URL 패턴) 정규식 정의
3. `extract(ruleCfg)` 구현 → 제목 + 블록 수집 (예외 try/catch)
4. 필요 시 `prePrepare()` (원본 비디오 일시정지 등), `postShortsMounted()` (쇼츠 내 재생/autoplay 등) 훅 추가
5. `rules/index.ts` 의 배열에 import & push
6. `npm run build` 후 대상 페이지에서 콘솔 `FLICK.extractPost()` 로 결과 검증

자세한 패턴/샘플은 각 사이트 전용 문서 참고:

- [에펨코리아 규칙](./fmkorea.md)
- [디시인사이드 규칙](./dcinside.md)
- [개드립 규칙](./dogdrip.md)
- [네이버 카페 규칙](./naverCafe.md)

## 단축키

| 키 | 동작 |
|----|------|
| F4 | 패널 토글 (지원 페이지에서만 열림) |
| Esc | 패널이 열려 있을 때 닫기 |

추후 사용자 정의 단축키 지원 예정.

## 문제 해결 (Troubleshooting)

| 증상 | 원인 후보 | 해결 |
|------|-----------|------|
| 배지가 보이지 않음 | URL 패턴 미매칭 / SPA 전환 직후 | 새로고침 or 몇 초 후 / 콘솔 `location.href` 와 규칙 정규식 확인 |
| 비디오 자동재생 실패 | 브라우저 정책 / 탭 비활성 | 탭 포커스 후 다시 열기, 사운드 mute 상태 확인 |
| 레이아웃 깨짐 | 사이트 CSS 충돌 | 이슈 등록 (URL + 스크린샷) / 임시로 다른 사용자 스타일 확장 비활성화 |
| 강조 안 됨 | selection 범위 외 | 제목 편집 영역 안에서만 드래그되어야 적용 |

## 보안/프라이버시 메모

- 외부 서버 전송/애널리틱스 없음, 모든 파싱은 클라이언트 내 실행
- 그 어떠한 개인정보도 수집하지 않음

## 로드맵 (요약)

- 사용자 설정 패널 (폰트, 테마, 단축키)
- 추가 커뮤니티/블로그 규칙
- E2E 회귀 테스트 (Puppeteer)
- 다국어 문서 (영문)
