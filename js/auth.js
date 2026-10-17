import { request } from './api.js';
import { firebaseRuntime } from './firebase.js';
import { notify, refreshSession, sessionReady } from './session.js';

const form = document.querySelector('#auth-form');
const mode = form.dataset.mode;
const status = document.querySelector('#form-status');
const submit = form.querySelector('[type="submit"]');
let healthReady = false;
async function checkSetup() {
  try {
    const health = await request('/api/health', { authenticated: false });
    healthReady = health.ready;
    status.textContent = health.ready ? '이메일과 비밀번호로 안전하게 인증합니다.' : health.message;
  } catch (error) { status.textContent = error.message; }
}
checkSetup();
sessionReady().then(session => {
  if (session && mode === 'signup' && !session.profile && session.role !== 'admin') {
    form.querySelector('[name="email"]').value = session.email;
    form.querySelector('[name="email"]').readOnly = true;
    form.querySelectorAll('[data-password-field]').forEach(field => {
      field.hidden = true;
      field.querySelector('input').required = false;
    });
    status.textContent = '현재 로그인 계정의 회원 정보를 완성해 주세요.';
  }
});
form.addEventListener('submit', async event => {
  event.preventDefault();
  if (!form.reportValidity()) return;
  const data = Object.fromEntries(new FormData(form));
  if (mode === 'signup' && data.password !== data.confirmPassword) {
    status.textContent = '비밀번호와 비밀번호 확인이 일치하지 않습니다.'; return;
  }
  if (mode === 'admin' && data.identifier !== 'admin') {
    notify('관리자 로그인 실패되었습니다.'); return;
  }
  submit.disabled = true;
  status.textContent = '처리 중입니다…';
  let createdUser = null;
  let profileSaved = false;
  try {
    if (!healthReady) {
      const health = await request('/api/health', { authenticated: false });
      if (!health.ready) throw new Error(health.message);
      healthReady = true;
    }
    const { auth, sdk, config } = await firebaseRuntime();
    if (mode === 'signup') {
      if (!auth.currentUser) {
        createdUser = (await sdk.createUserWithEmailAndPassword(auth, data.email.trim(), data.password)).user;
        await sdk.updateProfile(createdUser, { displayName: data.name.trim() });
      } else if (auth.currentUser.email?.toLowerCase() !== data.email.trim().toLowerCase()) {
        throw new Error('다른 계정으로 로그인되어 있습니다. 먼저 로그아웃해 주세요.');
      }
      await request('/api/profile', { method: 'POST', body: { name: data.name, phone: data.phone } });
      profileSaved = true;
      await sdk.signOut(auth);
      await notify('가입 완료되었습니다.');
      location.href = '/html/login.html';
      return;
    }
    const email = mode === 'admin' ? config.adminEmail : data.email.trim();
    if (!email) throw new Error('관리자 이메일 설정이 필요합니다. 서버의 TRAVEL_ADMIN_EMAIL을 설정해 주세요.');
    await sdk.signInWithEmailAndPassword(auth, email, data.password);
    let current;
    try {
      current = await refreshSession();
      if (mode === 'admin' && current.role !== 'admin') throw new Error('관리자 권한이 없는 계정입니다.');
    } catch (error) {
      await sdk.signOut(auth);
      throw error;
    }
    await notify(current.role === 'admin' ? '관리자 로그인 성공' : '로그인 되었습니다.');
    location.href = current.role === 'admin' ? '/html/admin.html' : '/index.html';
  } catch (error) {
    if (createdUser && !profileSaved) {
      // Auth and Database cannot share a transaction. Keep a recoverable account,
      // including when a successful profile write lost its network response.
      status.textContent = '계정은 생성되었으나 회원정보 저장 확인에 실패했습니다. 로그인 후 회원정보 완성을 진행해 주세요.';
    }
    const messages = {
      'auth/email-already-in-use': '이미 가입된 이메일입니다. 로그인해 주세요.',
      'auth/weak-password': '비밀번호는 6자 이상으로 입력해 주세요.',
      'auth/password-does-not-meet-requirements': 'Firebase 비밀번호 정책에 맞는 비밀번호를 입력해 주세요.',
      'auth/invalid-email': '올바른 이메일 주소를 입력해 주세요.',
      'auth/operation-not-allowed': 'Firebase에서 이메일/비밀번호 로그인을 활성화해 주세요.',
      'auth/network-request-failed': '네트워크 연결을 확인해 주세요.',
      'auth/too-many-requests': '요청이 많습니다. 잠시 후 다시 시도해 주세요.'
    };
    const message = messages[error.code] || (error.code ? '입력한 계정 정보를 확인해 주세요.' : error.message);
    if (!status.textContent.startsWith('계정은 생성')) status.textContent = message;
    notify(mode === 'signup' ? `회원가입에 실패했습니다. ${message}` : mode === 'admin' ? '관리자 로그인 실패되었습니다.' : '로그인 실패되었습니다.');
  } finally {
    form.querySelectorAll('[type="password"]').forEach(input => { input.value = ''; });
    submit.disabled = false;
  }
});
