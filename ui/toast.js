// ui/toast.js

const TOAST_CSS = `
:host {
  position: fixed;
  bottom: 24px;
  right: 24px;
  z-index: 2147483647;
  font-family: system-ui, -apple-system, sans-serif;
  pointer-events: none;
}
.tw-toast-card {
  pointer-events: auto;
  background: rgba(26, 26, 36, 0.94);
  backdrop-filter: blur(16px);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 14px;
  padding: 20px 24px;
  width: 300px;
  color: #e8e8ed;
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.35);
  animation: tw-slide-in 0.35s cubic-bezier(0.16, 1, 0.3, 1);
  transition: transform 0.3s ease, opacity 0.3s ease;
}
.tw-toast-card.tw-toast-exit {
  transform: translateX(120%);
  opacity: 0;
}
.tw-toast-question {
  margin: 0 0 16px 0;
  font-size: 14px;
  line-height: 1.5;
  color: rgba(255, 255, 255, 0.9);
}
.tw-toast-buttons {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.tw-toast-buttons button {
  all: unset;
  padding: 10px 14px;
  border-radius: 10px;
  font-size: 13px;
  font-weight: 500;
  text-align: center;
  cursor: pointer;
  background: rgba(255, 255, 255, 0.05);
  color: #d0d0d8;
  transition: background 0.15s;
}
.tw-toast-buttons button:hover {
  background: rgba(255, 255, 255, 0.12);
  color: #fff;
}
@keyframes tw-slide-in {
  from { transform: translateX(120%); opacity: 0; }
  to { transform: translateX(0); opacity: 1; }
}
`;

chrome.runtime.onMessage.addListener((message) => {
  if (message.action === 'showToast') {
    showToast(message.idleDuration);
  }
});

function showToast(idleDuration) {
  if (document.getElementById('timewise-toast-host')) return;

  const host = document.createElement('div');
  host.id = 'timewise-toast-host';
  document.body.appendChild(host);

  const shadow = host.attachShadow({ mode: 'open' });

  const style = document.createElement('style');
  style.textContent = TOAST_CSS;
  shadow.appendChild(style);

  const minutes = Math.floor(idleDuration / 60);
  const questionText = chrome.i18n.getMessage('toast_question', [String(minutes)]);
  const meetingText = chrome.i18n.getMessage('tag_meeting');
  const desktopText = chrome.i18n.getMessage('tag_desktop_focus');
  const afkText = chrome.i18n.getMessage('tag_afk');

  const card = document.createElement('div');
  card.className = 'tw-toast-card';
  card.innerHTML = `
    <p class="tw-toast-question">${questionText}</p>
    <div class="tw-toast-buttons">
      <button data-tag="meeting">${meetingText}</button>
      <button data-tag="desktop_focus">${desktopText}</button>
      <button data-tag="afk">${afkText}</button>
    </div>
  `;
  shadow.appendChild(card);

  setupDismissFlow(host, card, shadow, idleDuration);
}

function setupDismissFlow(host, card, shadow, idleDuration) {
  let dismissed = false;

  const triggerExit = () => {
    if (dismissed) return;
    dismissed = true;
    card.classList.add('tw-toast-exit');
    setTimeout(() => {
      if (host.parentNode) host.remove();
    }, 400);
  };

  const autoTimer = setTimeout(triggerExit, 8000);

  setTimeout(() => {
    const hostCheck = document.getElementById('timewise-toast-host');
    if (!hostCheck) return;

    const handleUserAction = (e) => {
      // In Shadow DOM, e.target is retargeted to the host when the
      // listener is on document, so Node.contains() is always false.
      // Use composedPath() instead to detect clicks inside the card.
      if (e.type === 'mousedown' && e.composedPath().includes(card)) return;
      triggerExit();
      clearAndCleanup();
    };

    document.addEventListener('scroll', handleUserAction, { once: true, passive: true });
    document.addEventListener('keydown', handleUserAction, { once: true });
    document.addEventListener('mousedown', handleUserAction);

    function clearAndCleanup() {
      clearTimeout(autoTimer);
      document.removeEventListener('scroll', handleUserAction);
      document.removeEventListener('keydown', handleUserAction);
      document.removeEventListener('mousedown', handleUserAction);
    }
  }, 3000);

  const buttons = card.querySelectorAll('button[data-tag]');
  buttons.forEach(btn => {
    btn.addEventListener('click', () => {
      chrome.runtime.sendMessage({
        action: 'offlineCompensation',
        tag: btn.dataset.tag,
        idleDuration: idleDuration
      });
      clearTimeout(autoTimer);
      triggerExit();
    });
  });
}
