# 패키지 구성

`flick` 저장소에서 실제 확장 구현은 `packages` 디렉터리에 있습니다.

## 디렉터리 역할

| 경로 | 역할 |
| ---- | ---- |
| `flick/packages` | Chrome Extension 소스 및 빌드 산출물(`content`) |
| `flick/docs` | VitePress 문서 사이트 |

## packages 주요 구조

| 경로 | 설명 |
| ---- | ---- |
| `packages/src/entry.ts` | content script 진입점, 배지 삽입/단축키(F4) 처리 |
| `packages/src/ui.ts` | 쇼츠 패널 렌더링 및 강조/리사이즈 UI |
| `packages/src/rules/*.ts` | 사이트별 파싱 규칙 |
| `packages/content/manifest.json` | 확장 매니페스트(MV3) |

## 현재 지원 사이트

`packages/src/rules/index.ts` 기준:

- fmkorea
- dcinside
- navercafe
- dogdrip

## 빌드 스크립트

- `npm run dev`: watch 빌드(`vite build --watch`)
- `npm run build`: 버전 동기화 스크립트 + 프로덕션 빌드
