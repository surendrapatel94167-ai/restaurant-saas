import MenuItem from '../../models/MenuItem.model.js';
import { emitMenuAvailabilityChange } from '../../sockets/orderEvents.js';
import { uploadIfBase64 } from '../../services/cloudinary.service.js';

export async function list(req, res, next) {
  try {
    const items = await MenuItem.forTenant(req.tenantId).sort({ category: 1 });
    res.json(items);
  } catch (err) { next(err); }
}

const MIN_PRICE_FOR_DISCOUNT = 500;

// Discounts are only allowed on dishes priced ₹500 or more.
function checkDiscountRule(body, existingPrice) {
  const price = body.price !== undefined ? Number(body.price) : Number(existingPrice);
  const wantsDiscount = body.discount?.isActive || Number(body.discount?.percentage) > 0;
  if (wantsDiscount && !(price >= MIN_PRICE_FOR_DISCOUNT)) {
    return `Discount is only available on items priced ₹${MIN_PRICE_FOR_DISCOUNT} or more`;
  }
  return '';
}

export async function create(req, res, next) {
  try {
    const discountErr = checkDiscountRule(req.body);
    if (discountErr) return res.status(400).json({ message: discountErr });
    const imageUrl = await uploadIfBase64(req.body.imageUrl, 'menu-items');
    const item = await MenuItem.create({ ...req.body, imageUrl, tenantId: req.tenantId });
    res.status(201).json(item);
  } catch (err) { next(err); }
}

export async function update(req, res, next) {
  try {
    const body = { ...req.body };
    const current = await MenuItem.findOne({ _id: req.params.id, tenantId: req.tenantId }).select('price');
    if (!current) return res.status(404).json({ message: 'Menu item not found' });
    const discountErr = checkDiscountRule(body, current.price);
    if (discountErr) return res.status(400).json({ message: discountErr });
    // Price dropped below ₹500 → any old discount is switched off.
    const finalPrice = body.price !== undefined ? Number(body.price) : current.price;
    if (finalPrice < MIN_PRICE_FOR_DISCOUNT) body.discount = { isActive: false, percentage: 0 };
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
