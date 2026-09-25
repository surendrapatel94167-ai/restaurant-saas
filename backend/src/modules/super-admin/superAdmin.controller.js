import Tenant from '../../models/Tenant.model.js';
import User from '../../models/User.model.js';
import Table from '../../models/Table.model.js';
import MenuItem from '../../models/MenuItem.model.js';
import Order from '../../models/Order.model.js';
import Attendance from '../../models/Attendance.model.js';
import Expense from '../../models/Expense.model.js';
import Vendor from '../../models/Vendor.model.js';
import Review from '../../models/Review.model.js';
import Notification from '../../models/Notification.model.js';
import { hashPassword } from '../auth/auth.service.js';
import * as qrcodeService from '../../services/qrcode.service.js';
import { CUSTOMER_APP_URL } from '../../config/env.js';

export async function listTenants(req, res, next) {
  try {
    const tenants = await Tenant.find().sort({ createdAt: -1 }).lean();
    const withCounts = await Promise.all(tenants.map(async (t) => {
      const [tableCount, admin] = await Promise.all([
        Table.countDocuments({ tenantId: t._id }),
        User.findOne({ tenantId: t._id, role: 'hotel_admin' }).select('name email phone'),
      ]);
      return { ...t, tableCount, admin };
    }));
    res.json(withCounts);
  } catch (err) { next(err); }
}

// Full detail view for one hotel: contact info, tables/QR, admin account.
export async function getTenant(req, res, next) {
  try {
    const tenant = await Tenant.findById(req.params.tenantId);
    if (!tenant) return res.status(404).json({ message: 'Tenant not found' });
    const [tables, staffCount, admin] = await Promise.all([
      Table.find({ tenantId: tenant._id }).sort({ tableNumber: 1 }),
      User.countDocuments({ tenantId: tenant._id }),
      User.findOne({ tenantId: tenant._id, role: 'hotel_admin' }).select('name email phone'),
    ]);
    res.json({ tenant, tables, staffCount, admin });
  } catch (err) { next(err); }
}

export async function listAdmins(req, res, next) {
  try {
    const admins = await User.find({ role: 'hotel_admin' }).select('name email tenantId linkedTenantIds');
    const tenantIds = [...new Set(admins.map((a) => String(a.tenantId)))];
    const tenants = await Tenant.find({ _id: { $in: tenantIds } }).select('hotelName');
    const tenantNameById = new Map(tenants.map((t) => [String(t._id), t.hotelName]));

    res.json(admins.map((a) => ({
      _id: a._id,
      name: a.name,
      email: a.email,
      primaryHotelName: tenantNameById.get(String(a.tenantId)) || 'Unknown',
      branchCount: 1 + (a.linkedTenantIds?.length || 0),
    })));
  } catch (err) { next(err); }
}

export async function onboardTenant(req, res, next) {
  try {
    const {
      hotelName, slug, ownerName, contactEmail, contactPhone, address,
      adminName, adminPassword, tableCount = 10, trialDays = 5,
      linkToExistingAdminEmail, // multi-branch: attach this new hotel to an admin who already has a login
    } = req.body;

    const existing = await Tenant.findOne({ slug });
    if (existing) return res.status(400).json({ message: 'Slug already taken' });

    const trialEndDate = new Date(Date.now() + Number(trialDays) * 24 * 60 * 60 * 1000);
    const tenant = await Tenant.create({
      hotelName, slug, ownerName, contactEmail, contactPhone, address,
      subscription: { plan: 'trial', status: 'active', startDate: new Date(), endDate: trialEndDate },
    });

    let admin;
    if (linkToExistingAdminEmail) {
      admin = await User.findOne({ email: linkToExistingAdminEmail, role: 'hotel_admin' });
      if (!admin) return res.status(404).json({ message: 'No existing admin found with that email' });
      admin.linkedTenantIds = [...new Set([...(admin.linkedTenantIds || []).map(String), String(tenant._id)])];
      await admin.save();
    } else {
      if (!adminName || !adminPassword) {
        return res.status(400).json({ message: 'adminName and adminPassword are required for a new admin login' });
      }
      admin = await User.create({
        tenantId: tenant._id,
        name: adminName,
        email: contactEmail,
        phone: contactPhone,
        passwordHash: await hashPassword(adminPassword),
        role: 'hotel_admin',
      });
    }

    const baseUrl = req.body.baseUrl || CUSTOMER_APP_URL;
    const tables = [];
    for (let i = 1; i <= tableCount; i++) {
      const table = new Table({ tenantId: tenant._id, tableNumber: String(i) });
      await table.save();
      const { url, qrDataUrl } = await qrcodeService.generateTableQR(slug, table._id, baseUrl);
      table.qrCodeUrl = qrDataUrl;
      await table.save();
      tables.push({ tableNumber: table.tableNumber, url, qrDataUrl });
    }

    res.status(201).json({ tenant, admin: { id: admin._id, email: admin.email, linked: !!linkToExistingAdminEmail }, tables });
  } catch (err) { next(err); }
}

// One owner, multiple restaurants set up in a single go — ONE admin login,
// but each branch gets its OWN tables/QR codes/location/staff (managers etc.
// are added separately per-branch from that branch's HR page after this).
export async function onboardMultiBranch(req, res, next) {
  try {
    const { ownerName, adminName, contactEmail, contactPhone, adminPassword, branches, trialDays = 5 } = req.body;

    if (!adminName || !contactEmail || !adminPassword) {
      return res.status(400).json({ message: 'adminName, contactEmail and adminPassword are required' });
    }
    if (!Array.isArray(branches) || branches.length < 2) {
      return res.status(400).json({ message: 'Provide at least 2 branches (for a single restaurant, use the regular Add Hotel form)' });
    }

    const existingAdmin = await User.findOne({ email: contactEmail });
    if (existingAdmin) return res.status(400).json({ message: 'An account with this email already exists' });

    for (const b of branches) {
      if (!b.hotelName || !b.slug) return res.status(400).json({ message: 'Every branch needs a hotel name and slug' });
      const existingTenant = await Tenant.findOne({ slug: b.slug });
      if (existingTenant) return res.status(400).json({ message: `Slug already taken: ${b.slug}` });
    }

    const baseUrl = req.body.baseUrl || CUSTOMER_APP_URL;
    const results = [];
    let primaryTenantId = null;
    const linkedTenantIds = [];

    for (const b of branches) {
      const tenant = await Tenant.create({
        hotelName: b.hotelName, slug: b.slug, ownerName,
        contactEmail: b.contactEmail || contactEmail,
        contactPhone: b.contactPhone || contactPhone,
        address: b.address,
        subscription: { plan: 'trial', status: 'active', startDate: new Date(), endDate: new Date(Date.now() + Number(trialDays) * 24 * 60 * 60 * 1000) },
      });
      if (!primaryTenantId) primaryTenantId = tenant._id; else linkedTenantIds.push(tenant._id);

      const tables = [];
      const tableCount = Number(b.tableCount) || 10;
      for (let i = 1; i <= tableCount; i++) {
        const table = new Table({ tenantId: tenant._id, tableNumber: String(i) });
        await table.save();
        const { url, qrDataUrl } = await qrcodeService.generateTableQR(b.slug, table._id, baseUrl);
        table.qrCodeUrl = qrDataUrl;
        await table.save();
        tables.push({ tableNumber: table.tableNumber, url, qrDataUrl });
      }
      results.push({ tenant, tables });
    }

    const admin = await User.create({
      tenantId: primaryTenantId,
      linkedTenantIds,
      name: adminName,
      email: contactEmail,
      phone: contactPhone,
      passwordHash: await hashPassword(adminPassword),
      role: 'hotel_admin',
    });

    res.status(201).json({ admin: { id: admin._id, email: admin.email }, branches: results });
  } catch (err) { next(err); }
}

// Edit a hotel's own details (name, contact info, address) — NOT subscription,
// which has its own dedicated endpoint below.
export async function updateTenant(req, res, next) {
  try {
    const { hotelName, ownerName, contactEmail, contactPhone, address } = req.body;
    const tenant = await Tenant.findByIdAndUpdate(
      req.params.tenantId,
      { $set: { hotelName, ownerName, contactEmail, contactPhone, address } },
      { new: true }
    );
    if (!tenant) return res.status(404).json({ message: 'Tenant not found' });
    res.json(tenant);
  } catch (err) { next(err); }
}

// Permanently remove a hotel and everything that belongs to it.
export async function deleteTenant(req, res, next) {
  try {
    const tenant = await Tenant.findById(req.params.tenantId);
    if (!tenant) return res.status(404).json({ message: 'Tenant not found' });
    const tenantId = tenant._id;

    await Promise.all([
      User.deleteMany({ tenantId }),
      Table.deleteMany({ tenantId }),
      MenuItem.deleteMany({ tenantId }),
      Order.deleteMany({ tenantId }),
      Attendance.deleteMany({ tenantId }),
      Expense.deleteMany({ tenantId }),
      Vendor.deleteMany({ tenantId }),
      Review.deleteMany({ tenantId }),
      Notification.deleteMany({ tenantId }),
    ]);
    await tenant.deleteOne();

    res.status(204).send();
  } catch (err) { next(err); }
}

export async function updateSubscription(req, res, next) {
  try {
    const { plan, status, endDate } = req.body;
    const set = { 'subscription.plan': plan, 'subscription.status': status, 'subscription.endDate': endDate };
    const tenant = await Tenant.findByIdAndUpdate(
      req.params.tenantId,
      { $set: set },
      { new: true }
    );
    if (!tenant) return res.status(404).json({ message: 'Tenant not found' });
    res.json(tenant);
  } catch (err) { next(err); }
}

export async function toggleActive(req, res, next) {
  try {
    const tenant = await Tenant.findById(req.params.tenantId);
    if (!tenant) return res.status(404).json({ message: 'Tenant not found' });
    tenant.isActive = !tenant.isActive;
    await tenant.save();
    res.json(tenant);
  } catch (err) { next(err); }
}

// Admin self-reported a payment (status='pending_approval') — super-admin
// checks it actually landed and approves it here. This is what actually
// unlocks the tenant's admin panel again (see requireActiveSubscription).
export async function approveSubscription(req, res, next) {
  try {
    const tenant = await Tenant.findById(req.params.tenantId);
    if (!tenant) return res.status(404).json({ message: 'Tenant not found' });
    if (tenant.subscription.status !== 'pending_approval') {
      return res.status(400).json({ message: 'This tenant has no pending payment to approve' });
    }

    const plan = tenant.subscription.pendingPlan || 'monthly';
    const durationMs = plan === 'yearly' ? 365 * 24 * 60 * 60 * 1000 : 30 * 24 * 60 * 60 * 1000;
    // Extend from whichever is later — "now" or the current expiry — so
    // renewing early doesn't waste remaining days already paid for.
    const base = tenant.subscription.endDate && new Date(tenant.subscription.endDate) > new Date()
      ? new Date(tenant.subscription.endDate)
      : new Date();
    const newEndDate = new Date(base.getTime() + durationMs);

    tenant.subscription.plan = plan;
    tenant.subscription.status = 'active';
    tenant.subscription.endDate = newEndDate;
    tenant.subscription.pendingPlan = undefined;
    tenant.subscription.pendingSince = undefined;
    await tenant.save();

    await Notification.create({
      recipientType: 'tenant_admin',
      tenantId: tenant._id,
      type: 'subscription_approved',
      message: `Your ${plan} subscription has been approved — active until ${newEndDate.toDateString()}. Welcome back!`,
    });

    res.json(tenant);
  } catch (err) { next(err); }
}

// The restaurant admin cannot change their own password — only super-admin
// can set a new one for them (initial creation, or on request).
export async function resetAdminPassword(req, res, next) {
  try {
    const { newPassword } = req.body;
    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({ message: 'newPassword must be at least 6 characters' });
    }
    const admin = await User.findOne({ tenantId: req.params.tenantId, role: 'hotel_admin' });
    if (!admin) return res.status(404).json({ message: 'Admin account not found for this hotel' });
    admin.passwordHash = await hashPassword(newPassword);
    await admin.save();
    res.json({ message: 'Admin password reset successfully' });
  } catch (err) { next(err); }
}

// Broadcast a message to every hotel, or a hand-picked few.
export async function sendMessage(req, res, next) {
  try {
    const { tenantIds, message } = req.body;
    if (!message) return res.status(400).json({ message: 'message is required' });

    let targets = tenantIds;
    if (!targets || targets === 'all' || (Array.isArray(targets) && targets.length === 0)) {
      targets = (await Tenant.find().select('_id')).map((t) => t._id);
    }
    if (!Array.isArray(targets) || targets.length === 0) {
      return res.status(400).json({ message: 'No target hotels found' });
    }

    await Notification.insertMany(targets.map((tenantId) => ({
      recipientType: 'tenant_admin',
      tenantId,
      type: 'broadcast',
      message,
    })));

    res.status(201).json({ sent: targets.length });
  } catch (err) { next(err); }
}
