import api from '../api/axios';

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(base64);
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)));
}

export function pushSupported() {
  return 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
}

export function pushPermission() {
  return pushSupported() ? Notification.permission : 'unsupported';
}

// Asks permission (must be called from a click), subscribes this device and
// stores the subscription on the logged-in account so the server can push to it.
export async function enablePush() {
  if (!pushSupported()) throw new Error('Push notifications are not supported on this browser/device');
  const permission = await Notification.requestPermission();
  if (permission !== 'granted') throw new Error('Notification permission was not granted');
  const reg = await navigator.serviceWorker.ready;
  const { data } = await api.get('/auth/push-public-key');
  let sub = await reg.pushManager.getSubscription();
  if (!sub) {
    sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(data.publicKey),
    });
  }
  await api.post('/auth/push-subscribe', { subscription: sub.toJSON() });
  return true;
}

// Silent re-register on later visits (permission already granted).
export async function refreshPushSubscription() {
  try {
    if (pushPermission() !== 'granted') return;
    await enablePush();
  } catch { /* best effort */ }
}
