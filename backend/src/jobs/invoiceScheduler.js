import Order from '../models/Order.model.js';
import Tenant from '../models/Tenant.model.js';
import * as whatsappService from '../services/whatsapp.service.js';

/**
 * MVP scheduler using setTimeout — good enough for a single-server deployment.
 * If you move to multiple server instances / need durability across restarts,
 * swap this for a real queue (BullMQ + Redis, agenda, etc.) keyed on the same
 * (tenantId, orderId) idea.
 *
 * Sends the WhatsApp bill 10-20 minutes after payment is confirmed, so the
 * guest isn't pinged mid-meal. Uses the restaurant's OWN WhatsApp Business
 * number (tenant.settings.whatsappBusinessNumber) as the sender.
 */
export function scheduleInvoice(tenantId, orderId, customerPhone, delayMinutes = 15) {
  const delayMs = delayMinutes * 60 * 1000;

  setTimeout(async () => {
    try {
      const [order, tenant] = await Promise.all([
        Order.findOne({ _id: orderId, tenantId }),
        Tenant.findById(tenantId),
      ]);
      if (!order || !tenant) return;
      if (order.whatsappInvoiceSent) return; // already sent (e.g. manually)

      await whatsappService.sendInvoice(tenant, order, customerPhone);
      order.whatsappInvoiceSent = true;
      await order.save();
    } catch (err) {
      console.error('[invoiceScheduler] failed to send delayed invoice', err);
    }
  }, delayMs);
}
