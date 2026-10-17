# GitHub 및 배포 안내

## 현재 Vercel 연결

대표 주소: https://travel-murex-beta.vercel.app

배포된 Python API의 `/api/health` 응답을 확인했다. 현재 Firebase 서버 인증 환경변수 설정이 필요하다. 서버는 Vercel에서 HTTPS 동일 출처 요청을 허용하며, 다른 출처 요청은 계속 차단한다.

Vercel의 해당 travel 프로젝트 → Settings → Environment Variables에 다음 값을 추가한다.

- Key: `TRAVEL_FIREBASE_SERVICE_ACCOUNT`
- Value: 프로젝트 폴더 밖의 Firebase 서비스 계정 JSON 파일 전체 내용. 파일 경로가 아니라 JSON 내용이다. 따옴표를 바깥에 덧붙이지 않는다.
- Environment: Production. 필요한 경우 Preview에도 별도 설정한다.
- Secret 또는 Sensitive 선택이 제공되면 활성화한다.

저장 후 최신 main 커밋으로 Redeploy한다. 이 값은 서버에서만 읽으며 `/api/config`에는 반환하지 않는다. 키 내용은 GitHub나 채팅에 올리지 않는다. 인증 설정은 환경변수 → 로컬 경로 설정 → ADC 순으로 선택한다.

재배포 후 `/api/health`의 ready가 true인지, 가입·로그인·예약 흐름이 실제 도메인에서 동작하는지 확인한다. Firebase Authentication의 허용 도메인에 `travel-murex-beta.vercel.app`도 추가한다.

## 현재 서버 구조

정적 화면 외에 Python API가 추가되었습니다. Vercel에 정적 파일만 배포하면 /api 경로가 동작하지 않아 회원 정보 저장·관리자 관리·예약을 사용할 수 없습니다. 현재 server.py는 127.0.0.1 개발용 서버이며 운영용 HTTP 서버가 아닙니다.

운영 배포 시에는 Python API를 지원하는 호스팅과 HTTPS, 도메인, 프로세스 관리가 필요합니다. API를 다른 호스트로 분리한다면 인증 토큰 전달과 허용 출처를 명시적으로 설계해야 합니다. server.py의 기본 출처 제한을 무조건 해제하지 않습니다.

## 업로드 전

- Emulator와 실제 테스트 프로젝트에서 가입/로그인/회원/관리자/예약 흐름 확인
- 비밀번호, 서비스 계정 JSON, .env, 실제 회원 개인정보, 테스트 자료를 제외
- 실제 DB 규칙을 검증한 후 배포. 브라우저 DB 접근은 차단하고 Python API만 사용
- 기존 데이터의 경로·예약 금액을 보존하는지 확인
- 이용약관·개인정보 처리방침·보관 정책·운영자 연락처 준비

## 배포 전

1. 실제 Firebase DB URL·관리자 UID·서버 인증을 호스팅 환경의 비밀 설정으로 입력합니다.
2. 운영용 Python 서버 어댑터와 HTTPS 프록시, 제한된 정적 파일 제공 경로를 구성합니다.
3. Firebase Authentication의 허용 도메인에 실제 배포 도메인을 추가합니다.
4. 미리보기 환경에서 회원가입·로그인·권한·CRUD·예약 신청/확정/취소 요청을 검증합니다.
5. 검증 후 GitHub와 운영 배포를 진행합니다. 계정이나 배포 대상이 준비되지 않은 항목은 완료로 표시하지 않습니다.

서비스 계정 파일은 저장소 또는 정적 배포 폴더에 두지 않습니다. 이 작업에서는 실제 프로젝트 Rules 배포·GitHub 업로드·외부 배포를 수행하지 않았습니다.
