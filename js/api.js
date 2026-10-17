export async function request(path, { method = 'GET', body, authenticated = true } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (authenticated) {
    const { firebaseRuntime } = await import('./firebase.js');
    const { auth } = await firebaseRuntime();
    if (!auth.currentUser) throw new Error('로그인후 예약하시오');
    headers.Authorization = `Bearer ${await auth.currentUser.getIdToken()}`;
  }
  const response = await fetch(path, { method, headers, body: body ? JSON.stringify(body) : undefined, signal: AbortSignal.timeout(20000) });
  if (!response.headers.get('content-type')?.includes('application/json')) throw new Error('Python API 서버를 실행해 주세요: python server.py');
  const data = await response.json();
  if (!response.ok) {
    const error = new Error(data.message || '요청 처리에 실패했습니다.');
    error.status = response.status;
    throw error;
  }
  return data;
}
export const money = value => `${Number(value || 0).toLocaleString('ko-KR')}원`;
export const stamp = value => value ? new Date(value).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' }) : '-';
export const statusLabels = { requested: '예약 신청', confirmed: '예약 확정', cancel_requested: '취소 요청', canceled: '취소 완료', completed: '이용 완료', published: '공개', hidden: '숨김', draft: '초안', active: '활성', inactive: '비활성', suspended: '이용 정지' };
export function element(tag, content, className) {
  const node = document.createElement(tag);
  if (content !== undefined) node.textContent = content;
  if (className) node.className = className;
  return node;
}
