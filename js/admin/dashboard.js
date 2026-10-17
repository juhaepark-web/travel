import { request, element, money, stamp, statusLabels } from '../api.js';
import { sessionReady, notify } from '../session.js';
import { confirmAction } from '../popup.js';
let data = { destinations: [], stays: [], members: [], reservations: [] };
let tab = 'overview', editing = null, loading = false;
const titles = { overview: '운영 현황', destinations: '여행지 관리', stays: '숙소 관리', reservations: '예약 확인', members: '회원정보' };
const tableArea = document.querySelector('#admin-table');
const search = document.querySelector('#admin-search');
const filter = document.querySelector('#admin-filter');
const editor = document.querySelector('#editor-dialog');
const info = document.querySelector('#info-dialog');
const destinationName = id => data.destinations.find(item => item.id === id)?.name || id;
const memberName = id => data.members.find(item => item.id === id)?.name || id;
const stayName = item => item.stayNameAtBooking || data.stays.find(stay => stay.id === item.stayId)?.name || item.stayId;
function action(label, handler, danger = false) {
  const button = element('button', label, `secondary${danger ? ' danger' : ''}`); button.type = 'button'; button.addEventListener('click', handler); return button;
}
function table(headers, rows) {
  tableArea.replaceChildren();
  if (!rows.length) { tableArea.append(element('p', loading ? '불러오는 중…' : '표시할 항목이 없습니다.')); return; }
  const table = element('table'); const thead = element('thead'); const tr = element('tr');
  for (const label of headers) { const th = element('th', label); th.scope = 'col'; tr.append(th); } thead.append(tr);
  const body = element('tbody');
  for (const cells of rows) {
    const row = element('tr');
    for (const value of cells) { const cell = element('td'); if (value instanceof Node) cell.append(value); else cell.textContent = value; row.append(cell); }
    body.append(row);
  }
  table.append(thead, body); tableArea.append(table);
}
function showInfo(title, entries, actions = []) {
  document.querySelector('#info-title').textContent = title;
  const dl = document.querySelector('#info-data'); dl.replaceChildren();
  for (const [key, value] of entries) dl.append(element('dt', key), element('dd', String(value ?? '-')));
  document.querySelector('#info-actions').replaceChildren(...actions); info.showModal();
}
function bookingInfo(item) {
  const states = { requested: ['confirmed', 'canceled'], confirmed: ['cancel_requested', 'completed'], cancel_requested: ['canceled', 'confirmed'] };
  const actions = (states[item.status] || []).map(status => action(statusLabels[status], async () => {
    if (!await confirmAction(status === 'confirmed' ? '숙소 가능 여부와 예약 금액을 확인했습니까? 예약을 확정합니다.' : `${statusLabels[status]} 상태로 변경하시겠습니까?`)) return;
    try {
      await request('/api/reservations/status', { method: 'POST', body: { id: item.id, status, updatedAt: item.updatedAt } });
      info.close(); notify('예약 상태를 변경했습니다.'); await load();
    } catch (error) { notify(error.message); }
  }));
  const member = data.members.find(record => record.id === item.memberId);
  showInfo('예약 상세', [['예약번호', item.id], ['숙소', stayName(item)], ['숙소 ID', item.stayId], ['예약자', item.memberNameAtBooking || memberName(item.memberId)], ['이메일', member?.email], ['연락처', member?.phone], ['회원 UID', item.memberId], ['일정', `${item.checkIn} → ${item.checkOut}`], ['인원', `${item.guestCount}명`], ['예약 당시 1박', money(item.nightlyPriceAtBooking)], ['총액', money(item.totalPrice)], ['상태', statusLabels[item.status]], ['신청 시각', stamp(item.createdAt)], ['변경 이력', (item.history || []).map(entry => `${stamp(entry.at)} · ${statusLabels[entry.status] || entry.status} · ${entry.by}`).join('\n')]], actions);
}
function memberInfo(item) {
  const bookings = data.reservations.filter(booking => booking.memberId === item.id);
  showInfo('회원 상세', [['UID', item.id], ['이름', item.name], ['이메일', item.email], ['연락처', item.phone], ['상태', statusLabels[item.status]], ['가입일', stamp(item.createdAt)], ['예약 이력', bookings.map(booking => `${booking.id} · ${stayName(booking)} · ${statusLabels[booking.status]} · ${money(booking.totalPrice)}`).join('\n') || '예약 이력이 없습니다.']]);
}
function catalogInfo(item) {
  const entries = [['ID', item.id], ['이름', item.name], ['지역/여행지', tab === 'destinations' ? item.region : destinationName(item.destinationId)], ['주소', item.address], ['설명', item.description], ['상태', statusLabels[item.status]], ['등록일', stamp(item.createdAt)], ['수정일', stamp(item.updatedAt)]];
  if (tab === 'stays') entries.push(['1박 가격', money(item.pricePerNight)], ['최대 인원', item.maxGuests], ['연락처', item.phone], ['연결 예약', data.reservations.filter(booking => booking.stayId === item.id).length]);
  else entries.push(['연결 숙소', data.stays.filter(stay => stay.destinationId === item.id).length]);
  showInfo('등록 정보 상세', entries);
}
function render() {
  document.querySelector('#panel-title').textContent = titles[tab];
  document.querySelector('#overview').hidden = tab !== 'overview';
  document.querySelector('#new-item').hidden = !['destinations', 'stays'].includes(tab);
  const source = tab === 'overview' ? data.reservations : data[tab];
  const query = search.value.trim().toLowerCase();
  let rows = source.filter(item => (filter.value === 'all' || item.status === filter.value) && [item.id, item.name, item.email, item.region, item.address, item.phone, item.stayId, item.memberId, item.stayNameAtBooking, item.memberNameAtBooking, memberName(item.memberId)].filter(Boolean).join(' ').toLowerCase().includes(query));
  rows = [...rows].sort((a,b) => b.createdAt - a.createdAt);
  if (tab === 'overview') {
    const metrics = document.querySelector('#metrics'); metrics.replaceChildren();
    for (const [label, count] of [['전체 회원', data.members.length], ['공개 여행지', data.destinations.filter(item => item.status === 'published').length], ['활성 숙소', data.stays.filter(item => item.status === 'active').length], ['확인할 예약', data.reservations.filter(item => ['requested','cancel_requested'].includes(item.status)).length]]) {
      const card = element('article', undefined, 'metric'); card.append(element('span', label), element('strong', `${count}`)); metrics.append(card);
    }
    const summary = document.querySelector('#booking-summary'); summary.replaceChildren();
    for (const state of ['requested','confirmed','cancel_requested','canceled','completed']) summary.append(element('span', `${statusLabels[state]} ${data.reservations.filter(item => item.status === state).length}건`, 'badge'));
    rows = rows.slice(0, 10);
  }
  if (['overview','reservations'].includes(tab)) {
    table(['예약번호', '숙소', '예약자', '일정', '금액', '상태', '관리'], rows.map(item => [item.id.slice(0,12), stayName(item), item.memberNameAtBooking || memberName(item.memberId), `${item.checkIn} → ${item.checkOut}`, money(item.totalPrice), statusLabels[item.status] || item.status, action('상세 / 처리', () => bookingInfo(item))]));
  } else if (tab === 'members') {
    table(['회원명', '이메일', '연락처', '상태', '가입일', '관리'], rows.map(item => [item.name, item.email, item.phone, statusLabels[item.status], stamp(item.createdAt), action('회원 상세', () => memberInfo(item))]));
  } else {
    table(['이름', tab === 'destinations' ? '지역' : '여행지', tab === 'destinations' ? '소개' : '1박 가격', '상태', '관리'], rows.map(item => {
      const buttons = element('div');
      buttons.append(action('상세', () => catalogInfo(item)), action('수정', () => openEditor(item)), action('삭제', () => archive(item), true));
      return [item.name, tab === 'destinations' ? item.region : destinationName(item.destinationId), tab === 'destinations' ? item.summary : money(item.pricePerNight), statusLabels[item.status], buttons];
    }));
  }
}
function setTab(next) {
  tab = next; search.value = ''; filter.replaceChildren(new Option('전체 상태','all'));
  const states = tab === 'destinations' ? ['published','draft','hidden'] : tab === 'stays' ? ['active','inactive'] : tab === 'members' ? ['active','suspended'] : ['requested','confirmed','cancel_requested','canceled','completed'];
  for (const state of states) filter.append(new Option(statusLabels[state],state));
  document.querySelectorAll('[data-tab]').forEach(button => { const active = button.dataset.tab === tab; button.classList.toggle('active',active); if (active) button.setAttribute('aria-current','page'); else button.removeAttribute('aria-current'); });
  render();
}
function field(label, name, type, value, options) {
  const wrapper = element('label', label, 'field');
  const input = element(type === 'textarea' ? 'textarea' : options ? 'select' : 'input'); input.name = name;
  if (input.tagName === 'INPUT') input.type = type;
  input.required = name !== 'imageUrl';
  if (options) for (const [key, caption] of options) input.append(new Option(caption,key));
  if (type === 'number') { input.min = 1; input.max = name === 'maxGuests' ? 50 : 10000000; input.step = 1; }
  else input.maxLength = name === 'description' ? 5000 : name === 'imageUrl' ? 2000 : name === 'address' ? 300 : name === 'summary' ? 200 : name === 'name' ? 100 : 30;
  input.value = value ?? ''; wrapper.append(input); return wrapper;
}
function openEditor(item = null) {
  editing = item;
  document.querySelector('#editor-title').textContent = `${tab === 'destinations' ? '여행지' : '숙소'} ${item ? '수정' : '등록'}`;
  document.querySelector('#editor-status').textContent = tab === 'destinations' ? '여행지를 숨기면 연결된 숙소도 비활성화됩니다. 과거 예약은 유지됩니다.' : '가격 변경은 새 예약에만 적용됩니다. 과거 예약 금액은 유지됩니다.';
  const fields = document.querySelector('#editor-fields'); fields.replaceChildren();
  fields.append(field('이름','name','text',item?.name));
  if (tab === 'destinations') fields.append(field('지역','region','text',item?.region), field('한 줄 소개','summary','text',item?.summary));
  else fields.append(field('연결 여행지','destinationId','text',item?.destinationId, data.destinations.map(item => [item.id, `${item.name} (${statusLabels[item.status]})`])));
  fields.append(field('주소','address','text',item?.address),field('상세 설명','description','textarea',item?.description),field('대표 이미지 HTTPS 주소 (선택)','imageUrl','url',item?.imageUrl));
  if (tab === 'stays') fields.append(field('문의 연락처','phone','tel',item?.phone), field('1박 가격 (원)','pricePerNight','number',item?.pricePerNight), field('최대 인원','maxGuests','number',item?.maxGuests));
  const states = tab === 'destinations' ? ['draft','published','hidden'] : ['inactive','active'];
  fields.append(field('상태','status','text',item?.status || states[0],states.map(state => [state,statusLabels[state]])));
  editor.showModal();
}
document.querySelector('#editor-form').addEventListener('submit', async event => {
  event.preventDefault();
  const form = event.currentTarget;
  if (!form.reportValidity()) return;
  const values = Object.fromEntries(new FormData(form));
  for (const key of ['pricePerNight','maxGuests']) if (key in values) values[key] = Number(values[key]);
  const submit = form.querySelector('[type="submit"]'); submit.disabled = true;
  try {
    await request('/api/admin/catalog', { method:'POST',body:{...values,kind:tab,id:editing?.id,updatedAt:editing?.updatedAt} });
    editor.close(); notify('저장되었습니다.'); await load();
  } catch (error) { document.querySelector('#editor-status').textContent = error.message; }
  finally { submit.disabled = false; }
});
async function archive(item) {
  const stayIds = tab === 'stays' ? [item.id] : data.stays.filter(stay => stay.destinationId === item.id).map(stay => stay.id);
  const count = data.reservations.filter(booking => stayIds.includes(booking.stayId)).length;
  if (!await confirmAction(`연결된 예약 ${count}건을 보존하며 ${tab === 'destinations' ? '여행지를 숨기고 연결 숙소를 비활성화' : '숙소를 비활성화'}합니다. 진행하시겠습니까?`)) return;
  try { const result = await request('/api/admin/archive',{method:'POST',body:{kind:tab,id:item.id,updatedAt:item.updatedAt}}); notify(result.message); await load(); }
  catch (error) { notify(error.message); }
}
async function load() {
  loading = true;
  document.querySelector('#admin-status').textContent = '불러오는 중…';
  try { data = await request('/api/admin/data'); document.querySelector('#admin-status').textContent = `최근 갱신: ${stamp(Date.now())} · 서버에서 권한이 확인된 실제 데이터입니다.`; }
  catch (error) {
    document.querySelector('#admin-status').textContent = error.message;
    if ([401,403].includes(error.status)) {
      data = { destinations: [], stays: [], members: [], reservations: [] };
      document.querySelector('#admin-shell').hidden = true;
      document.querySelector('#access-gate').hidden = false;
      document.querySelector('#access-status').textContent = error.message;
    }
  }
  loading = false; render();
}
document.querySelectorAll('[data-tab]').forEach(button => button.addEventListener('click',() => setTab(button.dataset.tab)));
document.querySelectorAll('[data-close]').forEach(button => button.addEventListener('click',() => document.getElementById(button.dataset.close).close()));
search.addEventListener('input',render); filter.addEventListener('change',render);
document.querySelector('#new-item').addEventListener('click',() => openEditor());
document.querySelector('#reload-data').addEventListener('click',load);
const session = await sessionReady();
if (session?.role === 'admin') {
  document.querySelector('#access-gate').hidden = true; document.querySelector('#admin-shell').hidden = false; setTab('overview'); await load();
} else document.querySelector('#access-status').textContent = '관리자 로그인이 필요합니다. 권한 확인 전에는 운영 데이터가 표시되지 않습니다.';
