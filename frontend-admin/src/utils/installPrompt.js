let deferredEvent = null;
let alreadyInstalled = false;
const listeners = new Set();

if (typeof window !== 'undefined') {
  alreadyInstalled = window.matchMedia?.('(display-mode: standalone)').matches || window.navigator.standalone === true;

  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredEvent = e;
    listeners.forEach((cb) => cb(e));
  });

  window.addEventListener('appinstalled', () => {
    alreadyInstalled = true;
    deferredEvent = null;
    listeners.forEach((cb) => cb(null));
  });
}

export function getInstallPrompt() {
  return alreadyInstalled ? null : deferredEvent;
}

export function isInstalled() {
  return alreadyInstalled;
}

export function onInstallPromptChange(callback) {
  listeners.add(callback);
  if (deferredEvent) callback(deferredEvent);
  return () => listeners.delete(callback);
}

export async function triggerInstall() {
  if (!deferredEvent) return false;
  deferredEvent.prompt();
  const { outcome } = await deferredEvent.userChoice;
  deferredEvent = null;
  return outcome === 'accepted';
}
