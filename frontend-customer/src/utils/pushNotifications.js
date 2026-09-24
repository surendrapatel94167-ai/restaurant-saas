import api from '../api/axios';

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  return Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)));
}

// Asks the guest to enable notifications so they can hear about offers later.
// Fails silently (no browser support, permission denied, no HTTPS in dev,
// etc.) — this is a nice-to-have, never blocks ordering.
export async function enablePushNotifications(tenantSlug, customerName, customerPhone) {
  try {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) return false;

    const permission = await Notification.requestPermission();
    if (permission !== 'granted') return false;

    const registration = await navigator.serviceWorker.register('/sw.js');
    await navigator.serviceWorker.ready;

    const { data } = await api.get(`/customer/${tenantSlug}/push-public-key`);
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(data.publicKey),
    });

    await api.post(`/customer/${tenantSlug}/push-subscribe`, {
      customerName, customerPhone, subscription,
    });
    return true;
  } catch (err) {
    console.warn('Push notification setup skipped:', err.message);
    return false;
  }
}
