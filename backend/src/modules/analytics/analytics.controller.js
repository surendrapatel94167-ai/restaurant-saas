import Order from '../../models/Order.model.js';

function daysAgo(n) {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - n);
  return d;
}

// Cards at the top of the dashboard: revenue/orders for today vs this range.
export async function getSummary(req, res, next) {
  try {
    const range = Number(req.query.days) || 7;
    const since = daysAgo(range - 1);
    const todayStart = daysAgo(0);

    const [rangeAgg, todayAgg, allTimeAgg] = await Promise.all([
      Order.aggregate([
        { $match: { tenantId: req.tenantId, 'payment.status': 'PAID', createdAt: { $gte: since } } },
        { $group: { _id: null, revenue: { $sum: '$totalAmount' }, orders: { $sum: 1 } } },
      ]),
      Order.aggregate([
        { $match: { tenantId: req.tenantId, 'payment.status': 'PAID', createdAt: { $gte: todayStart } } },
        { $group: { _id: null, revenue: { $sum: '$totalAmount' }, orders: { $sum: 1 } } },
      ]),
      Order.aggregate([
        { $match: { tenantId: req.tenantId, 'payment.status': 'PAID' } },
        { $group: { _id: null, revenue: { $sum: '$totalAmount' }, orders: { $sum: 1 } } },
      ]),
    ]);

    const range_ = rangeAgg[0] || { revenue: 0, orders: 0 };
    const today = todayAgg[0] || { revenue: 0, orders: 0 };
    const allTime = allTimeAgg[0] || { revenue: 0, orders: 0 };

    res.json({
      todayRevenue: today.revenue,
      todayOrders: today.orders,
      rangeRevenue: range_.revenue,
      rangeOrders: range_.orders,
      avgOrderValue: range_.orders ? Math.round(range_.revenue / range_.orders) : 0,
      allTimeRevenue: allTime.revenue,
      allTimeOrders: allTime.orders,
    });
  } catch (err) { next(err); }
}

// Daily revenue + order count for the last N days — the line/bar chart data.
export async function getRevenueTrend(req, res, next) {
  try {
    const range = Number(req.query.days) || 7;
    const since = daysAgo(range - 1);

    const rows = await Order.aggregate([
      { $match: { tenantId: req.tenantId, 'payment.status': 'PAID', createdAt: { $gte: since } } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          revenue: { $sum: '$totalAmount' },
          orders: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    // Fill in zero-days so the chart doesn't have gaps.
    const byDate = new Map(rows.map((r) => [r._id, r]));
    const result = [];
    for (let i = range - 1; i >= 0; i--) {
      const d = daysAgo(i);
      const key = d.toISOString().slice(0, 10);
      const found = byDate.get(key);
      result.push({ date: key, revenue: found?.revenue || 0, orders: found?.orders || 0 });
    }
    res.json(result);
  } catch (err) { next(err); }
}

// Which dishes sell the most / least — unwind every order's line items and
// sum quantity sold per dish, using the name snapshot stored on the order
// (so it still works even if the dish was later renamed or deleted).
export async function getDishPerformance(req, res, next) {
  try {
    const range = Number(req.query.days) || 30;
    const since = daysAgo(range - 1);

    const rows = await Order.aggregate([
      { $match: { tenantId: req.tenantId, 'payment.status': 'PAID', createdAt: { $gte: since } } },
      { $unwind: '$items' },
      {
        $group: {
          _id: '$items.menuItemId',
          name: { $first: '$items.nameSnapshot' },
          quantitySold: { $sum: '$items.quantity' },
          revenue: { $sum: { $multiply: ['$items.priceSnapshot', '$items.quantity'] } },
        },
      },
      { $sort: { quantitySold: -1 } },
    ]);

    res.json({
      topSellers: rows.slice(0, 10),
      leastPopular: [...rows].reverse().slice(0, 10),
    });
  } catch (err) { next(err); }
}

// Order count by hour of day — spot the lunch/dinner rush.
export async function getPeakHours(req, res, next) {
  try {
    const range = Number(req.query.days) || 30;
    const since = daysAgo(range - 1);

    const rows = await Order.aggregate([
      { $match: { tenantId: req.tenantId, createdAt: { $gte: since } } },
      { $group: { _id: { $hour: '$createdAt' }, orders: { $sum: 1 } } },
      { $sort: { _id: 1 } },
    ]);

    const byHour = new Map(rows.map((r) => [r._id, r.orders]));
    const result = Array.from({ length: 24 }, (_, h) => ({ hour: h, orders: byHour.get(h) || 0 }));
    res.json(result);
  } catch (err) { next(err); }
}
