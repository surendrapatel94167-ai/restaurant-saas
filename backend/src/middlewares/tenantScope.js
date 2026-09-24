import Tenant from '../models/Tenant.model.js';

export default async function tenantScope(req, res, next) {
  try {
    const { tenantSlug } = req.params;
    if (!tenantSlug) {
      return res.status(400).json({ message: 'Tenant not specified' });
    }

    const tenant = await Tenant.findOne({ slug: tenantSlug, isActive: true });
    if (!tenant) {
      return res.status(404).json({ message: 'Restaurant not found or inactive' });
    }

    req.tenantId = tenant._id;
    req.tenant = tenant;
    next();
  } catch (err) {
    next(err);
  }
}
