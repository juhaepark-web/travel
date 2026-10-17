// Accessible in-page popups keep authentication redirects behind confirmation.
function popup(message, confirmMode) {
  return new Promise(resolve => {
    const dialog = document.createElement('dialog');
    dialog.className = 'message-popup';
    const labelId = `popup-${crypto.randomUUID()}`;
    dialog.setAttribute('aria-labelledby', labelId);
    const title = document.createElement('h2'); title.textContent = confirmMode ? '확인' : '알림';
    const body = document.createElement('p'); body.id = labelId; body.textContent = message;
    const actions = document.createElement('div'); actions.className = 'booking-actions';
    const done = document.createElement('button'); done.className = 'primary'; done.textContent = '확인'; done.type = 'button';
    done.addEventListener('click', () => dialog.close('yes'));
    if (confirmMode) {
      const cancel = document.createElement('button'); cancel.className = 'secondary'; cancel.textContent = '취소'; cancel.type = 'button';
      cancel.addEventListener('click', () => dialog.close('no')); actions.append(cancel);
    }
    actions.append(done); dialog.append(title, body, actions); document.body.append(dialog);
    dialog.addEventListener('close', () => { const accepted = dialog.returnValue === 'yes'; dialog.remove(); resolve(accepted); }, { once: true });
    dialog.showModal(); done.focus();
  });
}
export const notify = message => popup(message, false);
export const confirmAction = message => popup(message, true);
