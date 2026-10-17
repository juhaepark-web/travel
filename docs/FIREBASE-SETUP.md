# Firebase 연결 및 Python 서버 설정

## 현재 구현

- 기존 파일에 입력된 travel-2bb1b 웹 앱 설정은 server.py의 PUBLIC_CONFIG로 정리했습니다. Firebase SDK는 13.0.0 브라우저 모듈을 사용합니다.
- 이메일/비밀번호 인증은 Firebase Authentication에서 처리합니다. 비밀번호는 DB·서버 로그·브라우저 자체 저장소에 별도 저장하지 않습니다.
- 로그인은 탭 세션 동안 유지됩니다. 회원 가입 성공 후 로그아웃하고 로그인 화면으로 이동합니다.
- 관리자 입력 아이디 admin은 admin@gmail.com에 연결됩니다. 비밀번호는 해당 Authentication 계정의 비밀번호를 직접 입력합니다.
- 이메일이나 admin이라는 입력만으로 관리자 권한이 생기지 않습니다. Python 서버가 검증한 토큰의 UID가 서버 환경변수 TRAVEL_ADMIN_UID와 일치하거나, 신뢰할 수 있게 부여된 admin:true custom claim이 있어야 합니다.

## 실제 연결에 필요한 값

현재 로컬 PC에는 `.server.local.json`의 `credentialPath`로 프로젝트 폴더 밖 서비스 계정 파일을 연결했습니다. 이 로컬 설정은 Git에서 제외되며 Python 서버가 정적 파일로 제공하지 않습니다. 키 파일을 이동하면 이 경로도 수정해야 합니다. `GOOGLE_APPLICATION_CREDENTIALS` 환경변수가 있으면 해당 인증 설정을 우선 사용합니다. 키 자체는 프로젝트 안으로 복사하지 않습니다.

1. Firebase Console → Authentication → 로그인 방법에서 이메일/비밀번호를 활성화합니다.
2. Authentication → 사용자(Users)에서 admin@gmail.com을 만들거나 확인합니다. 이 계정의 사용자 UID를 복사합니다. UID는 비밀번호가 아니라 Firebase의 계정 식별자입니다.
3. Realtime Database → 데이터 화면 위쪽의 실제 DB URL을 복사합니다. 프로젝트 이름만으로 URL과 리전을 추측하지 않습니다.
4. Python 서버가 Firebase Admin SDK를 사용할 수 있게 인증을 준비합니다. 이미 Google Application Default Credentials가 설정되어 있다면 이를 사용합니다. 서비스 계정 JSON을 사용하는 경우 파일은 프로젝트 폴더 밖에 보관하고 경로만 환경변수로 지정합니다. JSON 내용이나 비밀번호를 채팅·브라우저 코드·Git에 넣지 않습니다.

PowerShell에서 실제 값으로 입력합니다.

```powershell
$env:TRAVEL_DATABASE_URL = 'https://travel-2bb1b-default-rtdb.asia-southeast1.firebasedatabase.app'
$env:TRAVEL_ADMIN_UID = 'Ff9stQPFaRRvYFMYBMJXZRRqWjS2'
$env:TRAVEL_ADMIN_EMAIL = 'admin@gmail.com'
# ADC가 이미 준비되어 있다면 다음 줄은 생략합니다.
$env:GOOGLE_APPLICATION_CREDENTIALS = '프로젝트 폴더 밖의 서비스 계정 JSON 절대 경로'
python -m pip install -r requirements.txt
python server.py
```

브라우저에서 http://127.0.0.1:8000 으로 접속합니다. 기존 python -m http.server는 종료하고 새 서버를 실행해야 합니다. 포트가 사용 중이면 `python server.py --port 8002`를 사용합니다. 다른 PC에 공개하는 서버가 아니라 로컬 개발 서버입니다.

`/api/health`에서 ready가 false이면 안내에 따라 서버 설정을 보완합니다. 설정 전에는 화면에서 성공·저장을 가장하지 않습니다. 서비스 계정의 실제 DB 접근 권한도 확인해야 합니다.

## 데이터와 접근 방식 변경

기존 destinations, stays, members, reservations 경로와 과거 기록은 유지합니다. 예약 시 서버에서 nights, stayNameAtBooking, memberNameAtBooking, history를 추가 저장합니다. 예전 예약에는 해당 값이 없어도 ID와 기존 데이터를 이용해 표시합니다.

현재 프로그램은 Python API가 Firebase Admin SDK로 접근하며, 매 요청의 ID 토큰(만료·폐기·계정 비활성 포함), 회원 상태, 관리자 권한을 확인합니다. 보안 규칙은 회원 본인의 `/members/{UID}` 직접 생성·조회·수정과 관리자의 회원정보 조회를 추가 허용합니다. 여행지·숙소·예약의 브라우저 직접 접근은 차단합니다. 자세한 권한·입력 형식은 MEMBER-RULES.md를 참고합니다. 규칙은 아직 실제 프로젝트에 배포하지 않았습니다. 이 변경은 Python 서버 인증 설정을 대체하지 않습니다.

가격·날짜·인원·상태 변경은 Python 서버가 검증합니다. 예약 생성과 숙소 가격 변경을 DB 루트 트랜잭션으로 직렬화하고, 예약 신청 시점의 가격을 보존합니다. 첫 버전의 소규모 운영을 위한 방식이며 데이터가 커지면 별도 견적·예약 API와 구조를 설계해야 합니다.

여행지 삭제는 hidden, 숙소 삭제는 inactive 처리합니다. 여행지를 숨기면 연결 숙소도 비활성화됩니다. 과거 예약과 당시 금액은 유지되며 회원의 비밀번호는 members에 저장하지 않습니다.

## 로컬 Emulator 검증

Java 21 이상과 Firebase CLI가 필요합니다. 실제 프로젝트가 아닌 demo-travel에서 실행합니다.

터미널 1:

```powershell
firebase emulators:start --config firebase/emulator.json --project demo-travel --only auth,database
```

터미널 2 (테스트용 서버):

```powershell
$env:FIREBASE_AUTH_EMULATOR_HOST = '127.0.0.1:9099'
$env:FIREBASE_DATABASE_EMULATOR_HOST = '127.0.0.1:9000'
$env:TRAVEL_EMULATOR_PROJECT = 'demo-travel'
$env:TRAVEL_DATABASE_URL = 'http://127.0.0.1:9000?ns=demo-travel-default-rtdb'
$env:TRAVEL_ADMIN_EMAIL = 'admin@example.test'
$env:TRAVEL_ADMIN_UID = 'travel-test-admin'
python server.py --port 8001
```

터미널 3:

```powershell
python -m unittest discover -s tests -p test_emulator.py -v
```

테스트는 로컬 Emulator의 데이터를 재설정합니다. 테스트 코드는 서버 프로젝트 ID가 demo-travel인지 확인한 뒤에만 실행합니다. 실제 서버 실행 전에는 FIREBASE_AUTH_EMULATOR_HOST와 FIREBASE_DATABASE_EMULATOR_HOST 환경변수를 제거하고 실제 DB URL·관리자 설정으로 새 서버를 시작합니다.

## 운영 전 남은 확인

- 실제 계정으로 회원가입, 로그인 성공/실패, 로그아웃, 관리자 UID 권한 확인
- 실제 프로젝트의 Rules 배포 및 동일 접근 차단 확인
- 실제 데이터로 예약 신청 → 관리자 확정 → 내 예약 조회·취소 요청 확인
- 개인정보 처리방침·보관 기간·운영자 연락처 확정
- HTTPS Python API 호스팅과 배포 도메인 설정. 정적 Vercel 배포만으로 Python API는 실행되지 않습니다.
