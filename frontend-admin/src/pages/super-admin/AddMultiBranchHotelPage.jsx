import { useState } from 'react';
import { validatePassword } from '../../utils/validators';
import api from '../../api/axios';
import PasswordInput from '../../components/PasswordInput';
import { useToast } from '../../components/ToastProvider';

const emptyBranch = { hotelName: '', slug: '', address: '', contactPhone: '', tableCount: 10 };

export default function AddMultiBranchHotelPage() {
  const [owner, setOwner] = useState({ ownerName: '', adminName: '', contactEmail: '', contactPhone: '', adminPassword: '', trialDays: 5 });
  const [branches, setBranches] = useState([{ ...emptyBranch }, { ...emptyBranch }]);
  const [fieldErrors, setFieldErrors] = useState({});
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);
  const toast = useToast();

  const updateBranch = (i, field, value) => {
    setBranches((prev) => prev.map((b, idx) => (idx === i ? { ...b, [field]: value } : b)));
  };

  const addBranch = () => setBranches((prev) => [...prev, { ...emptyBranch }]);
  const removeBranch = (i) => setBranches((prev) => prev.filter((_, idx) => idx !== i));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(''); setResult(null);

    const errs = {};
    if (!owner.adminName.trim()) errs.adminName = 'Admin login name is required';
    if (!owner.contactEmail.trim()) errs.contactEmail = 'Contact email is required';
    if (validatePassword(owner.adminPassword)) errs.adminPassword = validatePassword(owner.adminPassword);
    branches.forEach((b, i) => {
      if (!b.hotelName.trim()) errs[`branch_${i}_hotelName`] = 'Required';
      if (!b.slug.trim()) errs[`branch_${i}_slug`] = 'Required';
    });
    setFieldErrors(errs);
    if (Object.keys(errs).length) return;

    try {
      const { data } = await api.post('/super-admin/tenants/multi-branch', {
        ...owner,
        trialDays: Number(owner.trialDays),
        branches: branches.map((b) => ({ ...b, tableCount: Number(b.tableCount) })),
      });
      setResult(data);
      setOwner({ ownerName: '', adminName: '', contactEmail: '', contactPhone: '', adminPassword: '', trialDays: 5 });
      setBranches([{ ...emptyBranch }, { ...emptyBranch }]);
      setFieldErrors({});
      toast.success('Branches onboarded successfully');
    } catch (err) {
      setError(err.response?.data?.message || 'Onboarding failed');
      toast.error('Onboarding failed');
    }
  };

  return (
    <div className="max-w-3xl">
      <h1 className="text-2xl font-bold text-ink-900 mb-1">Add Multiple Restaurants (Same Owner)</h1>
      <p className="text-sm text-gray-500 mb-5">
        For an owner starting with 2+ restaurants at once — ONE admin login for the owner, but each branch gets its
        own tables, QR codes, location and staff. Managers/staff are added separately per-branch afterward.
      </p>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="bg-white rounded-xl shadow-card p-5">
          <h2 className="font-semibold mb-3">Owner / Admin login (shared across all branches)</h2>
          <div className="grid grid-cols-2 gap-3">
            <input placeholder="Owner name" value={owner.ownerName} onChange={(e) => setOwner({ ...owner, ownerName: e.target.value })} className="border rounded-lg px-3 py-2" />
            <div>
              <input placeholder="Admin login name" value={owner.adminName} onChange={(e) => setOwner({ ...owner, adminName: e.target.value })} className="border rounded-lg px-3 py-2 w-full" />
              {fieldErrors.adminName && <p className="text-red-500 text-xs mt-1">{fieldErrors.adminName}</p>}
            </div>
            <div>
              <input placeholder="Contact email (login email)" type="email" value={owner.contactEmail} onChange={(e) => setOwner({ ...owner, contactEmail: e.target.value })} className="border rounded-lg px-3 py-2 w-full" />
              {fieldErrors.contactEmail && <p className="text-red-500 text-xs mt-1">{fieldErrors.contactEmail}</p>}
            </div>
            <input placeholder="Contact phone" value={owner.contactPhone} onChange={(e) => setOwner({ ...owner, contactPhone: e.target.value })} className="border rounded-lg px-3 py-2" />
            <div className="col-span-2">
              <PasswordInput placeholder="Admin password" value={owner.adminPassword} onChange={(e) => setOwner({ ...owner, adminPassword: e.target.value })} className="border rounded-lg px-3 py-2 w-full" />
              {fieldErrors.adminPassword && <p className="text-red-500 text-xs mt-1">{fieldErrors.adminPassword}</p>}
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Trial period (days)</label>
              <input placeholder="Trial days" type="number" min="1" value={owner.trialDays} onChange={(e) => setOwner({ ...owner, trialDays: e.target.value })} className="border rounded-lg px-3 py-2 w-full" />
            </div>
          </div>
        </div>

        {branches.map((b, i) => (
          <div key={i} className="bg-white rounded-xl shadow-card p-5">
            <div className="flex justify-between items-center mb-3">
              <h2 className="font-semibold">Branch {i + 1}</h2>
              {branches.length > 2 && (
                <button type="button" onClick={() => removeBranch(i)} className="text-red-500 text-xs hover:underline">Remove</button>
              )}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <input placeholder="Hotel name" value={b.hotelName} onChange={(e) => updateBranch(i, 'hotelName', e.target.value)} className="border rounded-lg px-3 py-2 w-full" />
                {fieldErrors[`branch_${i}_hotelName`] && <p className="text-red-500 text-xs mt-1">{fieldErrors[`branch_${i}_hotelName`]}</p>}
              </div>
              <div>
                <input placeholder="Slug (unique)" value={b.slug} onChange={(e) => updateBranch(i, 'slug', e.target.value)} className="border rounded-lg px-3 py-2 w-full" />
                {fieldErrors[`branch_${i}_slug`] && <p className="text-red-500 text-xs mt-1">{fieldErrors[`branch_${i}_slug`]}</p>}
              </div>
              <input placeholder="Location / address" value={b.address} onChange={(e) => updateBranch(i, 'address', e.target.value)} className="border rounded-lg px-3 py-2" />
              <input placeholder="Branch phone (optional)" value={b.contactPhone} onChange={(e) => updateBranch(i, 'contactPhone', e.target.value)} className="border rounded-lg px-3 py-2" />
              <input type="number" placeholder="Number of tables" value={b.tableCount} onChange={(e) => updateBranch(i, 'tableCount', e.target.value)} className="border rounded-lg px-3 py-2 col-span-2" />
            </div>
          </div>
        ))}

        <button type="button" onClick={addBranch} className="text-brand-600 text-sm font-medium hover:underline">
          + Add another branch
        </button>

        <div>
          <button className="bg-brand-600 text-white px-5 py-2.5 rounded-lg font-medium hover:bg-brand-700">
            Onboard {branches.length} Restaurants
          </button>
          {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
        </div>
      </form>

      {result && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-5 mt-6 space-y-4">
          <p className="font-semibold text-green-700">
            Onboarded {result.branches.length} branches under one admin login ({result.admin.email}).
          </p>
          {result.branches.map((b) => (
            <div key={b.tenant._id}>
              <p className="text-sm font-medium text-ink-900 mb-1">{b.tenant.hotelName} — {b.tables.length} tables</p>
              <div className="grid grid-cols-6 md:grid-cols-8 gap-2 max-h-32 overflow-y-auto">
                {b.tables.map((t) => (
                  <div key={t.tableNumber} className="text-xs text-center">
                    <img src={t.qrDataUrl} alt={`Table ${t.tableNumber}`} className="w-12 h-12 mx-auto" />
                    {t.tableNumber}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
