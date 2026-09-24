import Tenant from '../models/Tenant.model.js';
import Notification from '../models/Notification.model.js';

const CHECK_INTERVAL_MS = 6 * 60 * 60 * 1000; // every 6 hours is plenty for a "5 days before" warning
const WARNING_WINDOW_DAYS = 5;

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

export function startSubscriptionReminderJob() {
  checkExpiringSubscriptions(); // run once at boot too
  setInterval(checkExpiringSubscriptions, CHECK_INTERVAL_MS);
}
