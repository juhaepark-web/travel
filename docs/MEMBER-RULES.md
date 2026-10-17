# 회원정보 저장·조회 보안 규칙

Firebase Console → Realtime Database → 규칙에서 `firebase/database.rules.json` 전체 내용을 붙여넣고 게시합니다. 이 작업에서는 로컬 파일 작성과 Emulator 검증만 수행했으며 실제 프로젝트에는 게시하지 않았습니다.

## 허용 범위

- 회원: Authentication에서 로그인한 UID와 같은 `/members/{UID}`만 생성·조회·수정
- 관리자: UID `Ff9stQPFaRRvYFMYBMJXZRRqWjS2` 또는 신뢰할 수 있게 부여된 `admin: true` 토큰으로 `/members` 전체 조회
- 비로그인: 회원정보 읽기·쓰기 차단
- 회원정보 삭제, 비밀번호·role·admin 등 임의 필드 저장, 가입일 변조, 정지 회원의 자가 복구 차단
- 여행지·숙소 관리와 예약 쓰기는 기존 Python API를 유지 (클라이언트 DB 직접 쓰기 차단)

허용되는 회원 필드는 name, email, phone, status, createdAt, updatedAt 여섯 개입니다. email은 로그인 계정의 이메일과 일치해야 하고 status는 active입니다. 생성 시 createdAt과 updatedAt에는 Firebase 서버 타임스탬프를 사용하고, 수정 시 createdAt을 유지하며 updatedAt만 서버 타임스탬프로 갱신합니다. 이름은 최대 60자, 연락처는 8~30자의 숫자·+·괄호·공백·하이픈을 허용합니다.

```javascript
// 브라우저 Database SDK로 직접 저장할 때의 데이터 형식 예시.
// 현재 사이트의 /api/profile 코드를 자동으로 대체하는 코드는 아닙니다.
import { getDatabase, ref, set, get, serverTimestamp }
  from 'https://www.gstatic.com/firebasejs/13.0.0/firebase-database.js';

// app/auth는 같은 Firebase 앱으로 초기화되어 있고 회원이 로그인한 상태여야 합니다.
const db = getDatabase(app, 'https://travel-2bb1b-default-rtdb.asia-southeast1.firebasedatabase.app');
await set(ref(db, `members/${auth.currentUser.uid}`), {
  name: nameInput.value.trim(),
  email: auth.currentUser.email,
  phone: phoneInput.value.trim(),
  status: 'active',
  createdAt: serverTimestamp(),
  updatedAt: serverTimestamp()
});
const profile = await get(ref(db, `members/${auth.currentUser.uid}`));
```

이 예시는 신규 프로필 생성용입니다. 이미 저장된 회원정보를 수정할 때 createdAt을 덮어쓰지 않습니다. 회원이 `/members` 전체를 읽는 요청은 차단되므로 반드시 본인 UID 경로로 요청해야 합니다.

## 현재 프로그램에서 중요한 점

관리자 비밀번호 인증은 Realtime Database 규칙이 아니라 Firebase Authentication이 처리합니다. 관리자 비밀번호를 members나 admins 경로에 저장하지 않습니다. admin 입력은 admin@gmail.com으로 연결하며 서버는 검증된 ID 토큰의 UID·권한을 확인합니다.

현재 프로그램의 회원가입은 `/api/profile`, 관리자 조회는 `/api/admin/data`를 호출합니다. 두 API는 Python Firebase Admin SDK를 사용하므로 위 브라우저 규칙 변경만으로 서버 인증 오류가 해결되지는 않습니다. 서버에는 Application Default Credentials 또는 프로젝트 폴더 밖의 서비스 계정 파일 경로 설정이 별도로 필요합니다. 서비스 계정 키 내용은 브라우저·채팅·저장소에 넣지 않습니다. 실제 서버 설정은 FIREBASE-SETUP.md를 따릅니다.

현재 데이터 구조나 예약 금액·기록은 변경하지 않았습니다. 기존 members 데이터에 여섯 필드 이외의 필드가 있거나 타임스탬프가 다른 형식이면 브라우저의 직접 수정은 거부될 수 있습니다. 기존 데이터를 무조건 삭제하거나 덮어쓰지 말고 먼저 확인합니다. Python API의 기존 저장·조회 경로는 유지됩니다.

## 검증

로컬 Firebase Authentication/Realtime Database Emulator의 demo-travel 프로젝트에서 `python -m unittest discover -s tests -p test_profile_rules.py -v` 8개 테스트를 통과했습니다. 실제 프로젝트의 계정·보안 규칙 게시 및 실제 저장은 별도로 확인해야 합니다.

공식 참고: https://firebase.google.com/docs/database/security/rules-conditions , https://firebase.google.com/docs/database/admin/start
