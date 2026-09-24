import Coupon from '../../models/Coupon.model.js';

function randomCode() {
  return Math.random().toString(36).slice(2, 8).toUpperCase();
}

export async function list(req, res, next) {
  try {
    const coupons = await Coupon.forTenant(req.tenantId).sort({ createdAt: -1 });
    res.json(coupons);
  } catch (err) { next(err); }
}

export async function create(req, res, next) {
  try {
    const { code, discountPercentage, scope = 'all', menuItemIds = [], targetPhones = [], expiresAt } = req.body;
    if (!discountPercentage) return res.status(400).json({ message: 'discountPercentage is required' });
    if (scope === 'specific' && (!menuItemIds || menuItemIds.length === 0)) {
      return res.status(400).json({ message: 'Pick at least one dish for a dish-specific coupon' });
    }

    const finalCode = (code || randomCode()).toUpperCase().trim();
    const existing = await Coupon.findOne({ tenantId: req.tenantId, code: finalCode });
    if (existing) return res.status(400).json({ message: 'This coupon code already exists' });

    const coupon = await Coupon.create({
      tenantId: req.tenantId,
      code: finalCode,
      discountPercentage,
      scope,
      menuItemIds: scope === 'specific' ? menuItemIds : [],
      targetPhones,
      expiresAt: expiresAt || undefined,
    });
    res.status(201).json(coupon);
  } catch (err) { next(err); }
}

export async function toggleActive(req, res, next) {
  try {
    const coupon = await Coupon.findOne({ _id: req.params.id, tenantId: req.tenantId });
    if (!coupon) return res.status(404).json({ message: 'Coupon not found' });
    coupon.isActive = !coupon.isActive;
    await coupon.save();
    res.json(coupon);
  } catch (err) { next(err); }
}

export async function remove(req, res, next) {
  try {
    await Coupon.findOneAndDelete({ _id: req.params.id, tenantId: req.tenantId });
    res.status(204).send();
  } catch (err) { next(err); }
}
