import Table from '../../models/Table.model.js';
import Tenant from '../../models/Tenant.model.js';
import Notification from '../../models/Notification.model.js';
import * as qrcodeService from '../../services/qrcode.service.js';
import { CUSTOMER_APP_URL } from '../../config/env.js';

export async function list(req, res, next) {
  try {
    const tables = await Table.forTenant(req.tenantId).sort({ tableNumber: 1 });
    res.json(tables);
  } catch (err) { next(err); }
}

// Add a brand new table (e.g. restaurant added more seating) and print its QR.
export async function create(req, res, next) {
  try {
    const { tableNumber } = req.body;
    if (!tableNumber) return res.status(400).json({ message: 'tableNumber is required' });

    const existing = await Table.findOneForTenant(req.tenantId, { tableNumber: String(tableNumber) });
    if (existing) return res.status(400).json({ message: 'A table with this number already exists' });

    const tenant = await Tenant.findById(req.tenantId);
    const table = await Table.create({ tenantId: req.tenantId, tableNumber: String(tableNumber) });
    const { url, qrDataUrl } = await qrcodeService.generateTableQR(tenant.slug, table._id, CUSTOMER_APP_URL);
    table.qrCodeUrl = qrDataUrl;
    await table.save();

    await Notification.create({
      recipientType: 'super_admin',
      tenantId: req.tenantId,
      type: 'table_added',
      message: `${tenant.hotelName} added a new table (Table ${table.tableNumber}).`,
    });

    res.status(201).json({ ...table.toObject(), qrUrl: url });
  } catch (err) { next(err); }
}

// A QR sticker got torn/lost — reprint a fresh one for the SAME table without
// changing its number (guests' bookmarks/history stay valid either way since
// the link is keyed off the table's Mongo _id, not the printed sticker).
export async function regenerate(req, res, next) {
  try {
    const table = await Table.findOneForTenant(req.tenantId, { _id: req.params.id });
    if (!table) return res.status(404).json({ message: 'Table not found' });
    const tenant = await Tenant.findById(req.tenantId);
    const { url, qrDataUrl } = await qrcodeService.generateTableQR(tenant.slug, table._id, CUSTOMER_APP_URL);
    table.qrCodeUrl = qrDataUrl;
    await table.save();
    res.json({ ...table.toObject(), qrUrl: url });
  } catch (err) { next(err); }
}

export async function remove(req, res, next) {
  try {
    await Table.findOneAndDelete({ _id: req.params.id, tenantId: req.tenantId });
    res.status(204).send();
  } catch (err) { next(err); }
}
