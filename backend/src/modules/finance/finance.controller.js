import Order from '../../models/Order.model.js';
import Expense from '../../models/Expense.model.js';
import Vendor from '../../models/Vendor.model.js';

export async function salesDashboard(req, res, next) {
  try {
    const { from, to } = req.query;
    const match = { tenantId: req.tenantId, 'payment.status': 'PAID' };
    if (from || to) {
      match.createdAt = {};
      if (from) match.createdAt.$gte = new Date(from);
      if (to) match.createdAt.$lte = new Date(to);
    }

    const rows = await Order.aggregate([
      { $match: match },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          totalSales: { $sum: '$totalAmount' },
          orderCount: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    res.json(rows);
  } catch (err) { next(err); }
}

export async function addExpense(req, res, next) {
  try {
    const expense = await Expense.create({ ...req.body, tenantId: req.tenantId });
    res.status(201).json(expense);
  } catch (err) { next(err); }
}

export async function listExpenses(req, res, next) {
  try {
    const { from, to } = req.query;
    const filter = {};
    if (from || to) filter.date = {};
    if (from) filter.date.$gte = new Date(from);
    if (to) filter.date.$lte = new Date(to);
    const expenses = await Expense.forTenant(req.tenantId).where(filter).sort({ date: -1 });
    res.json(expenses);
  } catch (err) { next(err); }
}

export async function addVendor(req, res, next) {
  try {
    const vendor = await Vendor.create({ ...req.body, tenantId: req.tenantId });
    res.status(201).json(vendor);
  } catch (err) { next(err); }
}

export async function listVendors(req, res, next) {
  try {
    const vendors = await Vendor.forTenant(req.tenantId);
    res.json(vendors);
  } catch (err) { next(err); }
}

export async function addVendorTransaction(req, res, next) {
  try {
    const { type, amount, note } = req.body;
    const vendor = await Vendor.findOneForTenant(req.tenantId, { _id: req.params.vendorId });
    if (!vendor) return res.status(404).json({ message: 'Vendor not found' });

    vendor.transactions.push({ type, amount, note, date: new Date() });
    vendor.khataBalance += type === 'debit' ? amount : -amount;
    await vendor.save();
    res.json(vendor);
  } catch (err) { next(err); }
}

export async function profitAndLoss(req, res, next) {
  try {
    const { year, month, day } = req.query;
    if (!year) return res.status(400).json({ message: 'year is required' });

    let start, end, period;
    if (day) {
      start = new Date(Number(year), Number(month) - 1, Number(day));
      end = new Date(Number(year), Number(month) - 1, Number(day), 23, 59, 59);
      period = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    } else if (month) {
      start = new Date(Number(year), Number(month) - 1, 1);
      end = new Date(Number(year), Number(month), 0, 23, 59, 59);
      period = `${year}-${String(month).padStart(2, '0')}`;
    } else {
      start = new Date(Number(year), 0, 1);
      end = new Date(Number(year), 11, 31, 23, 59, 59);
      period = `${year}`;
    }

    const [salesAgg] = await Order.aggregate([
      { $match: { tenantId: req.tenantId, 'payment.status': 'PAID', createdAt: { $gte: start, $lte: end } } },
      { $group: { _id: null, totalRevenue: { $sum: '$totalAmount' } } },
    ]);

    const [expenseAgg] = await Expense.aggregate([
      { $match: { tenantId: req.tenantId, date: { $gte: start, $lte: end } } },
      { $group: { _id: null, totalExpenses: { $sum: '$amount' } } },
    ]);

    const totalRevenue = salesAgg?.totalRevenue || 0;
    const totalExpenses = expenseAgg?.totalExpenses || 0;

    res.json({ period, totalRevenue, totalExpenses, netProfit: totalRevenue - totalExpenses });
  } catch (err) { next(err); }
}
