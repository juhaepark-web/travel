# 여행지 소개·주변 숙소 예약 사이트 기획서

## 1. 서비스 개요

### 서비스 목적

여행지를 둘러보고, 각 여행지 주변의 숙소를 검색·확인한 뒤 회원이 예약을 신청하고 내 예약을 조회하는 웹사이트를 만든다. 관리자는 관리자 대시보드에서 회원, 여행지, 숙소, 예약 정보를 조회하고 관리한다.

### 사용자 유형

| 사용자 | 할 수 있는 일 |
|---|---|
| 방문자 | 여행지와 숙소 목록·상세 정보 보기, 회원가입·로그인 |
| 회원 | 숙소 검색, 예약 신청, 본인 예약 조회 및 취소 요청 |
| 관리자 | 대시보드에서 회원·여행지·숙소·예약 조회 및 관리 |

### 기술 원칙

- 화면 기술: HTML, CSS, 순수 JavaScript
- 메인 화면: 프로젝트 루트의 index.html
- 나머지 화면: html 폴더
- CSS 파일: css 폴더
- JavaScript 파일: js 폴더
- 화면은 모바일과 데스크톱을 모두 고려한다.
- 서버: Python server.py로 로컬 정적 파일과 API 실행. 인증 토큰·권한·예약 금액은 서버에서 검증
- 데이터베이스: Firebase Realtime Database (Python API에서 접근, 브라우저 직접 접근 차단)
- 회원 인증: Firebase Authentication. 비밀번호는 Authentication에만 맡기고 members 데이터에 복사하지 않는다.
- 배포 흐름: 기능 구현 → Firebase 연동·보안 규칙 검증 → GitHub 업로드 → Vercel 배포
- 첫 버전 예약은 회원의 신청을 관리자가 확인 후 확정한다. 온라인 결제와 날짜별 실시간 객실 재고는 이번 범위에서 제외한다.

## 2. 메뉴 구성

### 방문자·회원 메뉴

| 주메뉴 | 보조메뉴 | 접근 권한 |
|---|---|---|
| 여행지 | 여행지 둘러보기, 여행지 상세 | 누구나 |
| 숙소 | 숙소 찾기, 숙소 상세 | 누구나 |
| 예약 | 숙소 예약, 예약 완료, 내 예약 | 예약 신청과 내 예약은 로그인 회원 |
| 회원 | 로그인, 회원가입, 내 정보 | 일부는 로그인 필요 |

### 관리자 메뉴

관리자 메뉴는 일반 이용자 메뉴와 분리하고 관리자 권한이 확인된 계정만 접근하게 한다.

| 주메뉴 | 보조메뉴 |
|---|---|
| 대시보드 | 운영 현황, 최근 예약, 빠른 등록 |
| 여행지 관리 | 여행지 목록, 여행지 등록 |
| 숙소 관리 | 숙소 목록, 숙소 등록 |
| 회원 관리 | 회원 목록, 회원 상세 |
| 예약 관리 | 예약 목록, 예약 상세·상태 변경 |

## 3. 화면 구조와 예정 파일명

index.html을 제외한 화면 파일은 html 폴더에 둔다. 관리자 화면은 html/admin 하위 폴더에 둔다.

### 공개·회원 화면

| 화면 | 파일명 | 주요 내용·동작 |
|---|---|---|
| 메인 | index.html | 서비스 소개, 추천 여행지, 추천 숙소, 검색 진입 |
| 여행지 목록 | html/destinations.html | 여행지 검색·지역 필터, 카드 목록 |
| 여행지 상세 | html/destination-detail.html | 설명, 대표 이미지, 위치 정보, 주변 숙소 |
| 숙소 목록 | html/stays.html | 여행지·날짜·인원 기준 검색, 숙소 목록과 가격 |
| 숙소 상세 | html/stay-detail.html | 숙소 설명·위치·연락처·가격, 예약 진입 |
| 로그인 | html/login.html | 회원 로그인 |
| 회원가입 | html/signup.html | 회원 정보 입력과 가입 |
| 예약 입력 | html/booking-form.html | 숙박 날짜, 인원, 예약자 확인, 금액 확인 |
| 예약 완료 | html/booking-complete.html | 예약 번호와 처리 상태 안내 |
| 내 예약 | html/my-bookings.html | 로그인 회원 본인의 예약 목록·상태 |
| 예약 상세 | html/booking-detail.html | 선택한 예약 정보와 취소 요청 |
| 내 정보 | html/my-page.html | 본인 정보 조회·수정 |

### 관리자 화면

| 화면 | 파일명 | 주요 내용·동작 |
|---|---|---|
| 관리자 대시보드 | html/admin.html | 회원·여행지·숙소·예약 요약, 최근 예약, 빠른 등록 |
| 여행지 목록 | html/admin/destinations.html | 검색·상태 필터·상세·수정·비활성화 |
| 여행지 등록·수정 | html/admin/destination-form.html | 여행지 정보 입력·수정 |
| 숙소 목록 | html/admin/stays.html | 여행지 필터·검색·상태 필터·수정·비활성화 |
| 숙소 등록·수정 | html/admin/stay-form.html | 여행지 연결, 숙소 정보 입력·수정 |
| 회원 목록 | html/admin/members.html | 이름·이메일 검색, 상태·가입일 확인 |
| 회원 상세 | html/admin/member-detail.html | 기본 정보와 예약 이력 확인, 계정 상태 변경 |
| 예약 목록 | html/admin/bookings.html | 예약번호·회원·숙소·날짜·상태 검색·필터 |
| 예약 상세 | html/admin/booking-detail.html | 예약 정보와 상태 변경 이력 확인 |

### 공통 리소스 파일

| 파일명 | 용도 |
|---|---|
| css/common.css | 공통 색상, 글꼴, 버튼, 폼, 레이아웃 |
| css/public.css | 방문자·회원 화면 |
| css/admin.css | 관리자 대시보드와 관리 화면 |
| js/common.js | 공통 메뉴, 로그인 사용자 표시, 공통 메시지 |
| js/destinations.js | 여행지 목록·상세 화면 동작 |
| js/stays.js | 숙소 검색·목록·상세 화면 동작 |
| js/auth.js | 로그인·회원가입 화면 동작과 인증 연동 지점 |
| js/booking.js | 예약 입력·검증·완료 화면 동작 |
| js/my-bookings.js | 내 예약 조회·취소 요청 |
| js/admin/dashboard.js | 관리자 요약 현황 |
| js/admin/destinations.js | 여행지 관리 화면 |
| js/admin/stays.js | 숙소 관리 화면 |
| js/admin/members.js | 회원 관리 화면 |
| js/admin/bookings.js | 예약 관리 화면 |
| js/firebase-config.example.js | Firebase 웹 설정 입력 예시, 실제 프로젝트 값은 준비 후 연결 |
| js/firebase.js | Firebase 앱·Authentication·Realtime Database 초기화 |
| firebase/database.rules.json | Realtime Database 접근 규칙 |
| firebase.json | Firebase CLI 규칙 파일 경로 설정 |
| docs/FIREBASE-SETUP.md | Firebase 프로젝트 연결 준비 절차 |
| docs/DEPLOYMENT.md | 통합 검증 후 GitHub 및 Vercel 배포 순서 |

## 4. Firebase Realtime Database 구조

Realtime Database는 관계형 SQL 테이블이 아니라 JSON 트리다. 아래 경로를 사용하고, 사용자가 요청한 네 데이터 묶음의 이름은 그대로 유지한다.

| 논리 테이블 | Realtime Database 경로 | 식별자·연결 |
|---|---|---|
| destinations | /destinations/{destinationId} | destinationId |
| stays | /stays/{stayId} | stayId, destinationId |
| members | /members/{uid} | uid는 Firebase Authentication 사용자 UID |
| reservations | /reservations/{reservationId} | reservationId, memberId, stayId |

여행지 한 곳에 여러 숙소가 연결된다. 회원 비밀번호는 Firebase Authentication이 관리하며 /members에는 프로필과 운영 상태만 기록한다.

## 5. 최소 데이터 테이블 설계

아래는 네 논리 테이블의 최소 필드다. 실제 Firebase 경로에서는 표의 ID가 각 경로의 자식 키가 되고, 필드 이름은 JavaScript에서 다루기 쉬운 camelCase로 쓴다.

### 5.1 여행지 테이블: destinations

| 항목 | 필수 | 설명 |
|---|---:|---|
| destinationId | 예 | Realtime Database 자식 키 |
| name | 예 | 여행지 이름 |
| region | 예 | 시·도 또는 지역명, 검색·필터에 사용 |
| address | 예 | 지도 표시 및 위치 안내에 사용할 주소 |
| summary | 예 | 목록 카드용 한 줄 소개 |
| description | 예 | 상세 소개 |
| imageUrl | 예 | 대표 이미지 경로 또는 URL |
| status | 예 | draft, published, hidden 중 하나 |
| createdAt | 예 | 등록일 |
| updatedAt | 예 | 수정일 |

### 5.2 숙소 테이블: stays

| 항목 | 필수 | 설명 |
|---|---:|---|
| stayId | 예 | Realtime Database 자식 키 |
| destinationId | 예 | 주변 여행지 연결 키 |
| name | 예 | 숙소 이름 |
| address | 예 | 숙소 주소 |
| description | 예 | 숙소 소개 |
| phone | 예 | 문의 전화번호 |
| pricePerNight | 예 | 1박 기준 표시 가격 |
| maxGuests | 예 | 1회 예약 기준 최대 인원 |
| imageUrl | 예 | 대표 이미지 경로 또는 URL |
| status | 예 | active 또는 inactive |
| createdAt | 예 | 등록일 |
| updatedAt | 예 | 수정일 |

### 5.3 회원 테이블: members

| 항목 | 필수 | 설명 |
|---|---:|---|
| uid | 예 | Firebase Authentication에서 발급한 사용자 UID이자 경로 키 |
| name | 예 | 회원 이름 |
| email | 예 | 인증 계정 이메일 |
| phone | 예 | 예약 연락용 |
| status | 예 | active 또는 suspended |
| createdAt | 예 | 가입일 |
| updatedAt | 예 | 수정일 |

비밀번호는 이 데이터 경로에 저장하지 않는다. 회원 로그인과 이메일 인증은 Firebase Authentication으로 처리한다. 관리자 권한은 안전한 관리자 UID 허용 목록 또는 신뢰할 수 있게 부여한 Firebase Authentication custom claim으로 확인하며, 회원이 자신의 프로필에서 관리자 권한을 바꿀 수 없어야 한다.

### 5.4 예약 테이블: reservations

| 항목 | 필수 | 설명 |
|---|---:|---|
| reservationId | 예 | Realtime Database 자식 키 및 예약번호 |
| memberId | 예 | 예약 회원 UID |
| stayId | 예 | 예약 숙소 키 |
| checkIn | 예 | 체크인 날짜 |
| checkOut | 예 | 체크아웃 날짜, 체크인 이후여야 함 |
| guestCount | 예 | 예약 인원 |
| nightlyPriceAtBooking | 예 | 예약 신청 시점 1박 가격 |
| totalPrice | 예 | 예약 신청 시점 기준 총액 |
| status | 예 | requested, confirmed, cancel_requested, canceled, completed |
| createdAt | 예 | 예약 신청 시각 |
| updatedAt | 예 | 마지막 변경 시각 |

첫 버전은 회원이 예약을 신청하면 requested 상태로 등록하고, 관리자가 날짜별 가능 여부를 확인한 뒤 confirmed로 변경한다. 회원 취소 요청은 cancel_requested, 관리자의 처리 완료는 canceled로 기록한다. 결제 및 환불은 첫 버전에서 다루지 않으며 카드 정보를 수집하지 않는다.

### 데이터 관계

- 여행지 하나에 여러 숙소가 연결된다.
- 회원 한 명이 여러 예약을 할 수 있다.
- 숙소 하나에 여러 예약 기록이 연결된다.
- 예약 기록은 당시 가격을 보존하며, 회원이나 숙소를 비활성화해도 과거 예약 기록을 남긴다.

## 6. 주요 사용자 흐름

### 여행지에서 숙소 예약하기

메인 또는 여행지 목록 → 여행지 상세 → 주변 숙소 보기 → 숙소 목록/상세 → 로그인 → 날짜와 인원 입력 → 예약 내용 확인 → 예약 신청 → 예약 완료 및 내 예약 확인

### 내 예약 확인하기

로그인 → 내 예약 목록 → 예약 상세 → 예약 상태 확인 또는 취소 요청

### 관리자 업무

관리자 로그인 → 대시보드 → 관리할 항목 선택 → 검색·필터 → 상세 확인 → 등록 또는 수정 → 저장 결과 확인

## 7. 관리자 대시보드 설계

### 첫 화면 요약

- 전체 회원 수와 활성 회원 수
- 공개 여행지 수
- 활성 숙소 수
- 상태별 예약 수: 요청, 확정, 취소, 완료
- 최근 예약 목록
- 여행지 등록, 숙소 등록으로 바로 가는 버튼

### 관리 화면 공통 기능

- 목록: 검색, 필요한 필터, 정렬, 상세보기
- 등록·수정: 필수값 표시, 입력값 검증, 저장 결과 안내
- 삭제·비활성화: 확인 메시지 표시
- 예약 연결 정보가 있는 회원·숙소·여행지는 과거 기록이 유지되도록 기본적으로 비활성화한다.
- 회원 삭제 대신 suspended 처리, 여행지 숨김 또는 숙소 비활성화를 우선한다.
- 예약은 목록에서 삭제하지 않고 상태 변경으로 관리한다.

## 8. 범위와 결정 필요 항목

### 첫 버전 범위

- 여행지와 주변 숙소를 목록·상세 화면으로 제공
- 여행지와 숙소 검색
- 회원 가입·로그인 화면 및 예약 신청 흐름
- 회원 본인의 예약 조회
- 관리자의 회원·여행지·숙소·예약 관리 대시보드
- 모바일 대응

### 구현 전에 결정할 항목

1. Firebase Realtime Database 리전과 실제 databaseURL
2. Firebase Authentication에서 이메일/비밀번호 외에 추가 로그인 방식을 사용할지
3. 최초 관리자 UID와 관리자 권한 부여 방식
4. 온라인 결제 여부와 제공자, 환불·취소 정책. 첫 버전은 결제하지 않는다.
5. 객실 종류와 날짜별 재고를 자동 관리할지. 첫 버전은 관리자가 가용성을 확인한다.
6. 지도 서비스와 지도 API 사용 여부
7. 대표 이미지 URL 방식으로 시작할지 Firebase Storage를 추가할지
8. 개인정보 보관·삭제 정책과 운영자 연락 정보
9. 실제 GitHub 저장소와 Vercel 계정·프로젝트 연결 대상

### 안전 및 기술 한계

회원 인증은 Firebase Authentication, 데이터 접근은 Realtime Database 보안 규칙으로 제어한다. 첫 버전의 예약은 신청 후 관리자가 날짜별 가능 여부와 가격을 확인해 확정한다. 객실 재고 자동 잠금과 온라인 결제는 지원하지 않으므로 신청 화면과 완료 화면에 예약 확정 전임을 표시한다.

## 9. 구현·Firebase·배포 순서

1. 기획 검토 후 화면과 공통 레이아웃을 HTML, CSS, 순수 JavaScript로 구현한다.
2. Firebase 프로젝트를 만들고 Realtime Database 리전과 Authentication 로그인 방식을 설정한다.
3. Firebase 웹 앱 설정값을 js/firebase-config.example.js에서 복사해 js/firebase-config.js에 입력한다.
4. Firebase Realtime Database에 destinations, stays, members, reservations 경로를 연결한다.
5. firebase/database.rules.json을 실제 관리자 UID에 맞게 설정하고 Rules Simulator 또는 Emulator로 비로그인·일반 회원·관리자 권한을 점검한다.
6. 회원 가입·로그인, 여행지·숙소 등록 및 공개, 본인 예약 신청·조회, 관리자 예약 확인·취소 흐름을 테스트한다.
7. 테스트가 끝나면 개인 키, 서비스 계정 키, 실제 회원 개인정보, 불필요한 시험 데이터를 제거한 뒤 GitHub에 업로드한다.
8. Python API와 HTTPS를 지원하는 운영 호스팅을 준비한다. Vercel 정적 배포만으로는 가입·예약 API가 실행되지 않는다. docs/DEPLOYMENT.md를 따른다.
9. 배포된 주소에서 주요 화면, Authentication, Realtime Database 읽기·쓰기와 보안 규칙을 다시 확인한다.

Firebase 웹 설정은 브라우저 앱을 식별하기 위한 클라이언트 설정이다. 보안은 설정을 숨기는 방식이 아니라 Authentication과 Database Rules로 제공한다. 서비스 계정 JSON, Admin SDK 비공개 키, 비밀번호는 GitHub에 올리지 않는다.

## 10. 현재 구현된 통합 화면과 API

회원가입 html/signup.html, 회원 로그인 html/login.html, 관리자 로그인 html/admin-login.html, 관리자 대시보드 html/admin.html, 예약 신청·내 예약 html/booking.html을 구현했다. 로그인 전에는 예약/회원가입/로그인/관리자 버튼, 회원은 예약/로그아웃, 관리자는 관리자로그아웃만 표시한다. admin 입력은 admin@gmail.com의 Authentication 로그인으로 연결하며 서버가 실제 관리자 UID 또는 admin custom claim을 검증한다.

예약 생성과 상태 전이는 Python API에서만 수행하며 브라우저의 임의 금액을 신뢰하지 않는다. 예약에 nights, stayNameAtBooking, memberNameAtBooking, history를 추가한다. 여행지 숨김 시 연결된 숙소를 비활성화하고 기존 예약은 유지한다. 예약 완료는 체크아웃 날짜 이후에만 처리한다.

현재 인증·관리·예약 코드는 로컬 Firebase Emulator로 검증한다. 실제 프로젝트 연동은 DB URL, 관리자 UID, 서버 인증 설정 후 별도로 검증해야 한다. 운영 배포와 개인정보 정책은 아직 완료되지 않았다.
