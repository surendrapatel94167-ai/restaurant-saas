import { useState } from 'react';
import api from '../../api/axios';
import PasswordInput from '../../components/PasswordInput';
import { useToast } from '../../components/ToastProvider';

const emptyForm = {
  hotelName: '', slug: '', ownerName: '', contactEmail: '', contactPhone: '', address: '',
  adminName: '', adminPassword: '', tableCount: 10, trialDays: 5,
};

export default function AddHotelPage() {
  const [form, setForm] = useState(emptyForm);
  const [fieldErrors, setFieldErrors] = useState({});
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);
  const toast = useToast();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setResult(null);
    const errs = {};
    if (!form.hotelName.trim()) errs.hotelName = 'Hotel name is required';
    if (!form.slug.trim()) errs.slug = 'Slug is required';
    if (!form.contactEmail.trim()) errs.contactEmail = 'Contact email is required';
    if (!form.adminName.trim()) errs.adminName = 'Admin login name is required';
    if (!form.adminPassword.trim()) errs.adminPassword = 'Set a password';
    else if (form.adminPassword.length < 6) errs.adminPassword = 'At least 6 characters';
    setFieldErrors(errs);
    if (Object.keys(errs).length) return;

    try {
      const { data } = await api.post('/super-admin/tenants', { ...form, tableCount: Number(form.tableCount), trialDays: Number(form.trialDays) });
      setResult(data);
      setForm(emptyForm);
      setFieldErrors({});
      toast.success('Hotel onboarded successfully');
    } catch (err) {
      setError(err.response?.data?.message || 'Onboarding failed');
      toast.error('Onboarding failed');
    }
  };

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-bold text-ink-900 mb-1">Add Hotel / Restaurant</h1>
      <p className="text-sm text-gray-500 mb-5">Onboard a new restaurant — creates their admin login and prints table QR codes.</p>

      <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-card p-5 grid grid-cols-2 gap-3">
        <div>
          <input placeholder="Hotel name" value={form.hotelName} onChange={(e) => setForm({ ...form, hotelName: e.target.value })} className="border rounded-lg px-3 py-2 w-full" />
          {fieldErrors.hotelName && <p className="text-red-500 text-xs mt-1">{fieldErrors.hotelName}</p>}
        </div>
        <div>
          <input placeholder="Slug (url-safe, unique)" value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} className="border rounded-lg px-3 py-2 w-full" />
          {fieldErrors.slug && <p className="text-red-500 text-xs mt-1">{fieldErrors.slug}</p>}
        </div>
        <input placeholder="Owner name" value={form.ownerName} onChange={(e) => setForm({ ...form, ownerName: e.target.value })} className="border rounded-lg px-3 py-2" />
        <input placeholder="Contact phone" value={form.contactPhone} onChange={(e) => setForm({ ...form, contactPhone: e.target.value })} className="border rounded-lg px-3 py-2" />
        <div className="col-span-2">
          <input placeholder="Contact email" type="email" value={form.contactEmail} onChange={(e) => setForm({ ...form, contactEmail: e.target.value })} className="border rounded-lg px-3 py-2 w-full" />
          {fieldErrors.contactEmail && <p className="text-red-500 text-xs mt-1">{fieldErrors.contactEmail}</p>}
        </div>
        <input placeholder="Address" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} className="border rounded-lg px-3 py-2 col-span-2" />

        <div>
          <input placeholder="Admin login name" value={form.adminName} onChange={(e) => setForm({ ...form, adminName: e.target.value })} className="border rounded-lg px-3 py-2 w-full" />
          {fieldErrors.adminName && <p className="text-red-500 text-xs mt-1">{fieldErrors.adminName}</p>}
        </div>
        <div>
          <PasswordInput placeholder="Admin password" value={form.adminPassword} onChange={(e) => setForm({ ...form, adminPassword: e.target.value })} className="border rounded-lg px-3 py-2 w-full" />
          {fieldErrors.adminPassword && <p className="text-red-500 text-xs mt-1">{fieldErrors.adminPassword}</p>}
        </div>

        <input placeholder="Number of tables" type="number" value={form.tableCount} onChange={(e) => setForm({ ...form, tableCount: e.target.value })} className="border rounded-lg px-3 py-2" />
        <div>
          <label className="block text-xs text-gray-500 mb-1">Trial period (days)</label>
          <input placeholder="Trial days" type="number" min="1" value={form.trialDays} onChange={(e) => setForm({ ...form, trialDays: e.target.value })} className="border rounded-lg px-3 py-2 w-full" />
        </div>
        <button className="col-span-2 bg-brand-600 text-white py-2.5 rounded-lg font-medium hover:bg-brand-700">Onboard Hotel</button>
        {error && <p className="col-span-2 text-red-500 text-sm">{error}</p>}
      </form>

      {result && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-5 mt-6">
          <p className="font-semibold text-green-700 mb-3">
            Onboarded {result.tenant.hotelName} — {result.tables.length} table QR codes generated.
          </p>
          <div className="grid grid-cols-4 md:grid-cols-6 gap-2 max-h-56 overflow-y-auto">
            {result.tables.map((t) => (
              <div key={t.tableNumber} className="text-xs text-center">
                <img src={t.qrDataUrl} alt={`Table ${t.tableNumber}`} className="w-16 h-16 mx-auto" />
                Table {t.tableNumber}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
