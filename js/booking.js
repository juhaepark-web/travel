import { request, element, money, statusLabels, stamp } from './api.js';
import { sessionReady, notify } from './session.js';
import { confirmAction } from './popup.js';
const status = document.querySelector('#booking-status');
const form = document.querySelector('#booking-form');
const select = document.querySelector('#stay-select');
let catalog = [], bookings = [], requestId = crypto.randomUUID();
const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Seoul', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
form.elements.checkIn.min = today;
form.elements.checkOut.min = today;
function estimate() {
  const stay = catalog.find(item => item.id === select.value);
  const nights = (Date.parse(form.elements.checkOut.value) - Date.parse(form.elements.checkIn.value)) / 86400000;
  if (stay) form.elements.guestCount.max = stay.maxGuests;
  document.querySelector('#booking-estimate').textContent = stay && nights >= 1 && nights <= 30
    ? `${nights}박 · 예상 ${money(nights * stay.pricePerNight)} · 최대 ${stay.maxGuests}명`
    : '숙소와 1~30박의 올바른 날짜를 선택해 주세요.';
}
form.addEventListener('input', () => { requestId = crypto.randomUUID(); estimate(); });
form.addEventListener('change', () => {
  if (form.elements.checkIn.value) {
    const next = new Date(`${form.elements.checkIn.value}T00:00:00Z`);
    next.setUTCDate(next.getUTCDate() + 1);
    form.elements.checkOut.min = next.toISOString().slice(0, 10);
  }
  estimate();
});
async function loadBookings() {
  const container = document.querySelector('#my-bookings');
  container.textContent = '예약을 불러오는 중…';
  try {
    ({ items: bookings } = await request('/api/reservations'));
    bookings.sort((a,b) => b.createdAt - a.createdAt);
    container.replaceChildren();
    if (!bookings.length) container.append(element('p', '아직 신청한 예약이 없습니다.', 'notice'));
    for (const booking of bookings) {
      const card = element('article', undefined, 'data-card');
      card.append(element('span', statusLabels[booking.status] || booking.status, 'badge'), element('h3', booking.stayNameAtBooking || '숙소'), element('p', `예약번호 ${booking.id}`));
      const dl = element('dl');
      for (const [label, value] of [['숙박 일정', `${booking.checkIn} → ${booking.checkOut}`], ['인원', `${booking.guestCount}명`], ['예약 시 금액', money(booking.totalPrice)], ['신청 시각', stamp(booking.createdAt)]]) dl.append(element('dt', label), element('dd', value));
      card.append(dl);
      if (['requested', 'confirmed'].includes(booking.status)) {
        const cancel = element('button', '취소 요청', 'secondary');
        cancel.addEventListener('click', async () => {
          if (!await confirmAction('이 예약의 취소를 요청하시겠습니까?')) return;
          cancel.disabled = true;
          try {
            await request('/api/reservations/status', { method: 'POST', body: { id: booking.id, updatedAt: booking.updatedAt, status: 'cancel_requested' } });
            notify('취소 요청을 접수했습니다.'); await loadBookings();
          } catch (error) { notify(error.message); cancel.disabled = false; }
        });
        card.append(cancel);
      }
      container.append(card);
    }
  } catch (error) { container.textContent = error.message; }
}
document.querySelector('#refresh-bookings').addEventListener('click', loadBookings);
form.addEventListener('submit', async event => {
  event.preventDefault();
  if (!form.reportValidity()) return;
  const stay = catalog.find(item => item.id === select.value);
  if (!stay) return;
  const submit = form.querySelector('[type="submit"]');
  submit.disabled = true;
  try {
    const data = Object.fromEntries(new FormData(form));
    const result = await request('/api/reservations', { method: 'POST', body: { ...data, guestCount: Number(data.guestCount), expectedNightlyPrice: stay.pricePerNight, requestId } });
    requestId = crypto.randomUUID();
    await notify(`예약 신청을 접수했습니다.\n예약번호: ${result.id}\n총액: ${money(result.reservation.totalPrice)}\n관리자 확인 후 확정됩니다.`);
    await loadBookings();
  } catch (error) { notify(error.message); }
  finally { submit.disabled = false; }
});
async function start() {
  const session = await sessionReady();
  if (!session) { status.textContent = '로그인후 예약하시오'; await notify('로그인후 예약하시오'); location.href = '/html/login.html'; return; }
  if (session.role === 'admin') { location.href = '/html/admin.html'; return; }
  if (!session.profile) { status.textContent = '회원가입 화면에서 회원정보를 완성해 주세요.'; return; }
  try {
    const result = await request('/api/catalog', { authenticated: false });
    catalog = result.stays;
    document.querySelector('#booking-content').hidden = false;
    const list = document.querySelector('#booking-stays');
    for (const stay of catalog) {
      select.append(new Option(stay.name, stay.id));
      const card = element('article', undefined, 'data-card');
      card.append(element('h3', stay.name), element('p', stay.description), element('p', `${stay.address} · ${stay.phone}`), element('strong', `${money(stay.pricePerNight)} / 1박`));
      const choose = element('button', '이 숙소 선택', 'secondary');
      choose.addEventListener('click', () => { select.value = stay.id; requestId = crypto.randomUUID(); estimate(); select.focus(); });
      card.append(element('p', `최대 ${stay.maxGuests}명`), choose); list.append(card);
    }
    const chosen = new URLSearchParams(location.search).get('stay');
    if (catalog.some(item => item.id === chosen)) select.value = chosen;
    status.textContent = catalog.length ? '숙소를 선택해 예약을 신청해 주세요.' : '현재 예약 신청 가능한 숙소가 없습니다.';
    form.querySelector('[type="submit"]').disabled = !catalog.length;
    await loadBookings(); estimate();
  } catch (error) { status.textContent = error.message; }
}
start();
