import { useEffect, useState } from 'react';
import api from '../../api/axios';
import { useConfirm } from '../../components/ConfirmProvider';

const PLANS = ['trial', 'monthly', 'yearly'];

function EditForm({ t, onCancel, onSaved }) {
  const [form, setForm] = useState({
    hotelName: t.hotelName, ownerName: t.ownerName || '', contactEmail: t.contactEmail,
    contactPhone: t.contactPhone || '', address: t.address || '',
  });
  const save = async () => {
    await api.put(`/super-admin/tenants/${t._id}`, form);
    onSaved();
  };
  return (
    <tr className="bg-brand-50">
      <td colSpan="7" className="p-3">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
          <input value={form.hotelName} onChange={(e) => setForm({ ...form, hotelName: e.target.value })} placeholder="Hotel name" className="border rounded px-2 py-1 text-xs" />
          <input value={form.ownerName} onChange={(e) => setForm({ ...form, ownerName: e.target.value })} placeholder="Owner" className="border rounded px-2 py-1 text-xs" />
          <input value={form.contactEmail} onChange={(e) => setForm({ ...form, contactEmail: e.target.value })} placeholder="Email" className="border rounded px-2 py-1 text-xs" />
          <input value={form.contactPhone} onChange={(e) => setForm({ ...form, contactPhone: e.target.value })} placeholder="Phone" className="border rounded px-2 py-1 text-xs" />
          <input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} placeholder="Address" className="border rounded px-2 py-1 text-xs" />
        </div>
        <div className="mt-2 space-x-3">
          <button onClick={save} className="text-xs text-brand-600 font-semibold hover:underline">Save</button>
          <button onClick={onCancel} className="text-xs text-gray-500 hover:underline">Cancel</button>
        </div>
      </td>
    </tr>
  );
}

function DetailRow({ tenantId }) {
  const [detail, setDetail] = useState(null);
  useEffect(() => { api.get(`/super-admin/tenants/${tenantId}`).then(({ data }) => setDetail(data)); }, [tenantId]);
  if (!detail) return <tr><td colSpan="7" className="text-xs text-gray-400 p-3">Loading…</td></tr>;
  return (
    <tr className="bg-gray-50">
      <td colSpan="7" className="p-3 text-xs text-gray-700">
        <p><strong>Address:</strong> {detail.tenant.address || '—'}</p>
        <p><strong>Admin:</strong> {detail.admin?.name} ({detail.admin?.email}, {detail.admin?.phone || 'no phone'})</p>
        <p><strong>Staff count:</strong> {detail.staffCount} &nbsp; <strong>Tables:</strong> {detail.tables.length}</p>
        <div className="flex flex-wrap gap-2 mt-2">
          {detail.tables.slice(0, 12).map((tb) => (
            <img key={tb._id} src={tb.qrCodeUrl} alt={tb.tableNumber} title={`Table ${tb.tableNumber}`} className="w-10 h-10" />
          ))}
        </div>
      </td>
    </tr>
  );
}

function SubscriptionRow({ t, onSave, onEdit, onDelete, onToggleActive, onResetPassword, expanded, onToggleExpand }) {
  const [plan, setPlan] = useState(t.subscription?.plan || 'trial');
  const [status, setStatus] = useState(t.subscription?.status || 'active');
  const [endDate, setEndDate] = useState(t.subscription?.endDate ? t.subscription.endDate.slice(0, 10) : '');

  const daysLeft = t.subscription?.endDate
    ? Math.ceil((new Date(t.subscription.endDate) - new Date()) / (1000 * 60 * 60 * 24))
    : null;

  return (
    <>
      <tr className="border-b last:border-0">
        <td className="py-1.5">{t.hotelName}<br /><span className="text-[10px] text-gray-400">{t.tableCount} tables</span></td>
        <td>{t.slug}</td>
        <td>
          <select value={plan} onChange={(e) => setPlan(e.target.value)} className="border rounded px-1 py-0.5 text-xs capitalize">
            {PLANS.map((p) => <option key={p} value={p}>{p}</option>)}
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
        <td className="space-x-2 whitespace-nowrap text-xs">
          <button onClick={() => onSave(t._id, { plan, status, endDate })} className="text-brand-600 hover:underline">Save</button>
          <button onClick={onToggleExpand} className="text-gray-500 hover:underline">{expanded ? 'Hide' : 'View'}</button>
          <button onClick={onEdit} className="text-gray-500 hover:underline">Edit</button>
          <button onClick={() => onResetPassword(t._id)} className="text-purple-600 hover:underline">Reset PW</button>
          <button onClick={() => onToggleActive(t._id)} className="text-amber-600 hover:underline">{t.isActive ? 'Deactivate' : 'Activate'}</button>
          <button onClick={() => onDelete(t._id)} className="text-red-500 hover:underline">Delete</button>
        </td>
      </tr>
      {expanded && <DetailRow tenantId={t._id} />}
    </>
  );
}

export default function AllHotelsPage() {
  const [tenants, setTenants] = useState([]);
  const [tab, setTab] = useState('all');
  const [editingId, setEditingId] = useState(null);
  const [expandedId, setExpandedId] = useState(null);
  const { confirm, prompt, notify } = useConfirm();

  const load = async () => {
    const { data } = await api.get('/super-admin/tenants');
    setTenants(data);
  };

  useEffect(() => { load(); }, []);

  const saveSubscription = async (tenantId, payload) => {
    await api.patch(`/super-admin/tenants/${tenantId}/subscription`, payload);
    load();
  };

  const toggleActive = async (tenantId) => {
    await api.patch(`/super-admin/tenants/${tenantId}/toggle-active`);
    load();
  };

  const deleteTenant = async (tenantId) => {
    const ok = await confirm({
      title: 'Delete this hotel?',
      message: 'This permanently removes the hotel and ALL its data — menu, orders, staff, everything. This cannot be undone.',
      danger: true,
    });
    if (!ok) return;
    await api.delete(`/super-admin/tenants/${tenantId}`);
    load();
  };

  const resetAdminPassword = async (tenantId) => {
    const newPassword = await prompt({
      title: 'Reset admin password',
      message: 'Set a new password for this hotel\u2019s admin login (min 6 characters).',
      inputType: 'password',
    });
    if (!newPassword) return;
    try {
      await api.post(`/super-admin/tenants/${tenantId}/reset-admin-password`, { newPassword });
      await notify({ title: 'Password reset', message: 'Share the new password with the hotel admin directly.' });
    } catch (err) {
      await notify({ title: 'Failed', message: err.response?.data?.message || 'Could not reset password' });
    }
  };

  const visible = tenants.filter((t) => {
    if (tab === 'trial') return (t.subscription?.plan || 'trial') === 'trial';
    if (tab === 'monthly') return t.subscription?.plan === 'monthly';
    if (tab === 'yearly') return t.subscription?.plan === 'yearly';
    return true;
  });

  return (
    <div className="bg-white rounded-xl shadow-card p-4 overflow-x-auto">
      <div className="flex justify-between items-center mb-3 flex-wrap gap-2">
        <h1 className="text-2xl font-bold text-ink-900">All Hotels</h1>
        <div className="flex gap-1">
          {['all', 'trial', 'monthly', 'yearly'].map((tb) => (
            <button key={tb} onClick={() => setTab(tb)}
              className={`text-xs px-3 py-1 rounded-full capitalize ${tab === tb ? 'bg-brand-600 text-white' : 'bg-gray-100 text-gray-600'}`}>
              {tb}
            </button>
          ))}
        </div>
      </div>
      <table className="w-full text-sm min-w-[720px]">
        <thead>
          <tr className="text-left text-gray-500 border-b">
            <th className="py-1">Hotel</th><th>Slug</th><th>Plan</th><th>Status</th><th>Ends</th><th>Active</th><th></th>
          </tr>
        </thead>
        <tbody>
          {visible.map((t) => (
            editingId === t._id ? (
              <EditForm key={t._id} t={t} onCancel={() => setEditingId(null)} onSaved={() => { setEditingId(null); load(); }} />
            ) : (
              <SubscriptionRow
                key={t._id} t={t}
                onSave={saveSubscription}
                onEdit={() => setEditingId(t._id)}
                onDelete={deleteTenant}
                onToggleActive={toggleActive}
                onResetPassword={resetAdminPassword}
                expanded={expandedId === t._id}
                onToggleExpand={() => setExpandedId(expandedId === t._id ? null : t._id)}
              />
            )
          ))}
          {visible.length === 0 && <tr><td colSpan="7" className="text-center text-gray-400 py-4">No hotels here.</td></tr>}
        </tbody>
      </table>
    </div>
  );
}
