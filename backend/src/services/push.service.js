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

// Push to every super-admin device that enabled notifications. Dead
// subscriptions (410/404) are pruned. Never throws — push is best-effort.
export async function pushToSuperAdmins({ title, body }) {
  try {
    const { default: User } = await import('../models/User.model.js');
    const admins = await User.find({ role: 'super_admin', isActive: true }).select('+pushSubscriptions');
    for (const admin of admins) {
      const alive = [];
      for (const sub of admin.pushSubscriptions || []) {
        try {
          await webpush.sendNotification(sub, JSON.stringify({ title, body, url: '/super-admin' }));
          alive.push(sub);
        } catch (err) {
          if (err.statusCode !== 404 && err.statusCode !== 410) alive.push(sub);
        }
      }
      if (alive.length !== (admin.pushSubscriptions || []).length) {
        admin.pushSubscriptions = alive;
        await admin.save();
      }
    }
  } catch (err) {
    console.error('[push] super-admin push failed:', err.message);
  }
}
