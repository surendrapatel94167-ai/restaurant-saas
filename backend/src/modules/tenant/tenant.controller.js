import Tenant from '../../models/Tenant.model.js';
import { notifySuperAdmin } from '../../services/notify.service.js';
import Notification from '../../models/Notification.model.js';
import { validatePhone } from '../../utils/validators.js';
import PlatformSettings from '../../models/PlatformSettings.model.js';
import * as paymentService from '../../services/payment.service.js';
import { uploadIfBase64 } from '../../services/cloudinary.service.js';

// Admin's own profile — logo, social links, WhatsApp number, UPI id.
// (Not slug/subscription — those stay super-admin controlled.)
export async function getMine(req, res, next) {
  try {
    const tenant = await Tenant.findById(req.tenantId);
    if (!tenant) return res.status(404).json({ message: 'Restaurant not found' });
    res.json(tenant);
  } catch (err) { next(err); }
}

export async function updateMine(req, res, next) {
  try {
    const { hotelName, logoUrl, address, settings = {} } = req.body;
    // Phone numbers shown to guests must be real 10-digit numbers.
    for (const [key, label] of [['contactPhoneDisplay', 'Contact phone'], ['whatsappBusinessNumber', 'WhatsApp number']]) {
      const err = validatePhone(settings[key], { required: false });
      if (err) return res.status(400).json({ message: `${label}: ${err}` });
    }
    if (hotelName !== undefined && String(hotelName).trim().length < 2) {
      return res.status(400).json({ message: 'Restaurant name is required' });
    }
    const update = {};
    if (hotelName !== undefined) update.hotelName = hotelName;
    if (logoUrl) update.logoUrl = await uploadIfBase64(logoUrl, 'logos');
    if (address !== undefined) update.address = address;

    Object.entries(settings).forEach(([key, value]) => {
      update[`settings.${key}`] = value;
    });

    const tenant = await Tenant.findByIdAndUpdate(req.tenantId, { $set: update }, { new: true });
    if (!tenant) return res.status(404).json({ message: 'Restaurant not found' });
    res.json(tenant);
  } catch (err) { next(err); }
}

// Billing — self-service subscription renewal (same simulated-payment pattern
// as customer checkout; swap in real Razorpay keys in payment.service.js to
// go live, same code path). Pricing and any active promo come from super-admin's
// PlatformSettings, so a special offer shows up here automatically.
export async function getBillingStatus(req, res, next) {
  try {
    const tenant = await Tenant.findById(req.tenantId);
    if (!tenant) return res.status(404).json({ message: 'Restaurant not found' });
    const platform = await PlatformSettings.getSingleton();
    const sub = tenant.subscription;
    const daysLeft = sub.endDate ? Math.ceil((new Date(sub.endDate) - new Date()) / (1000 * 60 * 60 * 24)) : null;

    const prices = { trial: 0, monthly: platform.monthlyPrice, yearly: platform.yearlyPrice };
    const offer = platform.offerActive ? {
      label: platform.offerLabel,
      monthly: platform.offerMonthlyPrice ?? platform.monthlyPrice,
      yearly: platform.offerYearlyPrice ?? platform.yearlyPrice,
    } : null;

    res.json({ subscription: sub, daysLeft, prices, offer });
  } catch (err) { next(err); }
}

export async function createRenewalPayment(req, res, next) {
  try {
    const { plan } = req.body; // 'monthly' | 'yearly'
    const tenant = await Tenant.findById(req.tenantId);
    if (!tenant) return res.status(404).json({ message: 'Restaurant not found' });
    const platform = await PlatformSettings.getSingleton();

    const chosenPlan = plan === 'yearly' ? 'yearly' : 'monthly';
    const amount = platform.offerActive
      ? (chosenPlan === 'yearly' ? platform.offerYearlyPrice ?? platform.yearlyPrice : platform.offerMonthlyPrice ?? platform.monthlyPrice)
      : (chosenPlan === 'yearly' ? platform.yearlyPrice : platform.monthlyPrice);

    const intent = await paymentService.createPaymentIntent({ _id: `sub_${tenant._id}`, totalAmount: amount });
    res.json({ ...intent, plan: chosenPlan, amount, upiId: platform.upiId });
  } catch (err) { next(err); }
}

export async function confirmRenewalPayment(req, res, next) {
  try {
    const { paymentIntentId, plan } = req.body;
    const tenant = await Tenant.findById(req.tenantId);
    if (!tenant) return res.status(404).json({ message: 'Restaurant not found' });

    const verification = await paymentService.verifyPayment();
    if (!verification.verified) return res.status(400).json({ message: 'Payment verification failed' });

    const chosenPlan = plan === 'yearly' ? 'yearly' : 'monthly';

    // Don't activate immediately — super-admin has to check the payment
    // actually landed and approve it. Until then the admin panel stays
    // locked down to just Subscription/Profile/Logout (see requireActiveSubscription).
    tenant.subscription.status = 'pending_approval';
    tenant.subscription.pendingPlan = chosenPlan;
    tenant.subscription.pendingSince = new Date();
    await tenant.save();

    await notifySuperAdmin({
      tenantId: tenant._id,
      type: 'subscription_payment_pending',
      message: `${tenant.hotelName} says they've paid for the ${chosenPlan} plan — please verify and approve.`,
      meta: { plan: chosenPlan },
      pushTitle: '💰 Subscription payment received',
    });

    res.json({ subscription: tenant.subscription });
  } catch (err) { next(err); }
}
