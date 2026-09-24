import User from '../../models/User.model.js';
import { hashPassword } from '../auth/auth.service.js';
import * as salaryService from '../../services/salary.service.js';
import { uploadIfBase64 } from '../../services/cloudinary.service.js';

// hotel_admin/manager manage their own restaurant's staff (cooks, waiters, cashiers...).
// The list also carries this month's attendance + computed salary so the admin
// doesn't have to open each staff member separately.
export async function list(req, res, next) {
  try {
    const staff = await User.forTenant(req.tenantId)
      .where({ role: { $nin: ['super_admin', 'hotel_admin'] } })
      .select('-passwordHash')
      .sort({ createdAt: -1 });

    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;

    const withSummary = await Promise.all(staff.map(async (s) => {
      let summary = null;
      try {
        summary = await salaryService.calculateMonthlySalary(req.tenantId, s._id, year, month, s.employmentDetails);
      } catch {
        summary = null;
      }
      return { ...s.toObject(), thisMonth: summary };
    }));

    res.json(withSummary);
  } catch (err) { next(err); }
}

export async function create(req, res, next) {
  try {
    const { name, email, phone, password, role, employmentDetails, profileImageUrl } = req.body;
    if (!name || !email || !password || !role) {
      return res.status(400).json({ message: 'name, email, password and role are required' });
    }
    const existing = await User.findOne({ tenantId: req.tenantId, email });
    if (existing) return res.status(400).json({ message: 'A staff member with this email already exists' });

    const staff = await User.create({
      tenantId: req.tenantId,
      name, email, phone, role,
      profileImageUrl: await uploadIfBase64(profileImageUrl, 'staff'),
      passwordHash: await hashPassword(password),
      employmentDetails,
    });
    const { passwordHash, ...safe } = staff.toObject();
    res.status(201).json(safe);
  } catch (err) { next(err); }
}

export async function update(req, res, next) {
  try {
    const { name, phone, role, employmentDetails, profileImageUrl, email } = req.body;
    const set = { name, phone, role, employmentDetails, email };
    if (profileImageUrl) set.profileImageUrl = await uploadIfBase64(profileImageUrl, 'staff');
    const staff = await User.findOneAndUpdate(
      { _id: req.params.id, tenantId: req.tenantId },
      { $set: set },
      { new: true }
    ).select('-passwordHash');
    if (!staff) return res.status(404).json({ message: 'Staff member not found' });
    res.json(staff);
  } catch (err) { next(err); }
}

export async function toggleActive(req, res, next) {
  try {
    const staff = await User.findOne({ _id: req.params.id, tenantId: req.tenantId });
    if (!staff) return res.status(404).json({ message: 'Staff member not found' });
    staff.isActive = !staff.isActive;
    await staff.save();
    res.json({ id: staff._id, isActive: staff.isActive });
  } catch (err) { next(err); }
}

// Admin can't SEE a staff member's password (it's hashed, one-way) but can set a new one.
export async function resetPassword(req, res, next) {
  try {
    const { newPassword } = req.body;
    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({ message: 'newPassword must be at least 6 characters' });
    }
    const staff = await User.findOne({ _id: req.params.id, tenantId: req.tenantId });
    if (!staff) return res.status(404).json({ message: 'Staff member not found' });
    staff.passwordHash = await hashPassword(newPassword);
    await staff.save();
    res.json({ message: 'Password reset successfully' });
  } catch (err) { next(err); }
}

export async function remove(req, res, next) {
  try {
    const staff = await User.findOneAndDelete({ _id: req.params.id, tenantId: req.tenantId });
    if (!staff) return res.status(404).json({ message: 'Staff member not found' });
    res.status(204).send();
  } catch (err) { next(err); }
}
