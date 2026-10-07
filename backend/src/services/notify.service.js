import Notification from '../models/Notification.model.js';
import { pushToSuperAdmins } from './push.service.js';

// Creates an in-app notification for the super-admin AND pushes it to their
// installed app. Use this instead of Notification.create for super_admin alerts.
export async function notifySuperAdmin({ tenantId, type, message, meta, pushTitle }) {
  const n = await Notification.create({ recipientType: 'super_admin', tenantId, type, message, meta });
  pushToSuperAdmins({ title: pushTitle || 'Restaurant SaaS', body: message });
  return n;
}
