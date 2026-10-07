import User from '../../models/User.model.js';
import { hashPassword } from '../auth/auth.service.js';
import * as salaryService from '../../services/salary.service.js';
import { uploadIfBase64 } from '../../services/cloudinary.service.js';
import {
  validateName, validateEmail, validatePhone, validatePassword, validateSalary,
  validateDateRange, normalizeEmail, firstError,
} from '../../utils/validators.js';

const STAFF_ROLES = ['manager', 'chef', 'waiter', 'cashier'];

function validateEmployment(ed) {
  const amount = ed?.monthlySalary ?? ed?.dailyWage;
  return {
    salary: validateSalary(amount),
    dates: validateDateRange(ed?.joinDate, ed?.endDate),
  };
}

async function phoneTaken(phone, excludeId) {
  const q = { phone: String(phone).trim() };
  if (excludeId) q._id = { $ne: excludeId };
  return !!(await User.exists(q));
}

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
    const { name, phone, password, role, employmentDetails, profileImageUrl } = req.body;
    const email = normalizeEmail(req.body.email);
    const emp = validateEmployment(employmentDetails);
    const err = firstError({
      name: validateName(name), email: validateEmail(email), phone: validatePhone(phone),
      password: validatePassword(password), salary: emp.salary, dates: emp.dates,
      role: STAFF_ROLES.includes(role) ? '' : 'Invalid role',
    });
    if (err) return res.status(400).json({ message: err });

    const existing = await User.findOne({ tenantId: req.tenantId, email });
    if (existing) return res.status(400).json({ message: 'A staff member with this email already exists' });
    if (await User.exists({ email })) return res.status(400).json({ message: 'This email is already registered to another account' });
    if (await phoneTaken(phone)) return res.status(400).json({ message: 'This mobile number is already used by another account' });

    const staff = await User.create({
      tenantId: req.tenantId,
      name: String(name).trim(), email, phone: String(phone).trim(), role,
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
    const { name, phone, role, employmentDetails, profileImageUrl } = req.body;
    const email = normalizeEmail(req.body.email);
    const emp = validateEmployment(employmentDetails);
    const err = firstError({
      name: validateName(name), email: validateEmail(email), phone: validatePhone(phone),
      salary: emp.salary, dates: emp.dates,
      role: STAFF_ROLES.includes(role) ? '' : 'Invalid role',
    });
    if (err) return res.status(400).json({ message: err });
    if (await User.exists({ email, _id: { $ne: req.params.id } })) {
      return res.status(400).json({ message: 'This email is already registered to another account' });
    }
    if (await phoneTaken(phone, req.params.id)) return res.status(400).json({ message: 'This mobile number is already used by another account' });
    const set = { name: String(name).trim(), phone: String(phone).trim(), role, employmentDetails, email };
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
    const pwErr = validatePassword(newPassword);
    if (pwErr) return res.status(400).json({ message: pwErr });
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
