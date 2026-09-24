import { useEffect, useState } from 'react';
import api from '../../api/axios';

const PLANS = ['trial', 'basic', 'pro', 'enterprise'];

function SubscriptionRow({ t, onSave }) {
  const [plan, setPlan] = useState(t.subscription?.plan || 'trial');
  const [billingCycle, setBillingCycle] = useState(t.subscription?.billingCycle || 'monthly');
  const [status, setStatus] = useState(t.subscription?.status || 'active');
  const [endDate, setEndDate] = useState(t.subscription?.endDate ? t.subscription.endDate.slice(0, 10) : '');

  const daysLeft = t.subscription?.endDate
    ? Math.ceil((new Date(t.subscription.endDate) - new Date()) / (1000 * 60 * 60 * 24))
    : null;

  return (
    <tr className="border-b last:border-0">
      <td className="py-1.5">{t.hotelName}</td>
      <td>{t.slug}</td>
      <td>
        <select value={plan} onChange={(e) => setPlan(e.target.value)} className="border rounded px-1 py-0.5 text-xs">
          {PLANS.map((p) => <option key={p} value={p}>{p}</option>)}
        </select>
      </td>
      <td>
        <select value={billingCycle} onChange={(e) => setBillingCycle(e.target.value)} className="border rounded px-1 py-0.5 text-xs">
          <option value="monthly">Monthly</option>
          <option value="yearly">Yearly</option>
        </select>
      </td>
      <td>
        <select value={status} onChange={(e) => setStatus(e.target.value)} className="border rounded px-1 py-0.5 text-xs">
          <option value="active">Active</option>
          <option value="expired">Expired</option>
          <option value="cancelled">Cancelled</option>
        </select>
      </td>
      <td>
        <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="border rounded px-1 py-0.5 text-xs" />
        {daysLeft !== null && daysLeft <= 5 && daysLeft >= 0 && (
          <span className="block text-[10px] text-red-600 font-medium">{daysLeft}d left</span>
        )}
      </td>
      <td>{t.isActive ? 'Yes' : 'No'}</td>
      <td className="space-x-2">
        <button onClick={() => onSave(t._id, { plan, billingCycle, status, endDate })} className="text-brand-600 hover:underline text-xs">Save</button>
      </td>
    </tr>
  );
}

export default function SuperAdminPage() {
  const [tenants, setTenants] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [tab, setTab] = useState('all'); // all | monthly | yearly
  const [form, setForm] = useState({
    hotelName: '', slug: '', contactEmail: '', contactPhone: '',
    adminName: '', adminPassword: '', tableCount: 10,
  });
  const [error, setError] = useState('');
  const [onboardResult, setOnboardResult] = useState(null);

  const load = async () => {
    const [t, n] = await Promise.all([
      api.get('/super-admin/tenants'),
      api.get('/notifications/super-admin'),
    ]);
    setTenants(t.data);
    setNotifications(n.data);
  };

  useEffect(() => { load(); }, []);

  const handleOnboard = async (e) => {
    e.preventDefault();
    setError('');
    setOnboardResult(null);
    try {
      const { data } = await api.post('/super-admin/tenants', { ...form, tableCount: Number(form.tableCount) });
      setOnboardResult(data);
      setForm({ hotelName: '', slug: '', contactEmail: '', contactPhone: '', adminName: '', adminPassword: '', tableCount: 10 });
      load();
    } catch (err) {
      setError(err.response?.data?.message || 'Onboarding failed');
    }
  };

  const toggleActive = async (tenantId) => {
    await api.patch(`/super-admin/tenants/${tenantId}/toggle-active`);
    load();
  };

  const saveSubscription = async (tenantId, payload) => {
    await api.patch(`/super-admin/tenants/${tenantId}/subscription`, payload);
    load();
  };

  const visibleTenants = tenants.filter((t) => {
    if (tab === 'monthly') return (t.subscription?.billingCycle || 'monthly') === 'monthly';
    if (tab === 'yearly') return t.subscription?.billingCycle === 'yearly';
    return true;
  });

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Super Admin — Tenant Management</h1>

      {notifications.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
          <p className="font-semibold text-amber-800 mb-2">🔔 Subscription Alerts</p>
          <ul className="text-sm space-y-1">
            {notifications.slice(0, 8).map((n) => (
              <li key={n._id} className="text-amber-700">{n.message}</li>
            ))}
          </ul>
        </div>
      )}

      <form onSubmit={handleOnboard} className="bg-white rounded-lg shadow p-4 grid grid-cols-2 gap-3">
        <input placeholder="Hotel name" value={form.hotelName} onChange={(e) => setForm({ ...form, hotelName: e.target.value })} className="border rounded px-2 py-1" required />
        <input placeholder="Slug (url-safe, unique)" value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} className="border rounded px-2 py-1" required />
        <input placeholder="Contact email" type="email" value={form.contactEmail} onChange={(e) => setForm({ ...form, contactEmail: e.target.value })} className="border rounded px-2 py-1" required />
        <input placeholder="Contact phone" value={form.contactPhone} onChange={(e) => setForm({ ...form, contactPhone: e.target.value })} className="border rounded px-2 py-1" />
        <input placeholder="Admin name" value={form.adminName} onChange={(e) => setForm({ ...form, adminName: e.target.value })} className="border rounded px-2 py-1" required />
        <input placeholder="Admin password" type="password" value={form.adminPassword} onChange={(e) => setForm({ ...form, adminPassword: e.target.value })} className="border rounded px-2 py-1" required />
        <input placeholder="Number of tables" type="number" value={form.tableCount} onChange={(e) => setForm({ ...form, tableCount: e.target.value })} className="border rounded px-2 py-1" />
        <button className="col-span-2 bg-brand-600 text-white py-2 rounded hover:bg-brand-700">Onboard Hotel</button>
        {error && <p className="col-span-2 text-red-500 text-sm">{error}</p>}
      </form>

      {onboardResult && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <p className="font-semibold text-green-700 mb-2">
            Onboarded {onboardResult.tenant.hotelName} — {onboardResult.tables.length} table QR codes generated.
          </p>
          <div className="grid grid-cols-4 gap-2 max-h-48 overflow-y-auto">
            {onboardResult.tables.map((t) => (
              <div key={t.tableNumber} className="text-xs text-center">
                <img src={t.qrDataUrl} alt={`Table ${t.tableNumber}`} className="w-16 h-16 mx-auto" />
                Table {t.tableNumber}
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="bg-white rounded-lg shadow p-4">
        <div className="flex justify-between items-center mb-3">
          <h2 className="font-semibold">All Tenants</h2>
          <div className="flex gap-1">
            {['all', 'monthly', 'yearly'].map((tb) => (
              <button key={tb} onClick={() => setTab(tb)}
                className={`text-xs px-3 py-1 rounded-full capitalize ${tab === tb ? 'bg-brand-600 text-white' : 'bg-gray-100 text-gray-600'}`}>
                {tb}
              </button>
            ))}
          </div>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-gray-500 border-b">
              <th className="py-1">Hotel</th><th>Slug</th><th>Plan</th><th>Cycle</th><th>Status</th><th>Ends</th><th>Active</th><th></th>
            </tr>
          </thead>
          <tbody>
            {visibleTenants.map((t) => (
              <SubscriptionRow key={t._id} t={t} onSave={saveSubscription} />
            ))}
          </tbody>
        </table>
        <div className="mt-3 flex flex-wrap gap-3">
          {visibleTenants.map((t) => (
            <button key={t._id} onClick={() => toggleActive(t._id)} className="text-xs text-red-500 hover:underline">
              {t.isActive ? `Deactivate ${t.hotelName}` : `Activate ${t.hotelName}`}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
