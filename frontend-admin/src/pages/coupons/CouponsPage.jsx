import { useEffect, useState } from 'react';
import api from '../../api/axios';
import { useConfirm } from '../../components/ConfirmProvider';
import { useToast } from '../../components/ToastProvider';

const emptyForm = {
  code: '', discountPercentage: '', scope: 'all', menuItemIds: [],
  targetMode: 'all', targetCustomerPhones: [], expiresAt: '',
};

export default function CouponsPage() {
  const [coupons, setCoupons] = useState([]);
  const [menuItems, setMenuItems] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [fieldErrors, setFieldErrors] = useState({});
  const [error, setError] = useState('');
  const { confirm } = useConfirm();
  const toast = useToast();

  const load = async () => {
    const [c, m, cu] = await Promise.all([
      api.get('/coupons'), api.get('/menu'), api.get('/customers'),
    ]);
    setCoupons(c.data);
    setMenuItems(m.data);
    setCustomers(cu.data);
  };

  useEffect(() => { load(); }, []);

  const toggleMenuItem = (id) => {
    setForm((f) => ({
      ...f,
      menuItemIds: f.menuItemIds.includes(id) ? f.menuItemIds.filter((x) => x !== id) : [...f.menuItemIds, id],
    }));
  };

  const toggleCustomer = (phone) => {
    setForm((f) => ({
      ...f,
      targetCustomerPhones: f.targetCustomerPhones.includes(phone)
        ? f.targetCustomerPhones.filter((x) => x !== phone)
        : [...f.targetCustomerPhones, phone],
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    const errs = {};
    if (!form.discountPercentage) errs.discountPercentage = 'Enter a discount %';
    if (form.scope === 'specific' && form.menuItemIds.length === 0) errs.menuItemIds = 'Pick at least one dish';
    if (form.targetMode === 'specific' && form.targetCustomerPhones.length === 0) errs.targetCustomerPhones = 'Pick at least one customer';
    setFieldErrors(errs);
    if (Object.keys(errs).length) return;

    try {
      await api.post('/coupons', {
        code: form.code || undefined,
        discountPercentage: Number(form.discountPercentage),
        scope: form.scope,
        menuItemIds: form.scope === 'specific' ? form.menuItemIds : [],
        targetPhones: form.targetMode === 'specific' ? form.targetCustomerPhones : [],
        expiresAt: form.expiresAt || undefined,
      });
      setForm(emptyForm);
      setFieldErrors({});
      toast.success('Coupon created');
      load();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create coupon');
      toast.error('Failed to create coupon');
    }
  };

  const toggleActive = async (id) => {
    await api.patch(`/coupons/${id}/toggle-active`);
    toast.success('Coupon updated');
    load();
  };

  const remove = async (id) => {
    const ok = await confirm({ title: 'Delete this coupon?', message: 'This cannot be undone.', danger: true });
    if (!ok) return;
    await api.delete(`/coupons/${id}`);
    toast.success('Coupon deleted');
    load();
  };

  const dishName = (id) => menuItems.find((m) => m._id === id)?.name?.en || '—';

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-ink-900">Coupons</h1>

      <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-card p-5 space-y-4">
        <h2 className="font-semibold">Create Coupon</h2>
        <div className="grid grid-cols-2 gap-3">
          <input placeholder="Code (leave blank to auto-generate)" value={form.code}
            onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
            className="border rounded-lg px-3 py-2 uppercase" />
          <div>
            <input type="number" min="1" max="90" placeholder="Discount %" value={form.discountPercentage}
              onChange={(e) => setForm({ ...form, discountPercentage: e.target.value })}
              className="border rounded-lg px-3 py-2 w-full" />
            {fieldErrors.discountPercentage && <p className="text-red-500 text-xs mt-1">{fieldErrors.discountPercentage}</p>}
          </div>
        </div>

        <div>
          <p className="text-sm text-gray-600 mb-1.5">Applies to</p>
          <div className="flex gap-2 mb-2">
            <button type="button" onClick={() => setForm({ ...form, scope: 'all' })}
              className={`text-xs px-3 py-1.5 rounded-full font-medium ${form.scope === 'all' ? 'bg-brand-600 text-white' : 'bg-gray-100 text-gray-600'}`}>
              All dishes
            </button>
            <button type="button" onClick={() => setForm({ ...form, scope: 'specific' })}
              className={`text-xs px-3 py-1.5 rounded-full font-medium ${form.scope === 'specific' ? 'bg-brand-600 text-white' : 'bg-gray-100 text-gray-600'}`}>
              Specific dish(es)
            </button>
          </div>
          {form.scope === 'specific' && (
            <div className="border rounded-lg p-3 max-h-40 overflow-y-auto space-y-1">
              {menuItems.map((m) => (
                <label key={m._id} className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={form.menuItemIds.includes(m._id)} onChange={() => toggleMenuItem(m._id)} />
                  {m.name?.en} <span className="text-gray-400">₹{m.price}</span>
                </label>
              ))}
              {menuItems.length === 0 && <p className="text-xs text-gray-400">No dishes yet.</p>}
            </div>
          )}
          {fieldErrors.menuItemIds && <p className="text-red-500 text-xs mt-1">{fieldErrors.menuItemIds}</p>}
        </div>

        <div>
          <p className="text-sm text-gray-600 mb-1.5">Available to</p>
          <div className="flex gap-2 mb-2">
            <button type="button" onClick={() => setForm({ ...form, targetMode: 'all' })}
              className={`text-xs px-3 py-1.5 rounded-full font-medium ${form.targetMode === 'all' ? 'bg-brand-600 text-white' : 'bg-gray-100 text-gray-600'}`}>
              All customers
            </button>
            <button type="button" onClick={() => setForm({ ...form, targetMode: 'specific' })}
              className={`text-xs px-3 py-1.5 rounded-full font-medium ${form.targetMode === 'specific' ? 'bg-brand-600 text-white' : 'bg-gray-100 text-gray-600'}`}>
              Specific customer(s)
            </button>
          </div>
          {form.targetMode === 'specific' && (
            <div className="border rounded-lg p-3 max-h-40 overflow-y-auto space-y-1">
              {customers.map((c) => (
                <label key={c._id} className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={form.targetCustomerPhones.includes(c.phone)} onChange={() => toggleCustomer(c.phone)} />
                  {c.name} <span className="text-gray-400">{c.phone} · {c.totalOrders} orders</span>
                </label>
              ))}
              {customers.length === 0 && <p className="text-xs text-gray-400">No customers yet.</p>}
            </div>
          )}
          {fieldErrors.targetCustomerPhones && <p className="text-red-500 text-xs mt-1">{fieldErrors.targetCustomerPhones}</p>}
        </div>

        <div>
          <label className="block text-sm text-gray-600 mb-1">Expires on (optional)</label>
          <input type="date" value={form.expiresAt} onChange={(e) => setForm({ ...form, expiresAt: e.target.value })}
            className="border rounded-lg px-3 py-2" />
        </div>

        {error && <p className="text-red-500 text-sm">{error}</p>}
        <button className="bg-brand-600 text-white px-5 py-2.5 rounded-lg font-medium hover:bg-brand-700">Create Coupon</button>
      </form>

      <div className="bg-white rounded-xl shadow-card p-5">
        <h2 className="font-semibold mb-3">All Coupons</h2>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-gray-500 border-b">
              <th className="py-1">Code</th><th>Discount</th><th>Applies to</th><th>Target</th><th>Used</th><th>Active</th><th></th>
            </tr>
          </thead>
          <tbody>
            {coupons.map((c) => (
              <tr key={c._id} className="border-b last:border-0">
                <td className="py-1.5 font-mono font-semibold">{c.code} {c.isAutoGenerated && <span className="text-[10px] text-purple-600 ml-1">auto</span>}</td>
                <td>{c.discountPercentage}%</td>
                <td>{c.scope === 'all' ? 'All dishes' : c.menuItemIds.map(dishName).join(', ')}</td>
                <td>{c.targetPhones.length === 0 ? 'Everyone' : `${c.targetPhones.length} customer(s)`}</td>
                <td>{c.usedBy.length}</td>
                <td>{c.isActive ? 'Yes' : 'No'}</td>
                <td className="space-x-2 whitespace-nowrap">
                  <button onClick={() => toggleActive(c._id)} className="text-brand-600 hover:underline">
                    {c.isActive ? 'Deactivate' : 'Activate'}
                  </button>
                  <button onClick={() => remove(c._id)} className="text-red-500 hover:underline">Delete</button>
                </td>
              </tr>
            ))}
            {coupons.length === 0 && <tr><td colSpan="7" className="text-center text-gray-400 py-3">No coupons yet.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
