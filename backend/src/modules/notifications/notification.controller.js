import Notification from '../../models/Notification.model.js';

// Hotel admin/manager: notifications for their own restaurant (subscription reminders etc.)
export async function listMine(req, res, next) {
  try {
    const notifications = await Notification.find({ recipientType: 'tenant_admin', tenantId: req.tenantId })
      .sort({ createdAt: -1 })
      .limit(50);
    res.json(notifications);
  } catch (err) { next(err); }
}

// Super-admin: platform-wide notifications (which tenants are about to expire etc.)
export async function listForSuperAdmin(req, res, next) {
  try {
    const notifications = await Notification.find({ recipientType: 'super_admin' })
      .populate('tenantId', 'hotelName slug')
      .sort({ createdAt: -1 })
      .limit(100);
    res.json(notifications);
  } catch (err) { next(err); }
}

export async function markRead(req, res, next) {
  try {
    const notification = await Notification.findByIdAndUpdate(req.params.id, { isRead: true }, { new: true });
    if (!notification) return res.status(404).json({ message: 'Notification not found' });
    res.json(notification);
  } catch (err) { next(err); }
}

// Called when the bell dropdown is opened — "seen once, clears itself".
export async function markAllRead(req, res, next) {
  try {
    const filter = req.user.role === 'super_admin'
      ? { recipientType: 'super_admin' }
      : { recipientType: 'tenant_admin', tenantId: req.tenantId };
    await Notification.updateMany({ ...filter, isRead: false }, { isRead: true });
    res.json({ ok: true });
  } catch (err) { next(err); }
}

export async function remove(req, res, next) {
  try {
    const filter = req.user.role === 'super_admin'
      ? { _id: req.params.id, recipientType: 'super_admin' }
      : { _id: req.params.id, recipientType: 'tenant_admin', tenantId: req.tenantId };
    const notification = await Notification.findOneAndDelete(filter);
    if (!notification) return res.status(404).json({ message: 'Notification not found' });
    res.status(204).send();
  } catch (err) { next(err); }
}

export async function clearAll(req, res, next) {
  try {
    const filter = req.user.role === 'super_admin'
      ? { recipientType: 'super_admin' }
      : { recipientType: 'tenant_admin', tenantId: req.tenantId };
    await Notification.deleteMany(filter);
    res.status(204).send();
  } catch (err) { next(err); }
}
