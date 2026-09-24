import mongoose from 'mongoose';
import MenuItem from '../../models/MenuItem.model.js';
import Order from '../../models/Order.model.js';
import Table from '../../models/Table.model.js';
import Review from '../../models/Review.model.js';
import Customer from '../../models/Customer.model.js';
import Coupon from '../../models/Coupon.model.js';
import * as paymentService from '../../services/payment.service.js';
import * as whatsappService from '../../services/whatsapp.service.js';
import { VAPID_PUBLIC_KEY } from '../../services/push.service.js';
import { uploadIfBase64 } from '../../services/cloudinary.service.js';
import { scheduleInvoice } from '../../jobs/invoiceScheduler.js';
import { emitNewOrder, emitOrderStatusUpdate, emitAssistanceRequest } from '../../sockets/orderEvents.js';

// A returning guest sees "this is your Nth visit" + progress toward the next
// milestone reward on the landing page.
export async function getVisits(req, res, next) {
  try {
    const { phone } = req.query;
    if (!phone) return res.status(400).json({ message: 'phone is required' });
    const customer = await Customer.findOne({ tenantId: req.tenantId, phone });
    const milestoneEvery = req.tenant?.settings?.loyalty?.milestoneEvery || 5;
    const totalOrders = customer?.totalOrders || 0;
    res.json({
      totalOrders,
      isReturning: totalOrders > 0,
      milestoneEvery,
      visitsUntilNextMilestone: totalOrders === 0 ? milestoneEvery : milestoneEvery - (totalOrders % milestoneEvery || milestoneEvery),
    });
  } catch (err) { next(err); }
}

// Finds a usable coupon for this phone+code, WITHOUT marking it used — shared
// by the live "apply coupon" preview and the real order-placement check.
async function findUsableCoupon(tenantId, code, phone) {
  if (!code) return null;
  const coupon = await Coupon.findOne({ tenantId, code: code.toUpperCase().trim(), isActive: true });
  if (!coupon) return { error: 'Invalid or inactive coupon code' };
  if (coupon.expiresAt && new Date(coupon.expiresAt) < new Date()) return { error: 'This coupon has expired' };
  if (coupon.targetPhones.length > 0 && !coupon.targetPhones.includes(phone)) {
    return { error: 'This coupon isn\u2019t available on your account' };
  }
  if (coupon.usedBy.includes(phone)) return { error: 'You\u2019ve already used this coupon' };
  return { coupon };
}

function computeCouponDiscount(coupon, orderItems, subtotal) {
  if (coupon.scope === 'all') return Math.round(subtotal * (coupon.discountPercentage / 100));
  const matchIds = new Set(coupon.menuItemIds.map((id) => id.toString()));
  const matchedTotal = orderItems
    .filter((i) => matchIds.has(i.menuItemId.toString()))
    .reduce((s, i) => s + i.priceSnapshot * i.quantity, 0);
  return Math.round(matchedTotal * (coupon.discountPercentage / 100));
}

// Live preview before placing the order — "Apply" button on checkout.
export async function validateCoupon(req, res, next) {
  try {
    const { code, phone } = req.query;
    const result = await findUsableCoupon(req.tenantId, code, phone);
    if (!result) return res.status(400).json({ message: 'code and phone are required' });
    if (result.error) return res.status(400).json({ message: result.error });
    res.json({
      valid: true,
      discountPercentage: result.coupon.discountPercentage,
      scope: result.coupon.scope,
      menuItemIds: result.coupon.menuItemIds,
    });
  } catch (err) { next(err); }
}

// So a returning guest can tap "Order again" instead of re-browsing the menu.
export async function getLastOrder(req, res, next) {
  try {
    const { phone } = req.query;
    if (!phone) return res.status(400).json({ message: 'phone is required' });
    const order = await Order.findOne({ tenantId: req.tenantId, customerPhone: phone })
      .sort({ createdAt: -1 });
    if (!order) return res.json(null);

    // Only surface items that are still on the menu and in stock, so a
    // one-tap reorder never adds something that can't actually be ordered.
    const menuItemIds = order.items.map((i) => i.menuItemId);
    const stillAvailable = await MenuItem.forTenant(req.tenantId).where({ _id: { $in: menuItemIds }, isAvailable: true });
    const availableIds = new Set(stillAvailable.map((m) => m._id.toString()));

    res.json({
      _id: order._id,
      createdAt: order.createdAt,
      items: order.items
        .filter((i) => availableIds.has(i.menuItemId.toString()))
        .map((i) => ({ menuItemId: i.menuItemId, nameSnapshot: i.nameSnapshot, quantity: i.quantity })),
    });
  } catch (err) { next(err); }
}

export async function getPushPublicKey(req, res) {
  res.json({ publicKey: VAPID_PUBLIC_KEY });
}

// Returns a returning guest's points balance + this tenant's loyalty rates,
// so the checkout screen can offer "redeem your points" before placing an order.
export async function getLoyaltyBalance(req, res, next) {
  try {
    const { phone } = req.query;
    if (!phone) return res.status(400).json({ message: 'phone is required' });
    const customer = await Customer.findOne({ tenantId: req.tenantId, phone });
    res.json({
      points: customer?.loyaltyPoints || 0,
      enabled: !!req.tenant?.settings?.loyalty?.enabled,
      redeemValue: req.tenant?.settings?.loyalty?.redeemValue || 0.5,
      earnPerRupee: req.tenant?.settings?.loyalty?.earnPerRupee || 0.1,
    });
  } catch (err) { next(err); }
}

// Guest opted in to browser notifications — remember their subscription so
// offer broadcasts reach them there too, not just WhatsApp.
export async function subscribePush(req, res, next) {
  try {
    const { customerPhone, customerName, subscription } = req.body;
    if (!customerPhone || !subscription) {
      return res.status(400).json({ message: 'customerPhone and subscription are required' });
    }
    await Customer.findOneAndUpdate(
      { tenantId: req.tenantId, phone: customerPhone },
      { $set: { name: customerName || 'Guest', pushSubscription: subscription } },
      { upsert: true }
    );
    res.status(201).json({ subscribed: true });
  } catch (err) { next(err); }
}

// What the QR-scan landing page needs: hotel name/logo + the 4 buttons (menu,
// contact, review, instagram) without exposing the full menu payload yet.
export async function getLanding(req, res, next) {
  try {
    const t = req.tenant;
    res.json({
      hotelName: t.hotelName,
      logoUrl: t.logoUrl,
      address: t.address,
      instagramUrl: t.settings.instagramUrl,
      facebookUrl: t.settings.facebookUrl,
      websiteUrl: t.settings.websiteUrl,
      contactPhone: t.settings.contactPhoneDisplay || t.contactPhone,
      upiId: t.settings.upiId,
    });
  } catch (err) { next(err); }
}

export async function getMenu(req, res, next) {
  try {
    const items = await MenuItem.forTenant(req.tenantId).where({ isAvailable: true }).sort({ category: 1 });

    const ratings = await Review.aggregate([
      { $match: { tenantId: req.tenantId, isApproved: true, menuItemId: { $ne: null } } },
      { $group: { _id: '$menuItemId', avgRating: { $avg: '$rating' }, count: { $sum: 1 } } },
    ]);
    const ratingMap = new Map(ratings.map((r) => [r._id.toString(), r]));

    const itemsWithRatings = items.map((item) => {
      const r = ratingMap.get(item._id.toString());
      return {
        ...item.toObject(),
        avgRating: r ? Math.round(r.avgRating * 10) / 10 : null,
        reviewCount: r ? r.count : 0,
      };
    });

    res.json({ tenant: { hotelName: req.tenant.hotelName, languages: req.tenant.settings.languages }, items: itemsWithRatings });
  } catch (err) { next(err); }
}

// Full detail for one dish — used by the dish detail page (image, description,
// price, and every approved review left for that dish).
export async function getMenuItemDetail(req, res, next) {
  try {
    const item = await MenuItem.findOneForTenant(req.tenantId, { _id: req.params.itemId });
    if (!item) return res.status(404).json({ message: 'Dish not found' });

    const [ratingAgg] = await Review.aggregate([
      { $match: { tenantId: req.tenantId, isApproved: true, menuItemId: item._id } },
      { $group: { _id: null, avgRating: { $avg: '$rating' }, count: { $sum: 1 } } },
    ]);
    const reviews = await Review.forTenant(req.tenantId)
      .where({ menuItemId: item._id, isApproved: true })
      .sort({ createdAt: -1 })
      .limit(20);

    res.json({
      item: {
        ...item.toObject(),
        avgRating: ratingAgg ? Math.round(ratingAgg.avgRating * 10) / 10 : null,
        reviewCount: ratingAgg ? ratingAgg.count : 0,
      },
      reviews,
    });
  } catch (err) { next(err); }
}

// Public: only approved reviews show up here.
export async function getPublicReviews(req, res, next) {
  try {
    const reviews = await Review.forTenant(req.tenantId).where({ isApproved: true }).sort({ createdAt: -1 }).limit(50);
    res.json(reviews);
  } catch (err) { next(err); }
}

// Public: guest submits a review (goes in "pending" until the admin approves it).
export async function submitReview(req, res, next) {
  try {
    const { menuItemId, dishName, orderId, tableNumber, customerName, rating, comment, photoUrl } = req.body;
    if (!rating) return res.status(400).json({ message: 'Rating is required' });

    const uploadedPhotoUrl = await uploadIfBase64(photoUrl, 'reviews');
    const review = await Review.create({
      tenantId: req.tenantId,
      menuItemId: menuItemId || undefined,
      dishNameSnapshot: dishName,
      orderId: orderId || undefined,
      tableNumber,
      customerName: customerName || 'Guest',
      rating,
      comment,
      photoUrl: uploadedPhotoUrl,
    });
    res.status(201).json(review);
  } catch (err) { next(err); }
}

export async function placeOrder(req, res, next) {
  try {
    const { tableId, items, orderType = 'dine_in', customerName, customerPhone, redeemPoints = 0, couponCode, paymentMethod = 'upi' } = req.body;
    if (!items || !items.length) {
      return res.status(400).json({ message: 'Cart is empty' });
    }
    if (!customerName || !customerPhone) {
      return res.status(400).json({ message: 'Name and phone number are required to place an order' });
    }
    if (!['upi', 'card', 'cash'].includes(paymentMethod)) {
      return res.status(400).json({ message: 'Invalid payment method' });
    }

    const menuItemIds = items.map((i) => i.menuItemId);
    const dbItems = await MenuItem.forTenant(req.tenantId).where({ _id: { $in: menuItemIds } });
    const dbItemMap = new Map(dbItems.map((d) => [d._id.toString(), d]));

    let subtotal = 0;
    const orderItems = items.map((i) => {
      const dbItem = dbItemMap.get(i.menuItemId);
      if (!dbItem || !dbItem.isAvailable) {
        throw Object.assign(new Error(`Item unavailable: ${i.menuItemId}`), { statusCode: 400 });
      }
      const lineTotal = dbItem.price * i.quantity;
      subtotal += lineTotal;
      return {
        menuItemId: dbItem._id,
        nameSnapshot: dbItem.name.get('en') || dbItem.name.values().next().value,
        priceSnapshot: dbItem.price,
        quantity: i.quantity,
        specialInstructions: i.specialInstructions || '',
      };
    });

    const tax = Math.round(subtotal * 0.05);

    // Coupon — validated fresh here too (never trust a client-computed discount).
    let couponDiscount = 0;
    let appliedCoupon = null;
    if (couponCode) {
      const result = await findUsableCoupon(req.tenantId, couponCode, customerPhone);
      if (result?.error) return res.status(400).json({ message: result.error });
      if (result?.coupon) {
        appliedCoupon = result.coupon;
        couponDiscount = computeCouponDiscount(appliedCoupon, orderItems, subtotal);
      }
    }

    // Loyalty redemption — capped at the customer's balance and at what's left after the coupon.
    let loyaltyDiscount = 0;
    let pointsRedeemed = 0;
    const remainingAfterCoupon = Math.max(0, subtotal + tax - couponDiscount);
    if (redeemPoints > 0 && req.tenant?.settings?.loyalty?.enabled) {
      const customer = await Customer.findOne({ tenantId: req.tenantId, phone: customerPhone });
      const available = customer?.loyaltyPoints || 0;
      pointsRedeemed = Math.min(redeemPoints, available);
      const redeemValue = req.tenant.settings.loyalty.redeemValue || 0.5;
      loyaltyDiscount = Math.min(Math.round(pointsRedeemed * redeemValue), remainingAfterCoupon);
      // Recompute points actually usable if capped by remaining order value
      if (loyaltyDiscount < Math.round(pointsRedeemed * redeemValue)) {
        pointsRedeemed = Math.floor(loyaltyDiscount / redeemValue);
      }
    }
    const totalAmount = Math.max(0, subtotal + tax - couponDiscount - loyaltyDiscount);

    let tableNumber;
    // "no-table" (or any other non-ObjectId value) means the guest didn't
    // scan a specific table QR — treat as a tableless/counter order instead
    // of crashing on an invalid ObjectId lookup.
    const validTableId = tableId && mongoose.isValidObjectId(tableId) ? tableId : undefined;
    if (validTableId) {
      const table = await Table.findOneForTenant(req.tenantId, { _id: validTableId });
      tableNumber = table ? table.tableNumber : undefined;
    }

    const order = await Order.create({
      tenantId: req.tenantId,
      tableId: validTableId,
      tableNumber,
      orderType,
      customerName,
      customerPhone,
      items: orderItems,
      status: 'WAITING_FOR_CONFIRMATION',
      subtotal,
      tax,
      loyaltyDiscount,
      pointsRedeemed,
      couponCode: appliedCoupon?.code,
      couponDiscount,
      totalAmount,
      payment: { method: paymentMethod, status: 'PENDING' },
    });

    if (appliedCoupon) {
      appliedCoupon.usedBy.push(customerPhone);
      await appliedCoupon.save();
    }

    // Remember this guest so the restaurant can message them about future offers,
    // and deduct any points redeemed right away (prevents double-spending them).
    const customerUpdate = { $set: { name: customerName, lastOrderAt: new Date() }, $inc: { totalOrders: 1 } };
    if (pointsRedeemed > 0) customerUpdate.$inc.loyaltyPoints = -pointsRedeemed;
    const updatedCustomer = await Customer.findOneAndUpdate(
      { tenantId: req.tenantId, phone: customerPhone },
      customerUpdate,
      { upsert: true, new: true }
    );

    // Every Nth visit (default 5th), auto-issue a personal reward coupon.
    const milestoneEvery = req.tenant?.settings?.loyalty?.milestoneEvery || 5;
    if (req.tenant?.settings?.loyalty?.enabled && updatedCustomer.totalOrders % milestoneEvery === 0) {
      const discountPercentage = req.tenant.settings.loyalty.milestoneDiscountPercentage || 10;
      const rewardCode = `VISIT${updatedCustomer.totalOrders}${Math.random().toString(36).slice(2, 5).toUpperCase()}`;
      await Coupon.create({
        tenantId: req.tenantId,
        code: rewardCode,
        discountPercentage,
        scope: 'all',
        targetPhones: [customerPhone],
        isAutoGenerated: true,
      });
      whatsappService.sendMessage(
        req.tenant,
        customerPhone,
        `🎉 You've visited us ${updatedCustomer.totalOrders} times! Here's ${discountPercentage}% off your next order — use code ${rewardCode}. Thank you for being a regular!`
      ).catch(() => {});
    }

    emitNewOrder(req.tenantId, order);
    res.status(201).json(order);
  } catch (err) { next(err); }
}

export async function createPayment(req, res, next) {
  try {
    const order = await Order.findOneForTenant(req.tenantId, { _id: req.params.orderId });
    if (!order) return res.status(404).json({ message: 'Order not found' });
    const intent = await paymentService.createPaymentIntent(order);
    res.json(intent);
  } catch (err) { next(err); }
}

export async function confirmPayment(req, res, next) {
  try {
    const { paymentIntentId, method, customerPhone } = req.body;
    const order = await Order.findOneForTenant(req.tenantId, { _id: req.params.orderId });
    if (!order) return res.status(404).json({ message: 'Order not found' });

    const verification = await paymentService.verifyPayment();
    if (!verification.verified) {
      return res.status(400).json({ message: 'Payment verification failed' });
    }

    // Payment status is independent of order status — confirming payment
    // does NOT move the order past WAITING_FOR_CONFIRMATION. The restaurant
    // still has to explicitly confirm the order with a prep time.
    order.payment.status = 'PAID';
    order.payment.transactionId = verification.transactionId;
    order.payment.paidAt = new Date();
    if (method) order.payment.method = method;
    if (customerPhone) order.customerPhone = customerPhone;

    // Earn loyalty points on the amount actually paid (post-discount).
    if (req.tenant?.settings?.loyalty?.enabled) {
      const earnRate = req.tenant.settings.loyalty.earnPerRupee || 0.1;
      order.pointsEarned = Math.floor(order.totalAmount * earnRate);
      if (order.pointsEarned > 0 && order.customerPhone) {
        await Customer.findOneAndUpdate(
          { tenantId: req.tenantId, phone: order.customerPhone },
          { $inc: { loyaltyPoints: order.pointsEarned } }
        );
      }
    }
    await order.save();

    // Bill goes out on WhatsApp 10-20 min after payment (not mid-meal), from
    // the restaurant's own WhatsApp Business number — see jobs/invoiceScheduler.js.
    scheduleInvoice(req.tenantId, order._id, order.customerPhone, 15);

    emitOrderStatusUpdate(req.tenantId, order);
    res.json(order);
  } catch (err) { next(err); }
}

export async function trackOrder(req, res, next) {
  try {
    const order = await Order.findOneForTenant(req.tenantId, { _id: req.params.orderId });
    if (!order) return res.status(404).json({ message: 'Order not found' });
    res.json(order);
  } catch (err) { next(err); }
}

export async function requestAssistance(req, res, next) {
  try {
    const { type } = req.body;
    const order = await Order.findOneForTenant(req.tenantId, { _id: req.params.orderId });
    if (!order) return res.status(404).json({ message: 'Order not found' });

    order.assistanceRequests.push({ type });
    await order.save();
    emitAssistanceRequest(req.tenantId, order, type);
    res.status(201).json({ message: 'Request sent' });
  } catch (err) { next(err); }
}
