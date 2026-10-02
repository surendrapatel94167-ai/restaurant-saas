import { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { IndianRupee, ShoppingBag, Clock, LayoutGrid } from 'lucide-react';
import api from '../../api/axios';
import StatusBadge from '../../components/StatusBadge';

const STAT_ICONS = [
  { key: 'totalSalesToday', label: "Today's Sales", icon: IndianRupee, color: 'bg-green-100 text-green-600', format: (v) => `₹${v}` },
  { key: 'totalOrdersToday', label: "Today's Orders", icon: ShoppingBag, color: 'bg-blue-100 text-blue-600', format: (v) => v },
  { key: 'pendingOrders', label: 'Pending Orders', icon: Clock, color: 'bg-amber-100 text-amber-600', format: (v) => v },
  { key: 'tablesAvailable', label: 'Available Tables', icon: LayoutGrid, color: 'bg-brand-100 text-brand-600', format: (v, s) => `${v} / ${s.tablesTotal}` },
];

export default function DashboardPage() {
  const { user } = useSelector((s) => s.auth);
  const navigate = useNavigate();
  const [data, setData] = useState(null);

  useEffect(() => {
    api.get('/analytics/dashboard').then(({ data }) => setData(data));
  }, []);

  const greeting = (() => {
    const h = new Date().getHours();
    if (h < 12) return 'Good Morning';
    if (h < 17) return 'Good Afternoon';
    return 'Good Evening';
  })();

  if (!data) return <p className="text-gray-500">Loading…</p>;

  const { stats, salesOverview, tableStatus, recentOrders, pendingKot } = data;
  const chartData = salesOverview.map((d) => ({
    ...d,
    label: new Date(d.date).toLocaleDateString(undefined, { day: '2-digit', month: 'short' }),
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-ink-900">{greeting}, {user?.name?.split(' ')[0] || 'there'}</h1>
        <p className="text-sm text-gray-500 mt-0.5">Here's what's happening in your restaurant today</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {STAT_ICONS.map((s) => (
          <div key={s.key} className="bg-white rounded-xl shadow-card p-4 flex items-center gap-3">
            <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${s.color}`}>
              <s.icon size={20} />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-gray-500 truncate">{s.label}</p>
              <p className="text-xl font-bold text-ink-900">{s.format(stats[s.key], stats)}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 bg-white rounded-xl shadow-card p-4">
          <h2 className="font-semibold text-ink-900 mb-3">Sales Overview — Last 7 Days</h2>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
              <XAxis dataKey="label" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip formatter={(v) => [`₹${v}`, 'Revenue']} />
              <Line type="monotone" dataKey="revenue" stroke="#F2560A" strokeWidth={2.5} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white rounded-xl shadow-card p-4">
          <h2 className="font-semibold text-ink-900 mb-3">Table Status</h2>
          <div className="grid grid-cols-4 gap-2">
            {tableStatus.map((t) => (
              <div
                key={t._id}
                className={`rounded-lg py-2.5 text-center text-xs font-semibold ${
                  t.status === 'occupied' ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'
                }`}
              >
                T{t.tableNumber}
              </div>
            ))}
            {tableStatus.length === 0 && <p className="col-span-4 text-sm text-gray-400 text-center py-4">No tables yet.</p>}
          </div>
          <div className="flex items-center gap-4 mt-3 text-xs text-gray-500">
            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-green-500" /> Available</span>
            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-red-500" /> Occupied</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-white rounded-xl shadow-card p-4">
          <div className="flex justify-between items-center mb-3">
            <h2 className="font-semibold text-ink-900">Recent Orders</h2>
            <button onClick={() => navigate('/pending-payments')} className="text-xs text-brand-600 font-medium hover:underline">View all</button>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-gray-500 border-b">
                <th className="py-1.5">Table</th><th>Items</th><th>Amount</th><th>Status</th>
              </tr>
            </thead>
            <tbody>
              {recentOrders.map((o) => (
                <tr key={o._id} className="border-b last:border-0">
                  <td className="py-1.5">{o.tableNumber || '—'}</td>
                  <td>{o.items?.length || 0}</td>
                  <td>₹{o.totalAmount}</td>
                  <td><StatusBadge status={o.status} /></td>
                </tr>
              ))}
              {recentOrders.length === 0 && <tr><td colSpan="4" className="text-center text-gray-400 py-4">No orders yet.</td></tr>}
            </tbody>
          </table>
        </div>

        <div className="bg-white rounded-xl shadow-card p-4">
          <div className="flex justify-between items-center mb-3">
            <h2 className="font-semibold text-ink-900">Pending KOT</h2>
            <button onClick={() => navigate('/kds')} className="text-xs text-brand-600 font-medium hover:underline">View all</button>
          </div>
          <div className="space-y-2">
            {pendingKot.map((o) => (
              <div key={o._id} className="flex justify-between items-center border-b last:border-0 pb-2 last:pb-0">
                <div>
                  <p className="text-sm font-medium text-ink-900">Table {o.tableNumber || '—'}</p>
                  <p className="text-xs text-gray-400">{o.items?.length || 0} items · {new Date(o.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                </div>
                <StatusBadge status={o.status} />
              </div>
            ))}
            {pendingKot.length === 0 && <p className="text-gray-400 text-center py-4 text-sm">Kitchen is all caught up 🎉</p>}
          </div>
        </div>
      </div>
    </div>
  );
}
