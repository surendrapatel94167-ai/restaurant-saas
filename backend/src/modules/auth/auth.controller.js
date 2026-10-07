import * as authService from './auth.service.js';
import User from '../../models/User.model.js';
import Tenant from '../../models/Tenant.model.js';
import { uploadIfBase64 } from '../../services/cloudinary.service.js';
import { notifySuperAdmin } from '../../services/notify.service.js';
import Notification from '../../models/Notification.model.js';
import { sendMail, isMailConfigured } from '../../services/mail.service.js';
import { VAPID_PUBLIC_KEY } from '../../services/push.service.js';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import {
  validateName, validatePhone, validateEmail, validatePassword, normalizeEmail,
} from '../../utils/validators.js';

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
const OTP_TTL_MS = 10 * 60 * 1000;
const MAX_OTP_ATTEMPTS = 5;

function safeUser(user) {
  const obj = user.toObject ? user.toObject() : { ...user };
  delete obj.passwordHash;
  delete obj.pendingChange;
  delete obj.pushSubscriptions;
  return obj;
}

const hashOtp = (otp) => crypto.createHash('sha256').update(String(otp)).digest('hex');

export async function getMyProfile(req, res, next) {
  try {
    const me = await User.findById(req.user.userId).select('-passwordHash');
    if (!me) return res.status(404).json({ message: 'Account not found' });
    res.json(me);
  } catch (err) { next(err); }
}

// Own profile: name, phone, photo, password — and (super-admin only) email.
// The super-admin's email/password changes are sensitive, so instead of being
// applied straight away they are parked and an OTP is emailed; the change only
// happens once /my-profile/verify-otp is called with that OTP.
export async function updateMyProfile(req, res, next) {
  try {
    const { name, phone, profileImageUrl, currentPassword, newPassword, email } = req.body;
    const me = await User.findById(req.user.userId);
    if (!me) return res.status(404).json({ message: 'Account not found' });
    const isSuper = me.role === 'super_admin';

    if (name !== undefined) {
      const err = validateName(name);
      if (err) return res.status(400).json({ message: err });
    }
    if (phone !== undefined && String(phone).trim() !== '') {
      const err = validatePhone(phone);
      if (err) return res.status(400).json({ message: err });
      // One mobile number = one account. Prevents the same number being
      // reused to create several accounts.
      const clash = await User.findOne({ phone: String(phone).trim(), _id: { $ne: me._id } }).select('_id');
      if (clash) return res.status(400).json({ message: 'This mobile number is already used by another account' });
    } else if (phone !== undefined && !isSuper) {
      return res.status(400).json({ message: 'Mobile number is required' });
    }
    if (newPassword) {
      const err = validatePassword(newPassword);
      if (err) return res.status(400).json({ message: err });
    }

    const wantsEmailChange = isSuper && email !== undefined && normalizeEmail(email) !== me.email;
    if (wantsEmailChange) {
      const err = validateEmail(email);
      if (err) return res.status(400).json({ message: err });
      const taken = await User.findOne({ email: normalizeEmail(email), _id: { $ne: me._id } }).select('_id');
      if (taken) return res.status(400).json({ message: 'This email is already used by another account' });
    }

    if (newPassword && me.role === 'hotel_admin') {
      return res.status(403).json({ message: "Only the super-admin can reset a restaurant admin's password. Please contact them." });
    }

    // Password/email changes (all roles) require the current password.
    if (newPassword || wantsEmailChange) {
      const matches = currentPassword && (await bcrypt.compare(currentPassword, me.passwordHash));
      if (!matches) return res.status(400).json({ message: 'Current password is incorrect' });
    }

    // Plain fields apply immediately.
    if (name !== undefined) me.name = String(name).trim();
    if (phone !== undefined) me.phone = String(phone).trim();
    if (profileImageUrl) me.profileImageUrl = await uploadIfBase64(profileImageUrl, 'profiles');

    // Super-admin sensitive changes → OTP.
    if (isSuper && (newPassword || wantsEmailChange)) {
      const otp = String(crypto.randomInt(100000, 1000000));
      me.pendingChange = {
        otpHash: hashOtp(otp),
        expiresAt: new Date(Date.now() + OTP_TTL_MS),
        attempts: 0,
        newEmail: wantsEmailChange ? normalizeEmail(email) : undefined,
        newPasswordHash: newPassword ? await authService.hashPassword(newPassword) : undefined,
      };
      await me.save();

      const what = [wantsEmailChange && 'email', newPassword && 'password'].filter(Boolean).join(' and ');
      const to = process.env.SUPER_ADMIN_OTP_EMAIL || me.email;
      const mail = await sendMail({
        to,
        subject: 'Approve your account change — OTP',
        text: `Someone (hopefully you) asked to change your super-admin ${what}.\n\nYour OTP is: ${otp}\nIt is valid for 10 minutes.\n\nIf this was NOT you, do not share the OTP — just ignore this email (or press "Reject" in the app) and the change will never happen.`,
      });
      return res.json({
        otpRequired: true,
        mailConfigured: isMailConfigured(),
        message: mail.delivered
          ? `OTP sent to ${to}. Enter it to approve the ${what} change.`
          : 'The OTP email could not be sent (SMTP not configured or blocked by the host), so the OTP was printed in the server logs (Render > Logs). Enter it to approve the change.',
        user: safeUser(me),
      });
    }

    await me.save();
    res.json(safeUser(me));
  } catch (err) { next(err); }
}

// Step 2 of a super-admin email/password change — "Approve".
export async function verifyProfileOtp(req, res, next) {
  try {
    const { otp } = req.body;
    const me = await User.findById(req.user.userId).select('+pendingChange');
    if (!me || me.role !== 'super_admin') return res.status(403).json({ message: 'Not allowed' });
    const pending = me.pendingChange;
    if (!pending?.otpHash) return res.status(400).json({ message: 'No pending change to approve' });
    if (new Date(pending.expiresAt) < new Date()) {
      me.pendingChange = undefined; await me.save();
      return res.status(400).json({ message: 'OTP expired — please request the change again' });
    }
    if ((pending.attempts || 0) >= MAX_OTP_ATTEMPTS) {
      me.pendingChange = undefined; await me.save();
      return res.status(400).json({ message: 'Too many wrong attempts — change rejected. Please try again.' });
    }
    if (hashOtp(String(otp || '').trim()) !== pending.otpHash) {
      me.pendingChange.attempts = (pending.attempts || 0) + 1;
      await me.save();
      return res.status(400).json({ message: 'Wrong OTP' });
    }
    if (pending.newEmail) {
      const taken = await User.findOne({ email: pending.newEmail, _id: { $ne: me._id } }).select('_id');
      if (taken) { me.pendingChange = undefined; await me.save(); return res.status(400).json({ message: 'That email is now used by another account' }); }
      me.email = pending.newEmail;
    }
    if (pending.newPasswordHash) me.passwordHash = pending.newPasswordHash;
    me.pendingChange = undefined;
    await me.save();
    res.json({ message: 'Change approved and saved', user: safeUser(me) });
  } catch (err) { next(err); }
}

// "Reject" — throw the pending change away.
export async function rejectProfileChange(req, res, next) {
  try {
    const me = await User.findById(req.user.userId).select('+pendingChange');
    if (!me || me.role !== 'super_admin') return res.status(403).json({ message: 'Not allowed' });
    me.pendingChange = undefined;
    await me.save();
    res.json({ message: 'Change rejected' });
  } catch (err) { next(err); }
}

// Staff asks the super-admin to delete their account.
export async function requestAccountDeletion(req, res, next) {
  try {
    const me = await User.findById(req.user.userId);
    if (!me || ['super_admin', 'hotel_admin'].includes(me.role)) {
      return res.status(403).json({ message: 'Only staff accounts can request deletion' });
    }
    const reason = String(req.body.reason || '').trim();
    if (reason.length < 10) return res.status(400).json({ message: 'Please write a reason (at least 10 characters)' });
    const lastWorkingDate = req.body.lastWorkingDate ? String(req.body.lastWorkingDate).slice(0, 10) : '';

    const already = await Notification.findOne({ type: 'staff_deletion_request', 'meta.userId': String(me._id) });
    if (already) return res.status(400).json({ message: 'You already sent a request — the super-admin has not acted on it yet.' });

    const tenant = await Tenant.findById(me.tenantId);
    const lines = [
      `${me.name} (${me.role}) of ${tenant?.hotelName || 'a restaurant'} wants their account deleted.`,
      `Mobile: ${me.phone || '—'} · Email: ${me.email}`,
      tenant?.address ? `Hotel address: ${tenant.address}` : null,
      lastWorkingDate ? `Last working date: ${lastWorkingDate}` : null,
      `Reason: ${reason}`,
    ].filter(Boolean);

    await notifySuperAdmin({
      tenantId: me.tenantId,
      type: 'staff_deletion_request',
      message: lines.join('\n'),
      meta: {
        userId: String(me._id), name: me.name, role: me.role, phone: me.phone, email: me.email,
        hotelName: tenant?.hotelName, address: tenant?.address, reason, lastWorkingDate,
      },
      pushTitle: 'Account deletion request',
    });
    res.status(201).json({ message: 'Request sent to the super-admin' });
  } catch (err) { next(err); }
}

// Context for the deletion-request page (prefilled, read-only fields).
export async function getDeletionRequestInfo(req, res, next) {
  try {
    const me = await User.findById(req.user.userId).select('name phone email role tenantId');
    const tenant = me?.tenantId ? await Tenant.findById(me.tenantId).select('hotelName address') : null;
    const sent = await Notification.exists({ type: 'staff_deletion_request', 'meta.userId': String(req.user.userId) });
    res.json({
      name: me?.name, phone: me?.phone, email: me?.email, role: me?.role,
      hotelName: tenant?.hotelName, address: tenant?.address, alreadyRequested: !!sent,
    });
  } catch (err) { next(err); }
}

// Any logged-in user can register a device for push (super-admin uses this
// to get payment/approval alerts on their installed app).
export async function getPushKey(req, res) {
  res.json({ publicKey: VAPID_PUBLIC_KEY });
}

export async function savePushSubscription(req, res, next) {
  try {
    const sub = req.body.subscription;
    if (!sub?.endpoint) return res.status(400).json({ message: 'Invalid subscription' });
    const me = await User.findById(req.user.userId).select('+pushSubscriptions');
    if (!me) return res.status(404).json({ message: 'Account not found' });
    const others = (me.pushSubscriptions || []).filter((s) => s.endpoint !== sub.endpoint);
    me.pushSubscriptions = [...others, sub].slice(-5);
    await me.save();
    res.status(201).json({ ok: true });
  } catch (err) { next(err); }
}
