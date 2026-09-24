import { useEffect, useState } from 'react';
import api from '../../api/axios';

export default function SuperAdminDashboard() {
  const [tenants, setTenants] = useState([]);
  const [notifications, setNotifications] = useState([]);

  useEffect(() => {
    api.get('/super-admin/tenants').then(({ data }) => setTenants(data));
    api.get('/notifications/super-admin').then(({ data }) => setNotifications(data));
  }, []);

  const active = tenants.filter((t) => t.isActive).length;
  const trialCount = tenants.filter((t) => (t.subscription?.plan || 'trial') === 'trial').length;
  const monthly = tenants.filter((t) => t.subscription?.plan === 'monthly').length;
  const yearly = tenants.filter((t) => t.subscription?.plan === 'yearly').length;
  const totalTables = tenants.reduce((s, t) => s + (t.tableCount || 0), 0);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-ink-900">Dashboard</h1>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="bg-white rounded-xl shadow-card p-4">
          <p className="text-gray-500 text-sm">Total Hotels</p>
          <p className="text-2xl font-bold text-ink-900">{tenants.length}</p>
        </div>
        <div className="bg-white rounded-xl shadow-card p-4">
          <p className="text-gray-500 text-sm">Active</p>
          <p className="text-2xl font-bold text-green-600">{active}</p>
        </div>
        <div className="bg-white rounded-xl shadow-card p-4">
          <p className="text-gray-500 text-sm">Trial</p>
          <p className="text-2xl font-bold text-gray-600">{trialCount}</p>
        </div>
        <div className="bg-white rounded-xl shadow-card p-4">
          <p className="text-gray-500 text-sm">Monthly / Yearly</p>
          <p className="text-2xl font-bold text-brand-600">{monthly} / {yearly}</p>
        </div>
        <div className="bg-white rounded-xl shadow-card p-4">
          <p className="text-gray-500 text-sm">Tables (QRs) issued</p>
          <p className="text-2xl font-bold text-ink-900">{totalTables}</p>
        </div>
      </div>

      <div className="bg-amber-50 border border-amber-200 rounded-xl p-5">
        <p className="font-semibold text-amber-800 mb-2">🔔 Subscription Alerts</p>
        {notifications.length === 0 && <p className="text-sm text-amber-700">No alerts right now.</p>}
        <ul className="text-sm space-y-1">
          {notifications.slice(0, 10).map((n) => (
            <li key={n._id} className="text-amber-700">{n.message}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}
