import MenuItem from '../../models/MenuItem.model.js';
import { emitMenuAvailabilityChange } from '../../sockets/orderEvents.js';
import { uploadIfBase64 } from '../../services/cloudinary.service.js';

export async function list(req, res, next) {
  try {
    const items = await MenuItem.forTenant(req.tenantId).sort({ category: 1 });
    res.json(items);
  } catch (err) { next(err); }
}

export async function create(req, res, next) {
  try {
    const imageUrl = await uploadIfBase64(req.body.imageUrl, 'menu-items');
    const item = await MenuItem.create({ ...req.body, imageUrl, tenantId: req.tenantId });
    res.status(201).json(item);
  } catch (err) { next(err); }
}

export async function update(req, res, next) {
  try {
    const body = { ...req.body };
    if (body.imageUrl) body.imageUrl = await uploadIfBase64(body.imageUrl, 'menu-items');
    const item = await MenuItem.findOneAndUpdate(
      { _id: req.params.id, tenantId: req.tenantId },
      body,
      { new: true }
    );
    if (!item) return res.status(404).json({ message: 'Menu item not found' });
    res.json(item);
  } catch (err) { next(err); }
}

export async function toggleAvailability(req, res, next) {
  try {
    const item = await MenuItem.findOne({ _id: req.params.id, tenantId: req.tenantId });
    if (!item) return res.status(404).json({ message: 'Menu item not found' });
    item.isAvailable = !item.isAvailable;
    await item.save();
    emitMenuAvailabilityChange(req.tenantId, item);
    res.json(item);
  } catch (err) { next(err); }
}

export async function remove(req, res, next) {
  try {
    await MenuItem.findOneAndDelete({ _id: req.params.id, tenantId: req.tenantId });
    res.status(204).send();
  } catch (err) { next(err); }
}
