import Customer from '../../models/Customer.model.js';
import Tenant from '../../models/Tenant.model.js';
import * as whatsappService from '../../services/whatsapp.service.js';
import * as pushService from '../../services/push.service.js';

export async function list(req, res, next) {
  try {
    const customers = await Customer.forTenant(req.tenantId).sort({ lastOrderAt: -1 });
    res.json(customers);
  } catch (err) { next(err); }
}

// Send an offer/announcement to every saved customer (or a hand-picked few)
// — on WhatsApp, and as a browser push notification for anyone who enabled it.
export async function broadcast(req, res, next) {
  try {
    const { message, customerIds } = req.body;
    if (!message) return res.status(400).json({ message: 'message is required' });

    const filter = customerIds?.length ? { _id: { $in: customerIds } } : {};
    const targets = await Customer.forTenant(req.tenantId).where(filter);
    const tenant = await Tenant.findById(req.tenantId);

    let pushSent = 0;
    await Promise.all(targets.map(async (c) => {
      await whatsappService.sendMessage(tenant, c.phone, message);
      if (c.pushSubscription?.endpoint) {
        const ok = await pushService.sendPush(c.pushSubscription, { title: tenant.hotelName, body: message });
        if (ok) pushSent += 1;
      }
    }));

    res.status(201).json({ sent: targets.length, pushSent });
  } catch (err) { next(err); }
}
