import Order from '../../models/Order.model.js';
import { emitOrderStatusUpdate } from '../../sockets/orderEvents.js';

// WAITING_FOR_CONFIRMATION -> CONFIRMED happens only via orders.controller's
// confirmOrder (requires a prep time, no reject). From here on the kitchen
// just progresses the order forward, one step at a time.
const VALID_TRANSITIONS = {
  CONFIRMED: ['PREPARING'],
  PREPARING: ['READY'],
  READY: ['COMPLETED'],
};

export async function updateStatus(req, res, next) {
  try {
    const { status } = req.body;
    const order = await Order.findOneForTenant(req.tenantId, { _id: req.params.id });
    if (!order) return res.status(404).json({ message: 'Order not found' });

    const allowed = VALID_TRANSITIONS[order.status] || [];
    if (!allowed.includes(status)) {
      return res.status(400).json({ message: `Cannot move order from ${order.status} to ${status}` });
    }

    order.status = status;
    await order.save();
    emitOrderStatusUpdate(req.tenantId, order);
    res.json(order);
  } catch (err) { next(err); }
}
