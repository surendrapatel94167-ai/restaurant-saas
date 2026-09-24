import * as authService from './auth.service.js';
import User from '../../models/User.model.js';
import Tenant from '../../models/Tenant.model.js';
import { uploadIfBase64 } from '../../services/cloudinary.service.js';

export async function login(req, res, next) {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }
    const result = await authService.login(email, password);
    res.status(200).json(result);
  } catch (err) { next(err); }
}

export async function me(req, res) {
  res.status(200).json({ user: req.user });
}

// Every branch (restaurant) this admin can access — their primary tenant plus
// any linked ones — so the panel can show a branch switcher.
export async function getMyBranches(req, res, next) {
  try {
    const user = await User.findById(req.user.userId);
    if (!user) return res.status(404).json({ message: 'Account not found' });
    const ids = [user.tenantId, ...(user.linkedTenantIds || [])].filter(Boolean);
    const tenants = await Tenant.find({ _id: { $in: ids } }).select('hotelName slug logoUrl');
    res.json(tenants.map((t) => ({ ...t.toObject(), isPrimary: String(t._id) === String(user.tenantId) })));
  } catch (err) { next(err); }
}

// Switch the active branch — issues a fresh token scoped to the chosen tenant.
export async function switchBranch(req, res, next) {
  try {
    const { tenantId } = req.body;
    const user = await User.findById(req.user.userId);
    if (!user) return res.status(404).json({ message: 'Account not found' });

    const allowed = String(user.tenantId) === String(tenantId)
      || (user.linkedTenantIds || []).some((id) => String(id) === String(tenantId));
    if (!allowed) return res.status(403).json({ message: 'You do not have access to that branch' });

    const result = authService.issueToken(user, tenantId);
    res.json(result);
  } catch (err) { next(err); }
}

// Any authenticated user (staff, hotel_admin, or super_admin) editing their OWN
// account — name, phone, profile photo, and optionally a new password.
export async function getMyProfile(req, res, next) {
  try {
    const me = await User.findById(req.user.userId).select('-passwordHash');
    if (!me) return res.status(404).json({ message: 'Account not found' });
    res.json(me);
  } catch (err) { next(err); }
}

export async function updateMyProfile(req, res, next) {
  try {
    const { name, phone, profileImageUrl, currentPassword, newPassword } = req.body;
    const me = await User.findById(req.user.userId);
    if (!me) return res.status(404).json({ message: 'Account not found' });

    if (name !== undefined) me.name = name;
    if (phone !== undefined) me.phone = phone;
    if (profileImageUrl) me.profileImageUrl = await uploadIfBase64(profileImageUrl, 'profiles');

    if (newPassword) {
      if (me.role === 'hotel_admin') {
        return res.status(403).json({ message: 'Only the super-admin can reset a restaurant admin\'s password. Please contact them.' });
      }
      const bcrypt = (await import('bcryptjs')).default;
      const matches = currentPassword && (await bcrypt.compare(currentPassword, me.passwordHash));
      if (!matches) return res.status(400).json({ message: 'Current password is incorrect' });
      me.passwordHash = await authService.hashPassword(newPassword);
    }

    await me.save();
    const { passwordHash, ...safe } = me.toObject();
    res.json(safe);
  } catch (err) { next(err); }
}
