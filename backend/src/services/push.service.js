import webpush from 'web-push';
import { VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT } from '../config/env.js';

webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);

// Sends a browser push notification. Subscriptions expire/become invalid
// often (browser closed for good, permission revoked) — callers should treat
// failures as non-fatal and just skip that customer.
export async function sendPush(subscription, { title, body }) {
  try {
    await webpush.sendNotification(subscription, JSON.stringify({ title, body }));
    return true;
  } catch (err) {
    return false;
  }
}

export { VAPID_PUBLIC_KEY };
