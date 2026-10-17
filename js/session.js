import { request } from './api.js';
import { firebaseRuntime } from './firebase.js';
import { notify } from './popup.js';
export { notify } from './popup.js';

let session = null;
let syncPromise;
export function getSession() { return session; }
export async function refreshSession() {
  const { auth } = await firebaseRuntime();
  session = auth.currentUser ? await request('/api/session') : null;
  renderAccount();
  window.dispatchEvent(new CustomEvent('travel-session', { detail: session }));
  return session;
}
function renderAccount() {
  const menu = document.querySelector('#account-menu');
  if (!menu) return;
  menu.replaceChildren();
  const button = (label, action) => {
    const node = document.createElement('button');
    node.type = 'button'; node.className = 'login'; node.textContent = label;
    node.addEventListener('click', action); menu.append(node);
  };
  const link = (label, url) => button(label, () => { location.href = url; });
  if (session?.role === 'admin') {
    button('관리자로그아웃', logout);
    return;
  }
  button('예약', async () => {
    if (!session) { notify('로그인후 예약하시오'); return; }
    location.href = '/html/booking.html';
  });
  if (session) {
    if (!session.profile) link('회원정보 완성', '/html/signup.html');
    button('로그아웃', logout);
  } else {
    link('회원가입', '/html/signup.html');
    link('로그인', '/html/login.html');
    link('관리자', '/html/admin-login.html');
  }
}
export async function logout() {
  try {
    const { auth, sdk } = await firebaseRuntime();
    await sdk.signOut(auth);
    session = null; renderAccount();
    await notify('로그아웃되었습니다');
    location.href = '/index.html';
  } catch { notify('로그아웃에 실패했습니다. 다시 시도해 주세요.'); }
}
export async function sessionReady() {
  if (!syncPromise) syncPromise = start();
  return syncPromise;
}
async function start() {
  renderAccount();
  try {
    const { auth, sdk } = await firebaseRuntime();
    const initial = await refreshSession();
    let first = true;
    sdk.onAuthStateChanged(auth, () => {
      if (first) { first = false; return; }
      refreshSession().catch(() => { session = null; renderAccount(); });
    });
    return initial;
  } catch (error) {
    const status = document.querySelector('#connection-status');
    if (status) status.textContent = error.message;
    return null;
  }
}
sessionReady();
