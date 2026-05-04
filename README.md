# steam-sales-per

## 한국어

`steam-sales-per`는 Windows용 Steam 데스크톱 클라이언트의 Store 화면에서 원하는 할인율 이상의 상품만 보이도록 필터링하는 작은 도구입니다.

이 프로젝트는 개인 사이드 프로젝트로 시작했으며, 아이디어 정리부터 구현 방향 결정, 코드 작성, 테스트, 배포 준비까지 AI와 함께 빠르게 실험하고 다듬는 바이브 코딩 방식으로 작성되었습니다.

### 주요 기능

- 원하는 최소 할인율 입력
- 할인율이 없는 상품 표시/숨김
- 이미 구매한 상품 표시/숨김
- DLC 상품 표시/숨김
- 한국어/영어/일본어 UI 언어 선택
- 언어 전환 시 Steam Store 페이지 언어도 함께 변경
- Steam 설치 경로 자동 탐색
- Steam을 `-cef-enable-debugging` 옵션으로 자동 실행 시도
- 프로그램 종료 또는 필터 비활성화 시 숨김 상태 복구

### 사용 방법

1. GitHub Releases에서 `steam-sales-per.exe`를 다운로드합니다.
2. exe 파일을 실행합니다.
3. 브라우저에 열리는 설정 화면에서 할인율, 체크박스, 언어 옵션을 조정합니다. 변경 사항은 적용 버튼 없이 바로 반영됩니다.
4. Steam Store 페이지를 열면 필터가 자동 적용됩니다.

기본값:

- 할인율이 없는 상품: 숨김
- 이미 구매한 상품: 숨김
- DLC 상품: 숨김
- 언어: 한국어
- 최소 할인율: 75%

### 개발

```powershell
npm install
npm test
npm run typecheck
npm run ui
npm run build:exe
```

Windows 실행 파일은 아래 경로에 생성됩니다.

```powershell
dist\steam-sales-per.exe
```

### 주의

이 도구는 Steam 클라이언트의 CEF 디버깅 인터페이스를 이용해 Store 페이지의 표시 상태만 조정합니다. Steam 계정 정보, 쿠키, 결제 정보, 게임 파일을 수집하거나 수정하지 않습니다.

---

## English

`steam-sales-per` is a small Windows tool that filters the official Steam desktop client's Store page so only products at or above your chosen discount percentage remain visible.

This project started as a personal side project and was built through a vibe-coding workflow: shaping the idea, deciding the implementation path, writing code, testing, and preparing release packaging together with AI in a fast iterative loop.

### Features

- Minimum discount percentage input
- Toggle products without a discount percentage
- Toggle already owned products
- Toggle DLC products
- Korean/English/Japanese UI language selector
- Steam Store page language changes together with the UI language
- Automatic Steam install path detection
- Attempts to launch Steam with `-cef-enable-debugging`
- Restores hidden products when the program exits or the filter is disabled

### Usage

1. Download `steam-sales-per.exe` from GitHub Releases.
2. Run the exe.
3. Use the settings page opened in your browser. Changes are applied immediately without an Apply button.
4. Open a Steam Store page; the filter is applied automatically.

Defaults:

- Products without discount percent: hidden
- Already owned products: hidden
- DLC products: hidden
- Language: Korean
- Minimum discount: 75%

### Development

```powershell
npm install
npm test
npm run typecheck
npm run ui
npm run build:exe
```

The Windows executable is generated at:

```powershell
dist\steam-sales-per.exe
```

### Notes

This tool uses Steam's CEF debugging interface to adjust the visible Store page. It does not collect or modify Steam account data, cookies, payment data, or game files.
