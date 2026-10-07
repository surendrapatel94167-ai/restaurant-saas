import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { BellRing, ChevronDown, ChevronRight, Phone, MessageCircle, Search } from 'lucide-react';
import api from '../../api/axios';
import { useConfirm } from '../../components/ConfirmProvider';
import { useToast } from '../../components/ToastProvider';
import { enablePush, pushPermission, pushSupported, refreshPushSubscription } from '../../utils/push';

const ROLE_LABEL = { hotel_admin: 'Admin', manager: 'Manager', chef: 'Chef', waiter: 'Waiter', cashier: 'Cashier' };

function ContactLinks({ phone }) {
  if (!phone) return <span className="text-gray-400">no number</span>;
  return (
    <span className="inline-flex items-center gap-2">
      <a href={`tel:${phone}`} className="text-brand-600 hover:underline inline-flex items-center gap-1"><Phone size={12} />{phone}</a>
      <a href={`https://wa.me/91${phone}`} target="_blank" rel="noopener noreferrer" className="text-green-600 hover:underline inline-flex items-center gap-1">
        <MessageCircle size={12} />WhatsApp
      </a>
    </span>
  );
}

function HotelCard({ hotel, open, onToggle }) {
  const staffByRole = hotel.staff.filter((s) => s.role !== 'hotel_admin');
  const sub = hotel.subscription || {};
  return (
    <div className="bg-white rounded-xl shadow-card">
      <button onClick={onToggle} className="w-full flex items-center gap-2 p-4 text-left">
        {open ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-ink-900 truncate">{hotel.hotelName}
            {!hotel.isActive && <span className="ml-2 text-[10px] bg-red-100 text-red-700 px-1.5 py-0.5 rounded-full">Deactivated</span>}
          </p>
          <p className="text-xs text-gray-500">
            {staffByRole.length} staff · {hotel.customers.length} customers · {sub.plan || 'trial'} ({sub.status || 'active'})
          </p>
        </div>
      </button>

      {open && (
        <div className="px-4 pb-4 text-sm space-y-4 border-t pt-3">
          {/* Paragraph-style summary */}
          <p className="text-gray-700 leading-relaxed">
            <strong>{hotel.hotelName}</strong>{hotel.address ? ` (${hotel.address})` : ''} is managed by{' '}
            {hotel.admin ? <><strong>{hotel.admin.name}</strong> — {hotel.admin.email}, <ContactLinks phone={hotel.admin.phone} /></> : 'no admin yet'}.
            It has {staffByRole.length} staff member{staffByRole.length === 1 ? '' : 's'} and {hotel.customers.length} customer{hotel.customers.length === 1 ? '' : 's'}.
          </p>

          <div>
            <p className="font-medium text-ink-900 mb-1">Staff</p>
            {staffByRole.length === 0 && <p className="text-gray-400 text-xs">No staff added.</p>}
            <ul className="space-y-1">
              {staffByRole.map((s) => (
                <li key={s._id} className="text-gray-700">
                  <strong>{s.name}</strong> <span className="text-xs text-gray-400">({ROLE_LABEL[s.role] || s.role}{s.isActive ? '' : ', blocked'})</span>
                  {' · '}<span className="text-xs text-gray-500">{s.email}</span>{' · '}<ContactLinks phone={s.phone} />
                </li>
              ))}
            </ul>
          </div>

          <div>
            <p className="font-medium text-ink-900 mb-1">Customers</p>
            {hotel.customers.length === 0 && <p className="text-gray-400 text-xs">No customers yet.</p>}
            <ul className="space-y-1 max-h-64 overflow-y-auto">
              {hotel.customers.map((c) => (
                <li key={c._id} className="text-gray-700">
                  <strong>{c.name}</strong> <span className="text-xs text-gray-400">({c.totalOrders || 0} order{c.totalOrders === 1 ? '' : 's'})</span>
                  {' · '}<ContactLinks phone={c.phone} />
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}

export default function SuperAdminDashboard() {
  const [tenants, setTenants] = useState([]);
  const [overview, setOverview] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [openId, setOpenId] = useState(null);
  const [query, setQuery] = useState('');
  const [pushState, setPushState] = useState(pushPermission());
  const { confirm } = useConfirm();
  const toast = useToast();

  const loadNotifications = () => api.get('/notifications/super-admin').then(({ data }) => setNotifications(data)).catch(() => {});

  useEffect(() => {
    api.get('/super-admin/tenants').then(({ data }) => setTenants(data)).catch(() => {});
    api.get('/super-admin/overview').then(({ data }) => setOverview(data)).catch(() => toast.error('Could not load hotel details'));
    loadNotifications();
    refreshPushSubscription();
  }, []);

  const active = tenants.filter((t) => t.isActive).length;
  const trialCount = tenants.filter((t) => (t.subscription?.plan || 'trial') === 'trial').length;
  const monthly = tenants.filter((t) => t.subscription?.plan === 'monthly').length;
  const yearly = tenants.filter((t) => t.subscription?.plan === 'yearly').length;
  const totalTables = tenants.reduce((s, t) => s + (t.tableCount || 0), 0);

  const paymentAlerts = notifications.filter((n) => n.type === 'subscription_payment_pending');
  const pendingTenants = tenants.filter((t) => t.subscription?.status === 'pending_approval');
  const deletionRequests = notifications.filter((n) => n.type === 'staff_deletion_request');
  const otherAlerts = notifications.filter((n) => !['subscription_payment_pending', 'staff_deletion_request'].includes(n.type));

  const filteredHotels = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return overview;
    return overview.filter((h) =>
      h.hotelName.toLowerCase().includes(q)
      || h.customers.some((c) => c.name?.toLowerCase().includes(q) || c.phone?.includes(q))
      || h.staff.some((s) => s.name?.toLowerCase().includes(q) || s.phone?.includes(q)));
  }, [overview, query]);

  const turnOnPush = async () => {
    try {
      await enablePush();
      setPushState('granted');
      toast.success('Push notifications enabled on this device');
    } catch (err) {
      setPushState(pushPermission());
      toast.error(err.message || 'Could not enable notifications');
    }
  };

  const dismiss = async (id) => {
    try { await api.delete(`/notifications/${id}`); setNotifications((p) => p.filter((n) => n._id !== id)); }
    catch { toast.error('Could not dismiss'); }
  };

  const approveDeletion = async (n) => {
    const ok = await confirm({
      title: `Delete ${n.meta?.name || 'this staff'}'s account?`,
      message: 'Their login will be removed permanently. This cannot be undone.',
      danger: true,
    });
    if (!ok) return;
    try {
      await api.delete(`/super-admin/staff/${n.meta.userId}`);
      toast.success('Account deleted');
      loadNotifications();
      api.get('/super-admin/overview').then(({ data }) => setOverview(data));
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not delete account');
      loadNotifications();
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-ink-900">Dashboard</h1>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="bg-white rounded-xl shadow-card p-4"><p className="text-gray-500 text-sm">Total Hotels</p><p className="text-2xl font-bold text-ink-900">{tenants.length}</p></div>
        <div className="bg-white rounded-xl shadow-card p-4"><p className="text-gray-500 text-sm">Active</p><p className="text-2xl font-bold text-green-600">{active}</p></div>
        <div className="bg-white rounded-xl shadow-card p-4"><p className="text-gray-500 text-sm">Trial</p><p className="text-2xl font-bold text-gray-600">{trialCount}</p></div>
        <div className="bg-white rounded-xl shadow-card p-4"><p className="text-gray-500 text-sm">Monthly / Yearly</p><p className="text-2xl font-bold text-brand-600">{monthly} / {yearly}</p></div>
        <div className="bg-white rounded-xl shadow-card p-4"><p className="text-gray-500 text-sm">Tables (QRs) issued</p><p className="text-2xl font-bold text-ink-900">{totalTables}</p></div>
      </div>

      {pushSupported() && pushState !== 'granted' && (
        <div className="bg-brand-50 border border-brand-200 rounded-xl p-4 flex items-center gap-3 flex-wrap">
          <BellRing size={20} className="text-brand-600" />
          <p className="text-sm text-gray-700 flex-1 min-w-[200px]">
            Get a phone notification the moment a hotel pays its subscription. Install the app and turn this on.
            {pushState === 'denied' && <span className="text-red-500 block text-xs">Notifications are blocked — allow them in your browser/site settings first.</span>}
          </p>
          <button onClick={turnOnPush} className="bg-brand-600 text-white text-sm px-4 py-2 rounded-lg font-medium hover:bg-brand-700">Enable notifications</button>
        </div>
      )}

      {/* Subscription payments — highlighted on their own */}
      <div className="bg-green-50 border-2 border-green-300 rounded-xl p-5">
        <p className="font-semibold text-green-800 mb-2">💰 Subscription Payments</p>
        {pendingTenants.length === 0 && paymentAlerts.length === 0 && <p className="text-sm text-green-700">No payments waiting for approval.</p>}
        {pendingTenants.map((t) => (
          <p key={t._id} className="text-sm text-green-900 mb-2 leading-relaxed">
            <strong>{t.hotelName}</strong> has paid for the <strong>{t.subscription.pendingPlan || 'monthly'}</strong> plan
            {t.subscription.pendingSince ? ` on ${new Date(t.subscription.pendingSince).toLocaleString()}` : ''} and is waiting for your approval.{' '}
            <Link to="/super-admin/hotels" className="text-green-700 underline font-medium">Verify &amp; approve →</Link>
          </p>
        ))}
        {paymentAlerts.length > 0 && (
          <ul className="text-xs text-green-700 mt-2 space-y-1 border-t border-green-200 pt-2">
            {paymentAlerts.slice(0, 5).map((n) => (
              <li key={n._id} className="flex gap-2"><span className="flex-1">{n.message} <span className="text-green-600/70">({new Date(n.createdAt).toLocaleString()})</span></span>
                <button onClick={() => dismiss(n._id)} className="text-green-700 hover:text-red-500" aria-label="Dismiss">&times;</button></li>
            ))}
          </ul>
        )}
      </div>

      {deletionRequests.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-5">
          <p className="font-semibold text-red-800 mb-2">🗑️ Staff Account Deletion Requests</p>
          <div className="space-y-3">
            {deletionRequests.map((n) => (
              <div key={n._id} className="bg-white rounded-lg p-3 text-sm">
                <p className="whitespace-pre-line text-gray-700">{n.message}</p>
                <div className="flex gap-2 mt-2">
                  <button onClick={() => approveDeletion(n)} className="bg-red-600 text-white text-xs px-3 py-1.5 rounded-lg font-medium hover:bg-red-700">Delete account</button>
                  <button onClick={() => dismiss(n._id)} className="bg-gray-100 text-gray-700 text-xs px-3 py-1.5 rounded-lg font-medium hover:bg-gray-200">Dismiss</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="bg-amber-50 border border-amber-200 rounded-xl p-5">
        <p className="font-semibold text-amber-800 mb-2">🔔 Other Alerts</p>
        {otherAlerts.length === 0 && <p className="text-sm text-amber-700">No alerts right now.</p>}
        <ul className="text-sm space-y-1">
          {otherAlerts.slice(0, 10).map((n) => (
            <li key={n._id} className="text-amber-700">{n.message}</li>
          ))}
        </ul>
      </div>

      <div>
        <div className="flex items-center justify-between gap-3 mb-3 flex-wrap">
          <h2 className="text-lg font-semibold text-ink-900">Hotels — admin, staff &amp; customers</h2>
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search hotel, staff or customer…"
              className="border rounded-lg pl-8 pr-3 py-1.5 text-sm bg-white w-64 max-w-full" />
          </div>
        </div>
        <div className="space-y-3">
          {filteredHotels.map((h) => (
            <HotelCard key={h._id} hotel={h} open={openId === h._id || (!!query.trim() && filteredHotels.length <= 3)}
              onToggle={() => setOpenId(openId === h._id ? null : h._id)} />
          ))}
          {filteredHotels.length === 0 && <p className="text-gray-400 text-sm">No hotels found.</p>}
        </div>
      </div>
    </div>
  );
}
