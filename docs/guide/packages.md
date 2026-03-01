# 패키지 구성

Flick 프로젝트의 전체 구조를 살펴보겠습니다.

저장소는 크게 **확장 프로그램 본체**와 **문서 사이트**, 두 부분으로 나뉘어 있습니다.

## 저장소 디렉터리 한눈에 보기

| 경로 | 역할 |
| ---- | ---- |
| `flick/packages` | Chrome Extension 소스 코드와 빌드 산출물(`content`)이 담겨 있습니다 |
| `flick/docs` | 지금 보고 계신 VitePress 문서 사이트입니다 |

## packages 내부 구조

확장 프로그램의 핵심 코드는 `packages` 안에 있습니다. 주요 파일들을 하나씩 소개하겠습니다.

| 경로 | 설명 |
| ---- | ---- |
| `packages/src/entry.ts` | Content Script의 시작점입니다. 페이지에 배지를 삽입하고, 단축키(F4)를 처리합니다 |
| `packages/src/ui.ts` | 쇼츠 패널을 화면에 그려주고, 강조 표시나 리사이즈 같은 UI 동작을 담당합니다 |
| `packages/src/rules/*.ts` | 사이트마다 다른 HTML 구조를 파싱하는 규칙 파일입니다 |
| `packages/content/manifest.json` | Chrome 확장 매니페스트(MV3) 파일입니다 |

## 현재 지원 사이트

`packages/src/rules/index.ts`에 등록된 사이트 목록입니다.

- **fmkorea** — FM코리아
- **dcinside** — 디시인사이드
- **navercafe** — 네이버 카페
- **dogdrip** — 개드립

새로운 사이트를 지원하고 싶다면, `rules` 폴더에 파싱 규칙 파일을 추가하면 됩니다.

## 빌드 스크립트

개발하거나 배포할 때 사용하는 명령어입니다.

- **`npm run dev`** — 파일 변경을 감지해서 자동으로 다시 빌드합니다 (`vite build --watch`)
- **`npm run build`** — 버전 동기화 스크립트를 실행한 뒤, 프로덕션용 빌드를 만듭니다
