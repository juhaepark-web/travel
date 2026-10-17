const menuToggle = document.querySelector('.menu-toggle');
const navigation = document.querySelector('#navigation');
menuToggle?.addEventListener('click', () => {
  const open = menuToggle.getAttribute('aria-expanded') !== 'true';
  menuToggle.setAttribute('aria-expanded', String(open));
  navigation.classList.toggle('open', open);
});
navigation?.addEventListener('click', (event) => {
  if (event.target.closest('a, button')) {
    menuToggle.setAttribute('aria-expanded', 'false');
    navigation.classList.remove('open');
  }
});
const detailDialog = document.querySelector('#detail-dialog');
function showDetail(title, body, extra = '') {
  document.querySelector('#detail-title').textContent = title;
  document.querySelector('#detail-body').textContent = body;
  document.querySelector('#detail-extra').textContent = extra;
  detailDialog.showModal();
}
document.querySelector('#close-dialog')?.addEventListener('click', () => detailDialog.close());
document.querySelector('#dialog-done')?.addEventListener('click', () => detailDialog.close());
document.addEventListener('click', (event) => {
  const button = event.target.closest('[data-pending]');
  if (button) showDetail('서비스 준비 안내', button.dataset.pending);
});

const backToTop = document.querySelector('#back-to-top');
if (backToTop) {
  const updateBackToTop = () => { backToTop.hidden = window.scrollY <= 0; };
  window.addEventListener('scroll', updateBackToTop, { passive: true });
  window.addEventListener('pageshow', updateBackToTop);
  backToTop.addEventListener('click', () => {
    window.scrollTo({ top: 0, behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' });
  });
  updateBackToTop();
}
