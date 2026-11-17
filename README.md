# 산업잇다 — 산업연관분석 웹앱

2023년 한국은행 산업연관표(연장표)를 사용하는 교육용 분석 웹앱입니다. 기존 HTML/CSS/JavaScript 웹앱을 **React + Vite + TypeScript**로 재구성했습니다. 버튼·카드·입력창·테이블은 shadcn/ui 방식의 로컬 컴포넌트 소스로 관리하고, 실제 데이터 시각화는 Recharts와 커스텀 SVG를 사용합니다.

## 주요 기능

- 통합대분류 33개, 통합중분류 83개, 통합소분류 165개, 기본부문 380개 산업 분류 지원
- 각 분류별 12개 투입산출표·유발계수 시트 탐색
- 생산·부가가치·수입유발계수의 산업별 비교 및 순위
- 여러 산업의 국산품 최종수요 변화 시나리오 합산, 경제적 파급효과 계산, CSV 저장
- 국산거래표 기반 산업 간 구매·공급 흐름 SVG 다이어그램
- 원자료 행·열 검색, 페이지 이동, 셀 선택, 전체 검색 결과 CSV 저장
- 모바일 화면에서 반응형 메뉴·표·카드 배치

## 기술 구성

| 분야 | 구성 |
|---|---|
| 프론트엔드 | React 19, TypeScript, Vite 7 |
| 컴포넌트 | shadcn/ui 호환 로컬 컴포넌트 (Card, Button, Badge, Input, Table), Radix Slot |
| 차트 | Recharts 3, SVG 산업 거래 연결도 |
| 스타일 | Tailwind CSS 4 + 커스텀 디자인 토큰 |
| 배포 | GitHub Pages + GitHub Actions |
| 데이터 | 한국은행 2023년 산업연관표(연장표)의 원본 Excel을 전처리한 JSON |

컴포넌트는 `src/components/ui/`에 있기 때문에 프로젝트 안에서 직접 수정할 수 있습니다. 공식 CLI를 이용해 다른 shadcn/ui 컴포넌트를 추가할 수도 있습니다. 이 저장소는 shadcn/ui 전체 저장소를 복사한 프로젝트가 아닙니다.

## 로컬에서 실행하기

Node.js 22 이상을 권장합니다.

```bash
npm install
npm run check:data
npm run dev
```

브라우저에 표시되는 로컬 주소(일반적으로 `http://localhost:5173/industry-analysis/`)를 엽니다.

배포용 빌드:

```bash
npm run build
npm run preview
```

`npm run build`는 4개 분류 데이터의 정합성 확인과 Vite 프로덕션 번들 생성을 수행합니다. 타입 검사는 `npm run typecheck`로 별도로 실행할 수 있습니다.

## 기존 GitHub 저장소에 적용하기

저장소: `https://github.com/tommy020300-cpu/industry-analysis`

**중요:** 이번 버전은 React/Vite 빌드 프로젝트이므로 예전처럼 `index.html`을 업로드한 후 `Deploy from a branch / main / root`만 사용하는 방식으로 게시할 수 없습니다.

1. 기존 저장소를 백업하거나 GitHub의 이전 커밋을 유지하세요.
2. 다운로드한 ZIP을 압축 해제합니다. 폴더 자체가 아닌 **압축 해제한 폴더 안의 파일·폴더**를 저장소 최상위에 올립니다. `.github/workflows/deploy.yml`, `src/`, `public/`, `index.html`, `package.json`, `vite.config.ts`, `tsconfig.json`, `components.json`이 올바른 위치에 있어야 합니다.
3. 저장소의 **Settings → Pages → Build and deployment → Source**를 **GitHub Actions**로 변경합니다.
4. **Actions → Publish 산업잇다** 워크플로의 빌드·배포가 성공했는지 확인합니다.
5. 아래 사이트로 접속합니다: `https://tommy020300-cpu.github.io/industry-analysis/`

이 프로젝트의 `vite.config.ts`는 기존 저장소명에 맞춰 `base: '/industry-analysis/'`를 사용합니다. 저장소명을 바꾸면 이 값도 바꿔야 합니다.

### 업로드 시 주의사항

- 기존 저장소의 `data/`, `app.js`, `style.css`, `model.py` 등이 남아 있어도 GitHub Actions는 이 프로젝트의 Vite 빌드 결과(`dist/`)만 게시합니다. 혼선을 막으려면 미사용 파일은 정리하는 것이 좋습니다.
- `node_modules/`와 `dist/`는 업로드하지 않습니다.
- `.github/workflows/deploy.yml`은 점(`.`)으로 시작하는 숨김 폴더에 있습니다. 파일 업로드에서 누락되지 않았는지 꼭 확인하세요.
- 배포 화면의 녹색 체크가 확인되기 전까지 실제 사이트가 변경되었다고 간주하지 마세요.

## 계산 및 단위

총 산업 수를 `n`, 국산품 최종수요 변화 벡터를 `ΔY`라고 하면,

- 생산유발: `ΔX = (I − Ad)^−1 × ΔY`
- 부가가치유발: `ΔV = V* × ΔY`
- 수입유발: `ΔM = M* × ΔY`

한국은행에서 제공하는 2023년 생산·부가가치·수입유발계수 행렬을 직접 이용합니다. 서로 다른 산업의 최종수요 증가를 합산한 뒤 산업별 유발액을 계산합니다. 입력과 계산 결과는 **억원**입니다. 거래표 원자료 금액은 **백만원**, 투입·유발계수는 **무차원**입니다.

2023년의 기술 및 투입 구조가 유지된다는 **정태적 가정**입니다. 생산 제약, 가격 변동, 경제주체 행동 변화 등을 반영하지 않으며 고용이나 실제 GDP 증가를 직접 예측하는 모형이 아닙니다.

## 데이터 테스트

```
npm run check:data
```

분류별 산업 수와 시트 구조를 확인하고, 통합대분류에서 음식료품 10억원 + 광산품 20억원의 시나리오를 독립적으로 재계산합니다. 이 경우 생산유발액 63.29410595억원, 부가가치유발액 23.218678억원, 수입유발액 6.781322억원을 기대합니다. 숫자는 원본 반올림 계수 기준입니다.

## 출처·저작권

- 통계 출처: 한국은행 「2023년 산업연관표(연장표)」, 2025년 9월 24일 발표.
- 원본 Excel 및 보도자료는 `public/data/source/`에 포함되어 있습니다.
- 별도 명시가 없는 프론트엔드 구성은 교육용 프로젝트 소스입니다. 사용하는 외부 라이브러리들의 각각의 라이선스 고지 조건을 따라야 합니다. React, shadcn/ui 디자인 원칙, Radix Slot, Tailwind CSS, Recharts, Lucide 등이 사용됩니다.

## 실행 환경 주의

이 배포본은 GitHub Actions의 Node.js 환경에서 npm 패키지를 설치해 빌드하도록 구성했습니다. 소스 작성 환경에서는 npm 레지스트리 네트워크 연결이 차단되어 실제 Vite 빌드를 수행하지 못했습니다. 데이터 정합성 및 계산 예제는 별도로 통과했으며, **최종 React 빌드 성공 여부는 GitHub Actions에서 확인해야 합니다.**


## Blue Edition (색상 및 글자 크기 수정)

- 기존 React 기능 및 데이터는 그대로 유지됩니다.
- `src/index.css`: 전체 UI를 블루 컬러로 변경하고 기본 글자 크기 및 컨트롤 크기를 높였습니다.
- `src/App.tsx`: 차트와 산업 거래 인포그래픽의 인라인 색상을 블루 계열로 맞췄습니다.
- GitHub에서 수정하려면 두 파일을 각각 같은 위치에 교체한 뒤 커밋하면 GitHub Actions가 자동으로 빌드·배포합니다.

## 최종 디자인 (Blue / Plain Korean Edition)

- 첫 화면: 파란 산업 연결 3D 이미지 (`public/assets/industry-3d.webp`)와 짧은 행동 안내
- 화면: 밝은 쿨그레이 배경, 여백 중심의 흰색 카드, 신뢰감 있는 파란색 버튼
- 타이포그래피: 본문 16px 이상, 설명 문구 및 시트·표의 보조 글씨 대비 개선
- UX 문구: 간결한 `~해요` 말투. 계산식과 공식 산업 용어는 정확하게 유지
- 검색 미리보기: 페이지 제목·설명·OG 정보·파비콘·robots·sitemap 추가
- 계산: 데이터·수식·산업 분류 로직은 이전과 동일

### GitHub 교체 방법

작은 수정 파일 ZIP의 경로를 그대로 지켜서 교체하세요.

- `src/App.tsx`
- `src/index.css`
- `index.html`
- `public/assets/industry-3d.webp`
- `public/favicon.svg`
- `public/robots.txt`
- `public/sitemap.xml`

기존 `public/data/`, `src/lib/`, `src/components/`는 그대로 유지합니다.

GitHub Pages는 **GitHub Actions**를 이용해 빌드해야 합니다. 코드가 정상적으로 배포됐는지
`Actions → Publish 산업잇다`에서 확인하세요. 검색 엔진 노출은 보장되지 않으며 검색 엔진이
사이트를 발견하고 색인하는 과정은 별도입니다.

## 검증 요약 (2026-11-17)

- 업로드받은 한국은행 2023년 산업연관표 원본 압축파일과 저장소에 포함된 4종 원본 Excel의 SHA-256이 일치함.
- 산업 수는 33·83·165·380개, 표는 각 12개로 검증했으며, 4개 분류의 생산·수입·부가가치유발계수 행렬을 점검함.
- 대분류·중분류의 원본 Excel과 가공 JSON을 총 96개 셀에서 독립 대조한 결과 일치함.
- 대분류의 수요 변화 시나리오 예제를 자동 검증함.
- 원자료의 유발계수표와 최종수요표는 일반 거래표와 열 의미가 달라 UI 문구를 구분하도록 수정함.
- 기존 예시의 Pyodide/Python 실행 방식 대신 React/TypeScript에서 사전 계산된 한국은행 유발계수 행렬을 이용함. 수업에서 Pyodide 구현 자체가 필수인지 교수님에게 확인이 필요함.
- 본 검증 환경에서 React 의존 패키지 설치가 되지 않아 `vite build`/브라우저 클릭 검증을 완료하지 못함. GitHub Actions의 `Publish 산업잇다` 성공과 실제 작동을 별도로 확인해야 함.
