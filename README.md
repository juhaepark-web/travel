# 실행 및 구현 상태

## 실행

이 프로젝트는 HTML/CSS/순수 JavaScript와 Python API 서버를 사용합니다.

```powershell
python -m pip install -r requirements.txt
python server.py
```

브라우저: http://127.0.0.1:8000

실제 DB URL, 관리자 UID, 서버 Firebase 인증 설정은 docs/FIREBASE-SETUP.md를 따릅니다. `python -m http.server`는 화면 파일만 제공하며 가입·예약 API를 제공하지 않습니다.

## 화면

- index.html: 여행지 검색·필터, 주변 숙소, 위로 이동 버튼
- html/signup.html: 회원가입, 회원정보 저장·복구
- html/login.html: 이메일/비밀번호 로그인
- html/admin-login.html: admin 입력을 관리자 이메일에 연결한 Firebase 로그인
- html/admin.html: 관리자 대시보드, 여행지·숙소 CRUD, 예약 처리, 회원 상세·예약 이력
- html/booking.html: 예약 신청, 내 예약, 취소 요청

로그인 전 메뉴는 예약/회원가입/로그인/관리자입니다. 회원 로그인 시 예약/로그아웃, 관리자 로그인 시 관리자로그아웃만 표시됩니다. 관리자 인증은 메뉴 숨김과 별개로 서버가 검증합니다.

메인 화면은 DB 연결 성공 시 실제 공개 데이터를 표시합니다. 연결 실패 시에만 예시 데이터를 표시하며 예시 숙소로 실제 예약할 수 없습니다.

## 문서

- AGENTS.md: 개발 규칙
- docs/PRD.md: 기획과 데이터 설계
- docs/FIREBASE-SETUP.md: 실제 서비스 연결, Emulator 테스트
- docs/DEPLOYMENT.md: 배포 제한 및 체크 항목
- tests/test_emulator.py: 로컬 Firebase 통합 검증

실제 Firebase 계정·서버 인증이 준비되기 전에는 실제 연동 검증을 완료했다고 간주하지 않습니다.
