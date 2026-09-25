import Order from '../../models/Order.model.js';
import Customer from '../../models/Customer.model.js';
import Tenant from '../../models/Tenant.model.js';
import { emitOrderStatusUpdate } from '../../sockets/orderEvents.js';
import { scheduleInvoice } from '../../jobs/invoiceScheduler.js';

export async function list(req, res, next) {
  try {
    const { status, paymentStatus } = req.query;
    const filter = {};
    if (status) filter.status = status;
    if (paymentStatus) filter['payment.status'] = paymentStatus;
    const orders = await Order.forTenant(req.tenantId).where(filter).sort({ createdAt: -1 });
    res.json(orders);
  } catch (err) { next(err); }
}

export async function getOne(req, res, next) {
  try {
    const order = await Order.findOneForTenant(req.tenantId, { _id: req.params.id });
    if (!order) return res.status(404).json({ message: 'Order not found' });
    res.json(order);
  } catch (err) { next(err); }
}

// The ONLY action available on a WAITING_FOR_CONFIRMATION order — there is no
// reject. Admin/manager pick a prep time and the order moves to CONFIRMED.
export async function confirmOrder(req, res, next) {
  try {
    const { preparationTime } = req.body;
    if (!preparationTime || preparationTime <= 0) {
      return res.status(400).json({ message: 'preparationTime (minutes) is required' });
    }
    const order = await Order.findOneForTenant(req.tenantId, { _id: req.params.id });
    if (!order) return res.status(404).json({ message: 'Order not found' });
    if (order.status !== 'WAITING_FOR_CONFIRMATION') {
      return res.status(400).json({ message: `Order is already ${order.status}` });
    }

    order.status = 'CONFIRMED';
    order.preparationTime = preparationTime;
    order.confirmedBy = req.user.userId;
    order.confirmedAt = new Date();
    await order.save();

    emitOrderStatusUpdate(req.tenantId, order);
    res.json(order);
  } catch (err) { next(err); }
}

// For cash/card orders — admin/manager marks payment received at the counter.
// Independent of order status; can happen before or after confirmation.
export async function markPaymentPaid(req, res, next) {
  try {
    const order = await Order.findOneForTenant(req.tenantId, { _id: req.params.id });
    if (!order) return res.status(404).json({ message: 'Order not found' });
    if (order.payment.status === 'PAID') return res.json(order);

    order.payment.status = 'PAID';
    order.payment.paidAt = new Date();

    const tenant = await Tenant.findById(req.tenantId);
    if (tenant?.settings?.loyalty?.enabled) {
      const earnRate = tenant.settings.loyalty.earnPerRupee || 0.1;
      order.pointsEarned = Math.floor(order.totalAmount * earnRate);
      if (order.pointsEarned > 0 && order.customerPhone) {
        await Customer.findOneAndUpdate(
          { tenantId: req.tenantId, phone: order.customerPhone },
          { $inc: { loyaltyPoints: order.pointsEarned } }
        );
      }
    }
    await order.save();

    scheduleInvoice(req.tenantId, order._id, order.customerPhone, 15);
    emitOrderStatusUpdate(req.tenantId, order);
    res.json(order);
  } catch (err) { next(err); }
}

export async function resolveAssistance(req, res, next) {
  try {
    const order = await Order.findOneForTenant(req.tenantId, { _id: req.params.id });
    if (!order) return res.status(404).json({ message: 'Order not found' });
    const r = order.assistanceRequests.id(req.params.requestId);
    if (r) r.resolved = true;
    await order.save();
    res.json(order);
  } catch (err) { next(err); }
}
