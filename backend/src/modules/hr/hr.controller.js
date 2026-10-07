import Attendance from '../../models/Attendance.model.js';
import { uploadIfBase64 } from '../../services/cloudinary.service.js';
import User from '../../models/User.model.js';
import * as salaryService from '../../services/salary.service.js';

function startOfDay(d = new Date()) {
  const date = new Date(d);
  date.setHours(0, 0, 0, 0);
  return date;
}

export async function punchIn(req, res, next) {
  try {
    const userId = req.body.userId || req.user.userId;
    const { selfieUrl, lat, lng } = req.body;
    if (!selfieUrl) return res.status(400).json({ message: 'Camera photo is required to punch in — please turn on your camera.' });
    if (typeof lat !== 'number' || typeof lng !== 'number' || Number.isNaN(lat) || Number.isNaN(lng)) {
      return res.status(400).json({ message: 'Location is required to punch in — please turn on location.' });
    }
    const today = startOfDay();
    let record = await Attendance.findOneForTenant(req.tenantId, { userId, date: today });
    if (record && record.punchIn) {
      return res.status(400).json({ message: 'Already punched in today' });
    }
    if (!record) {
      record = new Attendance({ tenantId: req.tenantId, userId, date: today, status: 'present' });
    }
    record.punchIn = new Date();
    record.punchInSelfieUrl = await uploadIfBase64(selfieUrl, 'attendance');
    record.punchInLocation = { lat, lng };
    await record.save();
    res.status(201).json(record);
  } catch (err) { next(err); }
}

export async function punchOut(req, res, next) {
  try {
    const userId = req.body.userId || req.user.userId;
    const { selfieUrl, lat, lng } = req.body;
    if (!selfieUrl) return res.status(400).json({ message: 'Camera photo is required to punch out — please turn on your camera.' });
    if (typeof lat !== 'number' || typeof lng !== 'number' || Number.isNaN(lat) || Number.isNaN(lng)) {
      return res.status(400).json({ message: 'Location is required to punch out — please turn on location.' });
    }
    const today = startOfDay();
    const record = await Attendance.findOneForTenant(req.tenantId, { userId, date: today });
    if (!record || !record.punchIn) {
      return res.status(400).json({ message: 'No punch-in found for today' });
    }
    record.punchOut = new Date();
    record.punchOutSelfieUrl = await uploadIfBase64(selfieUrl, 'attendance');
    record.punchOutLocation = { lat, lng };
    const hours = (record.punchOut - record.punchIn) / (1000 * 60 * 60);
    record.hoursWorked = Math.round(hours * 100) / 100;
    record.overtimeHours = Math.max(0, Math.round((hours - 9) * 100) / 100);
    await record.save();
    res.json(record);
  } catch (err) { next(err); }
}

export async function markLeave(req, res, next) {
  try {
    const { userId, date, leaveType = 'unpaid' } = req.body;
    const day = startOfDay(new Date(date));
    const record = await Attendance.findOneAndUpdate(
      { tenantId: req.tenantId, userId, date: day },
      { status: 'on_leave', leaveType },
      { upsert: true, new: true }
    );
    res.json(record);
  } catch (err) { next(err); }
}

// Staff marking THEIR OWN attendance — no admin approval needed, mirrors how
// punch-in/out already works for self.
export async function selfMarkHalfDay(req, res, next) {
  try {
    const userId = req.user.userId;
    const day = startOfDay(req.body.date ? new Date(req.body.date) : new Date());
    const record = await Attendance.findOneAndUpdate(
      { tenantId: req.tenantId, userId, date: day },
      { $set: { status: 'half_day' } },
      { upsert: true, new: true }
    );
    res.json(record);
  } catch (err) { next(err); }
}

export async function selfApplyLeave(req, res, next) {
  try {
    const userId = req.user.userId;
    const day = startOfDay(req.body.date ? new Date(req.body.date) : new Date());
    const record = await Attendance.findOneAndUpdate(
      { tenantId: req.tenantId, userId, date: day },
      { $set: { status: 'on_leave', leaveType: 'unpaid' } },
      { upsert: true, new: true }
    );
    res.json(record);
  } catch (err) { next(err); }
}

export async function markAttendance(req, res, next) {
  try {
    const { userId, date, status, hoursWorked } = req.body;
    if (!userId || !date || !status) {
      return res.status(400).json({ message: 'userId, date and status are required' });
    }
    const day = startOfDay(new Date(date));
    const record = await Attendance.findOneAndUpdate(
      { tenantId: req.tenantId, userId, date: day },
      { $set: { status, ...(hoursWorked !== undefined ? { hoursWorked } : {}) } },
      { upsert: true, new: true }
    );
    res.json(record);
  } catch (err) { next(err); }
}

const ADMIN_ROLES = ['hotel_admin', 'manager'];

export async function listAttendance(req, res, next) {
  try {
    const { userId, from, to } = req.query;
    const filter = {};
    // Non-admin staff can only ever see their OWN attendance — ignore any
    // userId they try to pass and force it to themselves.
    filter.userId = ADMIN_ROLES.includes(req.user.role) ? (userId || undefined) : req.user.userId;
    if (!filter.userId) delete filter.userId;
    if (from || to) filter.date = {};
    if (from) filter.date.$gte = new Date(from);
    if (to) filter.date.$lte = new Date(to);
    const records = await Attendance.forTenant(req.tenantId).where(filter).sort({ date: -1 });
    res.json(records);
  } catch (err) { next(err); }
}

export async function calculateSalary(req, res, next) {
  try {
    const { userId, year, month } = req.params;
    const user = await User.findOneForTenant(req.tenantId, { _id: userId });
    if (!user) return res.status(404).json({ message: 'Staff not found' });

    const result = await salaryService.calculateMonthlySalary(
      req.tenantId, userId, Number(year), Number(month), user.employmentDetails
    );
    res.json({ user: { id: user._id, name: user.name }, period: `${year}-${month}`, ...result });
  } catch (err) { next(err); }
}
