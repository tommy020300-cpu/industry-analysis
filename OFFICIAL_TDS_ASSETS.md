# IO Studio × 공식 토스 에셋 연동 안내

이 버전은 **토스페이스(Tossface)의 공식 공개 SVG**를 외부 CDN으로 연결하고, 공식 TDS Asset 문서에 안내된 체크 아이콘 주소를 참조합니다. **전용 TDS UI Kit 원본이나 비공개 이미지 자산을 내려받거나 ZIP에 재배포한 버전은 아닙니다.**

## 실제로 연결한 공식 그래픽

| 사용 위치 | 그래픽 | 원본 주소 |
|---|---|---|
| 분석 바로가기 | 📊 차트 | https://cdn.jsdelivr.net/gh/toss/tossface/dist/svg/u1F4CA.svg |
| 분석 바로가기 | 🔗 연결 | https://cdn.jsdelivr.net/gh/toss/tossface/dist/svg/u1F517.svg |
| 분석 바로가기 | 📋 자료 | https://cdn.jsdelivr.net/gh/toss/tossface/dist/svg/u1F4CB.svg |
| 데이터 정상 상태 | 체크 | https://static.toss.im/icons/svg/icon-check-circle-green.svg |
| 다운로드 실패 시 | Tossface 웹 폰트 또는 기본 이모지 | https://cdn.jsdelivr.net/gh/toss/tossface/dist/tossface.css |

SVG는 CDN에서 로드하므로 방문자의 브라우저가 해당 CDN에 접근할 수 있어야 합니다. 실패하면 이모지 또는 단순 체크 표시로 대체됩니다. 원본 라이선스/저작권 안내를 확인하여 별도 허용 범위 내에서 사용하세요.

## 아직 미적용인 것

- 앱인토스 전용 TDS UI Kit (Figma 파일), TDS 독점 3D 에셋: 현재 작업 환경에 원본 파일이 없으며, 사용자에게 전달된 허락 메일의 정확한 범위를 확인할 수 없어 포함하지 않았습니다.
- TDS React 컴포넌트(@toss/*): IO Studio는 앱인토스 환경이 아닌 일반 GitHub Pages 웹앱입니다. 토스 미니앱 SDK에 묶여 있는 컴포넌트를 무작정 설치하지 않았습니다.

## 원본 출처

- Tossface 공식 저장소: https://github.com/toss/tossface
- Tossface 라이선스: https://github.com/toss/tossface/blob/main/LICENSE
- TDS Asset 문서: https://tossmini-docs.toss.im/tds-mobile/components/Asset/frame/
- TDS Figma UI Kit 다운로드 안내: https://techchat-apps-in-toss.toss.im/t/topic/2469
- TDS 그래픽 사용 기준: https://developers-apps-in-toss.toss.im/design/resources.html

## 적용 방법

압축파일의 `src/App.tsx`, `src/index.css`, `src/components/TossfaceAsset.tsx`를 GitHub 저장소의 같은 상대경로에 업로드해 주세요. 변경된 프로그램은 GitHub Actions가 빌드하여 배포합니다. 데이터 파일이나 계산 라이브러리는 변경하지 않았습니다.

**허가 확인:** 토스 측 메일에서 '비영리 GitHub Pages 독립 웹사이트에서 사용하는 것'이 포함되는지 확인한 뒤 적용하세요. 이메일에 첨부된 TDS 전용 원본이 있다면 해당 자산과 허용 조건을 별도로 확인하여 적용해야 합니다.
