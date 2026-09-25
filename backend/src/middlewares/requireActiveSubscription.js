import Tenant from '../models/Tenant.model.js';

// Applied only to routers that are already gated to hotel_admin/manager.
// Staff (chef/waiter/cashier), super_admin, and public customer routes never
// hit this — only the restaurant's own admin/manager business pages do.
export default async function requireActiveSubscription(req, res, next) {
  try {
    const tenant = await Tenant.findById(req.tenantId).select('subscription');
    if (!tenant) return res.status(404).json({ message: 'Restaurant not found' });

    if (tenant.subscription.status !== 'active') {
      return res.status(403).json({
        message: tenant.subscription.status === 'pending_approval'
          ? 'Your payment is awaiting super-admin approval — this section will unlock once approved.'
          : 'Your subscription is inactive. Please subscribe to continue.',
        subscriptionStatus: tenant.subscription.status,
      });
    }
    next();
  } catch (err) { next(err); }
}
