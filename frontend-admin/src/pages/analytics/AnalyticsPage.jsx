import { useEffect, useState } from 'react';
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import api from '../../api/axios';

const RANGE_OPTIONS = [
  { label: '7 days', value: 7 },
  { label: '30 days', value: 30 },
  { label: '90 days', value: 90 },
];

function StatCard({ label, value, sub }) {
  return (
    <div className="bg-white rounded-xl shadow-card p-4">
      <p className="text-gray-500 text-sm">{label}</p>
      <p className="text-2xl font-bold text-ink-900">{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
    </div>
  );
}

export default function AnalyticsPage() {
  const [range, setRange] = useState(7);
  const [summary, setSummary] = useState(null);
  const [trend, setTrend] = useState([]);
  const [dishes, setDishes] = useState({ topSellers: [], leastPopular: [] });
  const [peakHours, setPeakHours] = useState([]);

  useEffect(() => {
    api.get('/analytics/summary', { params: { days: range } }).then(({ data }) => setSummary(data));
    api.get('/analytics/revenue-trend', { params: { days: range } }).then(({ data }) => setTrend(data));
    api.get('/analytics/dish-performance', { params: { days: range } }).then(({ data }) => setDishes(data));
    api.get('/analytics/peak-hours', { params: { days: range } }).then(({ data }) => setPeakHours(data));
  }, [range]);

  const trendData = trend.map((t) => ({
    ...t,
    label: new Date(t.date).toLocaleDateString(undefined, { day: '2-digit', month: 'short' }),
  }));
  const peakData = peakHours.map((h) => ({
    ...h,
    label: h.hour === 0 ? '12am' : h.hour < 12 ? `${h.hour}am` : h.hour === 12 ? '12pm' : `${h.hour - 12}pm`,
  }));

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-ink-900">Analytics</h1>
        <div className="flex gap-1">
          {RANGE_OPTIONS.map((r) => (
            <button key={r.value} onClick={() => setRange(r.value)}
              className={`text-xs px-3 py-1.5 rounded-full font-medium ${range === r.value ? 'bg-brand-600 text-white' : 'bg-white text-gray-600 border'}`}>
              {r.label}
            </button>
          ))}
        </div>
      </div>

      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard label="Today's Revenue" value={`₹${summary.todayRevenue}`} sub={`${summary.todayOrders} orders`} />
          <StatCard label={`Last ${range} days`} value={`₹${summary.rangeRevenue}`} sub={`${summary.rangeOrders} orders`} />
          <StatCard label="Avg Order Value" value={`₹${summary.avgOrderValue}`} />
          <StatCard label="All-time Revenue" value={`₹${summary.allTimeRevenue}`} sub={`${summary.allTimeOrders} orders`} />
        </div>
      )}

      <div className="bg-white rounded-xl shadow-card p-4">
        <h2 className="font-semibold mb-3">Revenue Trend</h2>
        <ResponsiveContainer width="100%" height={260}>
          <LineChart data={trendData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0ebe4" />
            <XAxis dataKey="label" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} />
            <Tooltip formatter={(v, name) => [name === 'revenue' ? `₹${v}` : v, name === 'revenue' ? 'Revenue' : 'Orders']} />
            <Line type="monotone" dataKey="revenue" stroke="#d97706" strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="bg-white rounded-xl shadow-card p-4">
        <h2 className="font-semibold mb-3">Orders per Day</h2>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={trendData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0ebe4" />
            <XAxis dataKey="label" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
            <Tooltip />
            <Bar dataKey="orders" fill="#f59e0b" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="bg-white rounded-xl shadow-card p-4">
        <h2 className="font-semibold mb-3">Peak Hours (orders by hour)</h2>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={peakData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0ebe4" />
            <XAxis dataKey="label" tick={{ fontSize: 10 }} interval={1} />
            <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
            <Tooltip />
            <Bar dataKey="orders" fill="#7c3aed" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-card p-4">
          <h2 className="font-semibold mb-3">🔥 Best-selling Dishes</h2>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-gray-500 border-b">
                <th className="py-1">Dish</th><th>Sold</th><th>Revenue</th>
              </tr>
            </thead>
            <tbody>
              {dishes.topSellers.map((d) => (
                <tr key={d._id} className="border-b last:border-0">
                  <td className="py-1.5">{d.name}</td>
                  <td>{d.quantitySold}</td>
                  <td>₹{d.revenue}</td>
                </tr>
              ))}
              {dishes.topSellers.length === 0 && <tr><td colSpan="3" className="text-center text-gray-400 py-3">No paid orders in this range yet.</td></tr>}
            </tbody>
          </table>
        </div>

        <div className="bg-white rounded-xl shadow-card p-4">
          <h2 className="font-semibold mb-3">🥶 Least-ordered Dishes</h2>
          <p className="text-xs text-gray-500 mb-2">Consider a discount, a menu photo, or retiring these.</p>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-gray-500 border-b">
                <th className="py-1">Dish</th><th>Sold</th><th>Revenue</th>
              </tr>
            </thead>
            <tbody>
              {dishes.leastPopular.map((d) => (
                <tr key={d._id} className="border-b last:border-0">
                  <td className="py-1.5">{d.name}</td>
                  <td>{d.quantitySold}</td>
                  <td>₹{d.revenue}</td>
                </tr>
              ))}
              {dishes.leastPopular.length === 0 && <tr><td colSpan="3" className="text-center text-gray-400 py-3">No paid orders in this range yet.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
