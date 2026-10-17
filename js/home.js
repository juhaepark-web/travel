import { request, element, money } from './api.js';
import { demoDestinations, demoStays } from './demo-data.js';
import { sessionReady, getSession, notify } from './session.js';
let destinations = [], stays = [], demo = false;
const grid = document.querySelector('#destination-grid');
const keyword = document.querySelector('#keyword');
const region = document.querySelector('#region');
const photoUrl = id => `https://images.unsplash.com/${id}?auto=format&fit=crop&w=700&q=80`;
function image(url, alt) {
  const photo = element('img'); photo.alt = alt; photo.loading = 'lazy';
  try { if (new URL(url).protocol === 'https:') photo.src = url; } catch { /* CSS background provides the fallback. */ }
  photo.addEventListener('error', () => { photo.removeAttribute('src'); photo.alt = '이미지 준비 중'; });
  return photo;
}
function show(title, body, extra) { window.showDetail(title, body, extra); }
function renderDestinations() {
  const query = keyword.value.trim().toLocaleLowerCase();
  const visible = destinations.filter(item => (region.value === 'all' || item.region === region.value) && `${item.name} ${item.region} ${item.summary} ${item.tag || ''}`.toLocaleLowerCase().includes(query));
  grid.replaceChildren();
  for (const item of visible) {
    const button = element('button', undefined, 'destination-card');
    button.setAttribute('aria-label', `${item.name} 여행지 소개 보기`);
    const photo = element('div', undefined, 'photo');
    const copy = element('div', undefined, 'photo-copy');
    copy.append(element('small', item.english || item.region), element('h3', item.name), element('p', item.summary));
    photo.append(image(item.imageUrl || photoUrl(item.image), `${item.name}${demo ? ' 분위기 참고 사진' : ' 대표 사진'}`), element('span', '↗', 'photo-arrow'), copy);
    const caption = element('div', undefined, 'card-caption');
    caption.append(element('span', item.tag || item.region), element('span', '여행지 소개 ↗')); button.append(photo, caption);
    button.addEventListener('click', () => {
      const nearby = stays.filter(stay => stay.destinationId === item.id);
      show(`${item.name} 여행 소개`, item.description, `${item.address || ''}\n${nearby.length ? `주변 숙소: ${nearby.map(stay => stay.name).join(', ')}` : '등록된 주변 숙소가 없습니다.'}${demo ? '\n예시 데이터이며 사진은 분위기 참고용입니다.' : '\n아래 주변 숙소 영역에서 예약 신청할 수 있습니다.'}`);
    });
    grid.append(button);
  }
  document.querySelector('#empty').hidden = visible.length !== 0;
  document.querySelector('#search-status').textContent = `${demo ? '예시 ' : ''}여행지 ${visible.length}곳이 표시됩니다.`;
  document.querySelectorAll('[data-region]').forEach(button => {
    const active = button.dataset.region === region.value;
    button.classList.toggle('active', active); button.setAttribute('aria-pressed', String(active));
  });
}
function renderStays() {
  const container = document.querySelector('#stay-grid'); container.replaceChildren();
  for (const stay of stays) {
    const button = element('button', undefined, 'stay-card');
    const photo = element('div', undefined, 'stay-photo');
    photo.append(image(stay.imageUrl || photoUrl(stay.image), `${stay.name}${demo ? ' 분위기 참고 사진' : ' 대표 사진'}`));
    const location = stay.location || destinations.find(item => item.id === stay.destinationId)?.name || '';
    button.append(photo, element('span', `${location}${demo ? ' · 예시' : ''}`, 'stay-location'), element('h3', stay.name), element('p', stay.summary || stay.description));
    const price = element('div', undefined, 'stay-price');
    price.append(element('strong', `${money(stay.pricePerNight || stay.price)} / 1박${demo ? ' 예시' : ''}`), element('span', demo ? '소개 보기 ↗' : '예약 신청 ↗'));
    button.append(price);
    button.addEventListener('click', async () => {
      if (demo) { show(stay.name, '화면 확인용 가상 숙소입니다. 실제 예약은 제공하지 않습니다.', `1박 예시 ${money(stay.price)}. 사진은 분위기 참고용입니다.`); return; }
      await sessionReady();
      const session = getSession();
      if (!session) { notify('로그인후 예약하시오'); return; }
      locationAssign(session.role === 'admin' ? '/html/admin.html' : `/html/booking.html?stay=${encodeURIComponent(stay.id)}`);
    });
    container.append(button);
  }
  if (!stays.length) container.append(element('p', '등록된 주변 숙소가 없습니다.', 'notice'));
}
function locationAssign(url) { window.location.href = url; }
function configureRegions() {
  const regions = [...new Set(destinations.map(item => item.region))];
  region.replaceChildren(new Option('전국 어디든', 'all'));
  for (const name of regions) region.append(new Option(name, name));
  const filters = document.querySelector('.filters');
  filters.querySelectorAll('[data-region]').forEach(button => button.remove());
  for (const name of ['all', ...regions]) {
    const button = element('button', name === 'all' ? '전체' : name); button.dataset.region = name;
    filters.insertBefore(button, document.querySelector('#reset-search'));
  }
}
document.querySelector('#search-form').addEventListener('submit', event => {
  event.preventDefault(); renderDestinations(); document.querySelector('#destinations').scrollIntoView();
});
document.querySelector('.filters').addEventListener('click', event => {
  const filter = event.target.closest('[data-region]');
  if (filter) { region.value = filter.dataset.region; renderDestinations(); }
});
document.querySelector('#reset-search').addEventListener('click', () => { keyword.value = ''; region.value = 'all'; renderDestinations(); });
try {
  const data = await request('/api/catalog', { authenticated: false });
  destinations = data.destinations; stays = data.stays;
  document.querySelector('.demo-note').textContent = '실제 등록된 여행지와 숙소입니다. 예약 신청 후 관리자 확인을 거쳐 확정됩니다.';
  document.querySelector('.price-note').textContent = '1박 기준 표시 가격입니다. 예약 신청 시 서버에서 금액을 검증합니다. 날짜별 실시간 객실 재고는 보장하지 않습니다.';
} catch (error) {
  demo = true; destinations = demoDestinations; stays = demoStays;
  document.querySelector('.demo-note').textContent = `연결 안내: ${error.message} 현재는 예시 데이터이며 실제 예약할 수 없습니다.`;
}
configureRegions(); renderDestinations(); renderStays();
