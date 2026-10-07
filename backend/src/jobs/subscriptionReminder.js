import Tenant from '../models/Tenant.model.js';
import Notification from '../models/Notification.model.js';
import { notifySuperAdmin } from '../services/notify.service.js';

const CHECK_INTERVAL_MS = 6 * 60 * 60 * 1000; // every 6 hours is plenty for a "5 days before" warning
const WARNING_WINDOW_DAYS = 5;

// Trial/subscription ran out and nothing renewed it in time — lock the panel
// back down (requireActiveSubscription checks subscription.status==='active').
async function expireOverdueSubscriptions() {
  try {
    const now = new Date();
    const overdue = await Tenant.find({
      'subscription.status': 'active',
      'subscription.endDate': { $lt: now },
    });

    for (const tenant of overdue) {
      tenant.subscription.status = 'expired';
      await tenant.save();

      await Notification.create({
        recipientType: 'tenant_admin',
        tenantId: tenant._id,
        type: 'subscription_expired',
        message: `Your ${tenant.subscription.plan} plan has ended. Please subscribe to keep using the admin panel.`,
      });
      await notifySuperAdmin({
        tenantId: tenant._id,
        type: 'subscription_expired',
        message: `${tenant.hotelName} (${tenant.slug})'s subscription just expired.`,
        pushTitle: 'Subscription expired',
      });
    }
  } catch (err) {
    console.error('[subscriptionReminder] expiry check failed', err);
  }
}

async function checkExpiringSubscriptions() {
  try {
    const now = new Date();
    const windowEnd = new Date(now.getTime() + WARNING_WINDOW_DAYS * 24 * 60 * 60 * 1000);

    const expiringTenants = await Tenant.find({
      isActive: true,
      'subscription.status': 'active',
      'subscription.endDate': { $gte: now, $lte: windowEnd },
    });

    for (const tenant of expiringTenants) {
      const daysLeft = Math.ceil((tenant.subscription.endDate - now) / (24 * 60 * 60 * 1000));

      // Don't spam — only create a fresh reminder once every 24h per tenant.
      const since = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      const alreadyNotified = await Notification.findOne({
        tenantId: tenant._id,
        type: 'subscription_expiry',
        createdAt: { $gte: since },
      });
      if (alreadyNotified) continue;

      await Notification.create({
        recipientType: 'tenant_admin',
        tenantId: tenant._id,
        type: 'subscription_expiry',
        message: `Your ${tenant.subscription.plan} plan ends in ${daysLeft} day${daysLeft === 1 ? '' : 's'} (${tenant.subscription.endDate.toDateString()}). Renew to avoid interruption.`,
      });

      await Notification.create({
        recipientType: 'super_admin',
        tenantId: tenant._id,
        type: 'subscription_expiry',
        message: `${tenant.hotelName} (${tenant.slug}) subscription ends in ${daysLeft} day${daysLeft === 1 ? '' : 's'} — consider reaching out.`,
      });
    }
  } catch (err) {
    console.error('[subscriptionReminder] check failed', err);
  }
}

async function runChecks() {
  await expireOverdueSubscriptions();
  await checkExpiringSubscriptions();
}

export function startSubscriptionReminderJob() {
  runChecks(); // run once at boot too
  setInterval(runChecks, CHECK_INTERVAL_MS);
}
