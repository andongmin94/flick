<div align="center">

<a href="https://flick.andongmin.com">
<img src="https://flick.andongmin.com/logo.svg" alt="logo" height="200" />
</a>

</div>

# FLICK

유머·커뮤니티 게시글을 **YouTube Shorts 스타일의 세로 스크롤 미디어 뷰어**로 변환해 주는 Chrome 확장 프로그램(Manifest v3)입니다.

지원되는 게시글 페이지에 접속하면 화면 한쪽에 작은 토글 배지가 자동으로 나타납니다. 이 배지를 클릭하거나 단축키 `F4`를 누르면 "쇼츠" 패널이 열리고, 같은 방법으로 다시 닫을 수 있습니다.

## 주요 특징

- **사이트 자동 감지** — fmkorea, dcinside, Naver Cafe, DogDrip 게시글 페이지를 URL 패턴과 추가 필터를 통해 자동으로 식별합니다.
- **규칙 기반 콘텐츠 추출** — 사이트별 `rules/*.ts` 모듈이 제목과 본문을 표준 블록 구조(`image | video | html`)로 깔끔하게 변환합니다.
- **단일 번들 빌드** — Vite를 사용하여 `bundle.js / bundle.css` 하나로 빌드하므로, 로딩 속도가 빠르고 페이지 충돌이 최소화됩니다.
- **즉시 토글** — 화면 우측의 `FLICK` 배지를 클릭하거나 `F4` 키 하나로 쇼츠 패널을 열고 닫을 수 있습니다.
- **제목 편집 & 크기 조절** — 패널 내에서 제목을 직접 편집하고 글자 크기를 조절할 수 있으며, 설정값은 로컬에 자동 저장됩니다.
- **텍스트 강조 기능** — 텍스트를 드래그하면 자동으로 강조 표시되며, 강조 색상을 선택하거나 한 번에 모두 해제할 수도 있습니다.
- **헤더·푸터 리사이즈** — 헤더와 푸터 높이를 드래그로 자유롭게 조절할 수 있고, 조절한 값은 localStorage에 기억됩니다.
- **노이즈 자동 제거** — 광고, 댓글, 플레이어 잔여 요소 등 불필요한 콘텐츠를 자동으로 걸러냅니다.
- **사이트별 후처리 훅** — 예를 들어, fmkorea에서는 원본 비디오를 일시정지하고 쇼츠 패널에서 자동 재생하며, dcinside에서는 비디오를 음소거 루프로 처리합니다.

## 프로젝트 구조

주요 파일과 폴더는 아래와 같이 구성되어 있습니다.

```
flick/
 ├─ src/
 │   ├─ entry.ts         # content script 진입, 버튼 & 라우트 감시, API publish
 │   ├─ ui.ts            # 쇼츠 패널 생성 / 닫기 / 편집 / 강조 / 리사이즈 로직
 │   ├─ rules/           # 사이트별 추출 규칙 (fmkorea, dcinside, navercafe, dogdrip)
 │   └─ styles/          # 세분화된 CSS -> styles.css 로 집약
 ├─ content/
 │   ├─ manifest.json    # Chrome MV3 매니페스트
 │   ├─ popup.html       # 브라우저 액션 팝업(UI/안내)
 │   └─ options.html     # 옵션/도메인 안내 (현재 정적)
 └─ scripts/
     └─ bump-extension-version.cjs
```

문서 사이트는 이제 이 저장소 밖의 별도 프로젝트에서 관리합니다.

## 동작 방식

FLICK이 게시글을 쇼츠 형태로 변환하는 과정은 다음과 같습니다.

1. Chrome이 `manifest.json`의 content_scripts 규칙에 따라 페이지에 `bundle.js`를 삽입합니다.
2. `entry.ts`가 현재 URL이 지원 사이트 규칙(`rules/index.ts`)과 일치하는지 확인합니다.
3. 지원 페이지로 판별되면, 화면에 배지(`.flick-toggle-wrapper`)를 삽입합니다.
4. 배지를 클릭하거나 `F4`를 누르면 다음 단계가 순서대로 실행됩니다.
   - `runPreHook()` — 사이트별 사전 준비를 수행합니다 (예: 비디오 상태 스냅샷).
   - `extractActive()` — 게시글에서 `{ title, blocks[] }` 데이터를 수집합니다.
   - `buildUI(data)` — 수집된 데이터로 쇼츠 패널 DOM을 구성합니다 (이미지·비디오·HTML 블록 순서 보존).
   - `runPostMountedHook()` — 패널 삽입 후 후처리를 진행합니다 (비디오 자동 재생, 볼륨 복원 등).
5. 배지를 다시 클릭하거나 `Esc` 키를 누르면 패널이 제거되고, 페이지가 원래 상태로 복원됩니다.
6. SPA 등 동적 내비게이션 환경에서도 History API 패치, MutationObserver, interval을 활용해 URL·DOM 변화를 감시하여 배지와 패널을 자동으로 관리합니다.

### 블록 데이터 스키마

추출된 콘텐츠는 아래의 `FlickBlock` 타입으로 표현됩니다.

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

### 로컬 저장 키

사용자가 조절한 값은 아래의 localStorage 키에 자동으로 저장됩니다.

| Key | 설명 |
|-----|------|
| `flick:titleFontSize` | 제목 폰트 크기(px) |
| `flick:headerHeight` / `flick:footerHeight` | 헤더·푸터 패널 높이 |
| `flick:highlightColor` | 텍스트 강조 색상 |

## 새로운 사이트 규칙 추가하기

새로운 사이트를 지원하고 싶으시다면, 아래 절차를 따라 주시면 됩니다.

1. `src/rules/` 폴더에 `{site}.ts` 파일을 생성합니다.
2. 아래 형식으로 규칙 객체를 export 합니다.
   - `const {site}Rule = { id, match: /.../, articleMatch: /.../, extract, prePrepare?, postShortsMounted? }`
   - `extract(ruleCfg)` 함수는 `ExtractResult`를 반환해야 합니다. 내부에서 예외를 처리하고 fallback을 제공하는 것을 권장합니다.
3. `index.ts`의 `rules` 배열에 새 규칙을 import하여 추가합니다.
4. 필요에 따라 노이즈 필터(댓글·광고), 이미지·비디오 정규화, 중복 제거 로직을 포함합니다.
5. 빌드 후 실제 페이지의 DevTools 콘솔에서 `FLICK.extractPost()`를 호출하면, 추출 결과를 바로 확인할 수 있습니다.

## 개발 & 빌드

Node 20.19 이상 또는 22.12 이상이 필요합니다 (ESM & Vite 8 권장).

```bash
npm install

# 개발(워치 빌드) → content/ 에 bundle.js / bundle.css 출력
npm run dev

# 프로덕션 번들
npm run build

# 타입 검사
npm run typecheck

# 타입 검사 + 프로덕션 번들 + 확장 manifest 참조 검증
npm run verify

# 릴리스 준비(Chrome Web Store 버전 확인 후 manifest 버전 범프 + 검증)
npm run release:prepare
```

`npm run build`는 버전을 변경하지 않고 Vite 번들만 생성합니다. 릴리스 전에 버전만 갱신하려면 `npm run version:bump`를, 버전 갱신 후 타입 검사와 빌드까지 한 번에 확인하려면 `npm run release:prepare`를 사용해 주세요.

빌드가 완료되면, `content/manifest.json`의 `content_scripts` 경로가 빌드 산출물(`bundle.js`, `bundle.css`)과 일치하는지 확인해 주세요.

### Chrome에 확장 프로그램 로드하기

1. Chrome 주소창에 `chrome://extensions`를 입력하고, 개발자 모드를 활성화합니다.
2. **압축해제된 확장 프로그램을 로드** 버튼을 클릭합니다.
3. `content` 폴더(manifest.json이 위치한 폴더)를 선택합니다.
4. 지원 사이트의 게시글에 접속하면 화면 우측에 FLICK 배지가 나타납니다. 클릭하거나 `F4`를 눌러 보세요!

## 권한 안내 (Manifest v3)

FLICK이 요청하는 권한과 그 목적은 다음과 같습니다.

| 항목 | 목적 |
|------|------|
| `permissions: []` | 별도의 Chrome 확장 API 권한을 요청하지 않습니다. |
| `host_permissions` | fmkorea, dcinside, Naver Cafe, DogDrip 지원 도메인에서 content script가 동작하도록 허용합니다. |
| `content_scripts.matches` | 지원 도메인 URL 패턴에서만 번들을 삽입하고, 내부 게시글 규칙을 한 번 더 확인합니다. |

별도의 네트워크 전송, 원격 코드 실행, 애널리틱스는 일체 없습니다. 안심하고 사용하셔도 됩니다.

## UI / UX 요약

- **배지 상태** — `data-open=true/false` 속성으로 열림·닫힘을 관리합니다.
- **패널 루트** — `.flick-wrap-injected` 클래스를 기준으로 중복 삽입을 방지합니다.
- **제목 편집** — contentEditable을 활용하며, 단축키와 이벤트 버블을 적절히 억제합니다.
- **강조** — 텍스트를 드래그하면 span으로 래핑되고, 동일 색상의 인접 강조가 자동 병합됩니다.
- **리사이즈** — 헤더·푸터 상단·하단 그립을 마우스로 드래그하여 높이를 조절합니다.
- **단축키** — `F4`로 패널을 토글하고, `Esc`로 열려 있는 패널을 닫습니다.

## 성능 & 안정성

안정적인 사용 경험을 위해 다음과 같은 전략을 적용하고 있습니다.

- 단일 content script와 최소한의 DOM 삽입으로 페이지 부하를 줄입니다.
- MutationObserver와 저주기 interval(3초)을 함께 사용하는 이중 안전망으로 배지 유실을 방지합니다.
- 이미지·비디오 src를 정규화하여(`//` → protocol, `/` → origin) 리소스 로딩을 안정화합니다.
- 중복 텍스트·이미지·비디오를 필터링하여 패널 렌더링을 경량화합니다.
- 추출 과정에서 발생하는 오류는 내부 try/catch로 격리하여, 콘솔 경고만 남기고 빈 블록을 반환합니다.

## Roadmap

앞으로 아래와 같은 기능들을 준비하고 있습니다.

- 기타 대형 커뮤니티·블로그 플랫폼에 대한 규칙 추가
- 사용자 설정 UI (폰트 패밀리, 테마, 자동 열기 조건, 단축키 매핑)
- 캡처·스크롤 스냅 기능 (프레임 단위 이미지 저장)
- 다국어(영문) README 및 문서 분리 정비
- E2E 테스트(Puppeteer)를 통한 추출 정확도 회귀 검증

## Contributing

프로젝트에 참여해 주시면 큰 힘이 됩니다!

1. Issue 또는 Discussion에서 버그 신고나 기능 요청을 공유해 주세요 (재현 URL을 포함해 주시면 더 좋습니다).
2. Fork 후 규칙 추가 또는 UI 개선 PR을 생성해 주세요.
3. PR을 올리실 때 아래 체크리스트를 참고해 주시면 감사하겠습니다.
   - [ ] 기존 사이트에서 정상 동작하는지 회귀 테스트를 진행했습니다.
   - [ ] 새 사이트 규칙에 중복 이미지·텍스트 필터를 포함했습니다.
   - [ ] 콘솔에 에러나 경고가 없는 것을 확인했습니다.
   - [ ] 필요한 경우 README 또는 주석을 업데이트했습니다.

## 자주 묻는 질문

| 질문 | 답변 |
|------|------|
| 왜 지원 사이트에서만 스크립트가 로드되나요? | 현재 manifest는 `<all_urls>`를 쓰지 않고, `host_permissions`와 `content_scripts.matches`에 등록된 지원 사이트 패턴에서만 번들을 삽입합니다. 그 안에서도 게시글 규칙 필터를 다시 거쳐 미지원 페이지에서는 아무런 DOM 삽입 없이 조용히 종료됩니다. |
| 확장에 서버 통신이 있나요? | 없습니다. 모든 추출과 렌더링은 사용자의 브라우저에서만 수행됩니다. |
| 쇼츠 UI가 깨질 때는 어떻게 하나요? | 페이지 CSS와의 충돌일 수 있습니다. Issue에 해당 URL과 스크린샷을 첨부해 주시면 확인하겠습니다. |
| 강조 색을 초기화하려면 어떻게 하나요? | 패널의 강조색 선택기 옆 '강조해제' 버튼을 누르면 전체 강조가 해제됩니다. localStorage에서 `flick:highlightColor` 키를 삭제해도 초기화됩니다. |

## 빠른 실험 (콘솔)

지원 페이지의 DevTools 콘솔에서 아래 명령어를 직접 실행해 볼 수 있습니다.

```js
FLICK.extractPost(); // 현재 추출 데이터 미리보기
FLICK.buildUI(FLICK.extractPost()); // 강제 UI 재생성
```
