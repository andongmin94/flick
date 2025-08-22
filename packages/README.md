# Board to Shorts Formatter

fmkorea 등의 커뮤니티 게시글을 9:16 (유튜브 쇼츠) 단일 카드 레이아웃으로 재구성하는 실험용 크롬 확장.

## 기능
- fmkorea `best/*` 글 접속 시 자동 쇼츠 뷰 오버레이 표시
- 단축키 Shift+S 로 토글 (이미 열려 있으면 무시)
- 본문에서 텍스트/이미지 블록 추출 후 세로 스크롤 카드화

## 설치 (개발 모드)
1. 브라우저에서 `chrome://extensions` 이동
2. 개발자 모드 활성화
3. "압축해제된 확장 프로그램을 로드" 클릭 후 이 폴더 선택
4. fmkorea 게시글 (best/*) 들어가면 자동 표시

## 구조
```
manifest.json
content/
  shorts.css
  shortsize.js
popup/
  popup.html
options/
  options.html
```

## 향후 개선 아이디어
- 다수 이미지 슬라이드/Paging
- 텍스트 자동 분량 분할 (현재는 단락 그대로)
- 폰트 크기/다크 테마 사용자 설정
- 더 많은 커뮤니티 패턴 인식 (clien, ruliweb 등)
- AI 요약(선택) + 핵심 문장 하이라이트
- Lazy load / IntersectionObserver 활용 이미지 최적화

## 라이선스
MIT (단, 사이트 TOS 준수 필요)
