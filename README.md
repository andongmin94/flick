<div align="center">

<img src="https://flick.andongmin.com/flick.svg" alt="FLICK" height="200" />

</div>

# FLICK

유머 / 커뮤니티 게시글을 한 번에 **YouTube Shorts 스타일(세로 스크롤 미디어 뷰어)** 로 재구성해 주는 브라우저 확장(Chrome Manifest v3)입니다.

지원 게시글 페이지에서 자동으로 작은 토글 배지가 나타나며, 클릭 또는 단축키(F4)로 "쇼츠" 패널을 열고 닫을 수 있습니다.

## 주요 특징

- 지원 사이트 감지: fmkorea, dcinside, Naver Cafe(새 에디터), DogDrip 의 게시글 페이지를 URL 패턴 + 추가 필터로 식별
- 규칙 기반 추출: 사이트별 `rules/*.js` 모듈이 제목과 본문을 표준 블록 구조(`image | video | html`)로 변환
- 단일 번들: Vite 빌드로 `bundle.js / bundle.css` (content script + 스타일) 생성 → 로딩/충돌 최소화
- 즉시 토글: 화면 우측(또는 body 내) `FLICK` 배지 클릭 혹은 `F4` 키로 열기/닫기
- 제목 인라인 편집 및 크기 조절 (로컬 저장)
- 텍스트 드래그 자동 강조 & 강조 색상 선택, 전체 강조 해제 버튼 제공
- 헤더/푸터 높이 드래그 리사이즈 + 개인화 값 localStorage 유지
- 중복/노이즈 필터: 광고, 댓글, 컨트롤러, 접근성/플레이어 잔여 텍스트 자동 제거
- 사이트 특화 후처리 훅: (예) fmkorea 원본 비디오 일시정지 → 쇼츠 패널 자동재생 / dcinside 비디오 mute loop

## 폴더 구조 개요

```
flick/
 ├─ docs/                 # VitePress 기반 문서 (사이트 hero 등)
 └─ packages/           
     ├─ src/
     │   ├─ entry.js/     # content script 진입, 버튼 & 라우트 감시, API publish
     │   ├─ ui.js/        # 쇼츠 패널 생성 / 닫기 / 편집 / 강조 / 리사이즈 로직
     │   ├─ rules/        # 사이트별 추출 규칙 (fmkorea, dcinside, navercafe, dogdrip)
     │   └─ styles/       # 세분화된 CSS -> styles.css 로 집약
     └─ content/
         ├─ manifest.json # Chrome MV3 매니페스트
         ├─ popup.html    # 브라우저 액션 팝업(UI/안내)
         └─ options.html  # 옵션/도메인 안내 (현재 정적)
```

## 동작 방식 (아키텍처 개요)

1. Chrome 이 `manifest.json` 의 content_scripts 규칙에 따라 모든 페이지에 `bundle.js` 삽입
2. `entry.js` → 활성 URL 이 지원 사이트 규칙(`rules/index.js`)에 매칭되는지 검사 (`match`, `articleMatch`)
3. 지원 페이지라면 배지(`.flick-toggle-wrapper`) 삽입
4. 배지 클릭 또는 `F4` →
	 - (사전 훅) `runPreHook()` 실행 (사이트별 비디오 상태 스냅 등)
	 - `extractActive()` 로 `{ title, blocks[] }` 수집
	 - `buildUI(data)` 가 쇼츠 패널 DOM 구성 (이미지/비디오/HTML 블록 순서 보존)
	 - (사후 훅) `runPostMountedHook()` (비디오 자동 재생, 볼륨 복원 등)
5. 닫기: 배지 혹은 `Esc` 키 → 패널 및 부가 패널 제거, body 상태 복원
6. SPA / 동적 내비게이션 대응: History API 패치 + MutationObserver + interval 로 URL/DOM 변화를 감시하여 버튼/패널 재삽입 또는 정리

### 블록 데이터 스키마

```ts
type FlickBlock =
	| { type: 'image'; src: string; alt: string }
	| { type: 'video'; src: string; poster?: string }
	| { type: 'html';  html: string };

interface ExtractResult {
	title: string;
	blocks: FlickBlock[];
}
```

### 로컬 저장 키 (퍼시스턴스)

| Key | 설명 |
|-----|------|
| `flick:titleFontSize` | 제목 폰트 크기(px) |
| `flick:headerHeight` / `flick:footerHeight` | 헤더/푸터 패널 높이 |
| `flick:highlightColor` | 자동 강조 색상 선택 |

## 지원 사이트 규칙 추가 가이드

1. `packages/src/rules/` 에 `{site}.js` 생성
2. 필수 export:
	 - `const {site}Rule = { id, match: /.../, articleMatch: /.../, extract, prePrepare?, postShortsMounted? }`
	 - `extract(ruleCfg)` 는 `ExtractResult` 반환 (예외 내부 처리 및 fallback 권장)
3. `index.js` 의 `rules` 배열에 새 규칙 import & 추가
4. 필요 시 노이즈 필터(댓글/광고), 이미지/비디오 정규화, 중복 제거 로직 포함
5. 빌드 후 실제 페이지에서 DevTools 콘솔에서 `FLICK.extractPost()` 수동 호출로 추출 결과 확인 가능

## 개발 & 빌드

사전: Node 18+ (ESM & Vite 7 권장)

```bash
cd packages
npm install

# 개발(워치 빌드) → content/ 에 bundle.js / bundle.css 출력
npm run dev

# 프로덕션 번들
npm run build
```

`packages/content/manifest.json` 의 `content_scripts` 경로가 빌드 산출물(`bundle.js`, `bundle.css`) 과 일치해야 합니다.

### 확장 로드(Chrome)

1. Chrome 주소창 `chrome://extensions` → 개발자 모드 On
2. [압축해제된 확장 프로그램을 로드] 클릭
3. `packages/content` 폴더 선택 (manifest.json 위치)
4. 지원 사이트 게시글 접속 → 우측 FLICK 배지 확인 → 클릭 / F4

## 권한(Manifest v3)

| 항목 | 목적 |
|------|------|
| `host_permissions: <all_urls>` | 규칙 기반 지원 사이트 판별 (초기 전역 삽입) |
| `storage` | 사용자 폰트/리사이즈/강조 색상 값 보존 |
| `scripting` | (현재 직접 사용 빈도 낮음, 추후 동적 주입 여지) |

추가적인 네트워크 전송, 원격 코드 실행, 애널리틱스 없음.

## UI / UX 요약

- 배지 상태: `data-open=true/false`
- 패널 루트: `.flick-wrap-injected` (중복 삽입 방지)
- 제목 편집: contentEditable + 단축키/이벤트 버블 억제
- 강조: 드래그 후 자동 span 래핑 → 동일 색 인접 병합
- 리사이즈: 헤더/푸터 상단/하단 그립 (마우스 드래그)
- 단축키: `F4` (토글), `Esc` (열려 있을 때 닫기)

## 성능 & 안정성 전략

- 단일 content script / 최소 DOM 삽입
- MutationObserver + 저주기 interval(3s) 이중 안전망 → 버튼 유실 방지
- 이미지/비디오 src 정규화(`//` → `protocol`, `/` → `origin`)
- 중복 텍스트/이미지/비디오 필터 → 패널 렌더 경량화
- 오류 격리: 추출 내부 try/catch → 콘솔 경고만 남기고 빈 블록 반환

## Roadmap (예상)

- 규칙 추가: 기타 대형 커뮤니티 / 블로그 플랫폼
- 사용자 설정 UI (폰트 패밀리, 테마, 자동 열기 조건, 단축키 매핑)
- 캡처 / 스크롤 스냅 기능 (프레임 단위 이미지 저장)
- 다국어(영문) README / 문서 분리 정비
- E2E 테스트 (Puppeteer) 로 추출 정확도 회귀 검증

## Contributing

1. Issue / Discussion 으로 버그/요청 공유 (재현 URL 포함)
2. Fork 후 규칙 또는 UI 개선 PR 생성
3. PR 체크리스트 권장:
	 - [ ] 기존 사이트 정상 동작 회귀 테스트
	 - [ ] 새 사이트 규칙: 중복 이미지/텍스트 필터 포함
	 - [ ] 콘솔 에러/경고 없음
	 - [ ] README / 주석 업데이트 (필요 시)

## 간단한 FAQ

| 질문 | 답변 |
|------|------|
| 왜 모든 URL 에서 스크립트가 로드되나요? | MV3 manifest 의 패턴 단순화를 위해 `<all_urls>` 사용, 내부에서 즉시 규칙 필터 후 미지원 페이지는 아무 DOM 삽입 없이 종료합니다. |
| 확장에 서버 통신이 있나요? | 없습니다. 모든 추출/렌더는 클라이언트에서만 수행. |
| 쇼츠 UI 가 깨질 때? | 페이지 CSS 충돌일 수 있습니다. 이슈에 URL + 스크린샷 첨부해주세요. |
| 강조 색 초기화 방법? | 패널의 강조색 선택기 옆 '강조해제' 버튼으로 전체 해제, LocalStorage 에서 색상 키 삭제로 초기화. |

## 빠른 실험 (콘솔)

지원 페이지 콘솔에서:

```js
FLICK.extractPost(); // 현재 추출 데이터 미리보기
FLICK.buildUI(FLICK.extractPost()); // 강제 UI 재생성
```
