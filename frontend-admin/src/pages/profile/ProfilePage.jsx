import { useEffect, useState } from 'react';
import api from '../../api/axios';
import { useToast } from '../../components/ToastProvider';

function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export default function ProfilePage() {
  const [tenant, setTenant] = useState(null);
  const [saving, setSaving] = useState(false);
  const toast = useToast();
  const [savedMsg, setSavedMsg] = useState('');

  const load = async () => {
    const { data } = await api.get('/tenant/me');
    setTenant(data);
  };

  useEffect(() => { load(); }, []);

  const handleLogo = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const dataUrl = await fileToDataUrl(file);
    setTenant((t) => ({ ...t, logoUrl: dataUrl }));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setSavedMsg('');
    try {
      await api.put('/tenant/me', {
        hotelName: tenant.hotelName,
        logoUrl: tenant.logoUrl,
        address: tenant.address,
        settings: {
          instagramUrl: tenant.settings?.instagramUrl,
          facebookUrl: tenant.settings?.facebookUrl,
          websiteUrl: tenant.settings?.websiteUrl,
          whatsappBusinessNumber: tenant.settings?.whatsappBusinessNumber,
          contactPhoneDisplay: tenant.settings?.contactPhoneDisplay,
          upiId: tenant.settings?.upiId,
        },
      });
      setSavedMsg('Saved!');
      toast.success('Restaurant profile updated');
      setTimeout(() => setSavedMsg(''), 2000);
    } catch (err) {
      toast.error('Failed to save changes');
    } finally {
      setSaving(false);
    }
  };

  if (!tenant) return <p className="text-gray-500">Loading…</p>;

  const set = (path, value) => {
    setTenant((t) => {
      const copy = { ...t, settings: { ...t.settings } };
      if (path.startsWith('settings.')) copy.settings[path.split('.')[1]] = value;
      else copy[path] = value;
      return copy;
    });
  };

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-bold text-ink-900 mb-1">Restaurant Profile</h1>
      <p className="text-sm text-gray-500 mb-5">Logo, social links and payment details shown to guests.</p>

      <form onSubmit={handleSave} className="bg-white rounded-xl shadow-card p-5 space-y-4">
        <div className="flex items-center gap-4">
          {tenant.logoUrl ? (
            <img src={tenant.logoUrl} alt="logo" className="w-16 h-16 rounded-xl object-cover" />
          ) : (
            <div className="w-16 h-16 rounded-xl bg-gray-100 flex items-center justify-center text-2xl">🏪</div>
          )}
          <div>
            <label className="block text-sm text-gray-600 mb-1">Logo</label>
            <input type="file" accept="image/*" onChange={handleLogo} className="text-sm" />
          </div>
        </div>

        <div>
          <label className="block text-sm text-gray-600 mb-1">Restaurant name</label>
          <input value={tenant.hotelName || ''} onChange={(e) => set('hotelName', e.target.value)}
            className="w-full border rounded-lg px-3 py-2" />
        </div>
        <div>
          <label className="block text-sm text-gray-600 mb-1">Address</label>
          <input value={tenant.address || ''} onChange={(e) => set('address', e.target.value)}
            className="w-full border rounded-lg px-3 py-2" />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-gray-600 mb-1">Instagram URL</label>
            <input value={tenant.settings?.instagramUrl || ''} onChange={(e) => set('settings.instagramUrl', e.target.value)}
              placeholder="https://instagram.com/yourrestaurant" className="w-full border rounded-lg px-3 py-2" />
          </div>
          <div>
            <label className="block text-sm text-gray-600 mb-1">Facebook URL</label>
            <input value={tenant.settings?.facebookUrl || ''} onChange={(e) => set('settings.facebookUrl', e.target.value)}
              className="w-full border rounded-lg px-3 py-2" />
          </div>
          <div>
            <label className="block text-sm text-gray-600 mb-1">Contact phone (shown to guests)</label>
            <input value={tenant.settings?.contactPhoneDisplay || ''} onChange={(e) => set('settings.contactPhoneDisplay', e.target.value)}
              className="w-full border rounded-lg px-3 py-2" />
          </div>
          <div>
            <label className="block text-sm text-gray-600 mb-1">WhatsApp Business number</label>
            <input value={tenant.settings?.whatsappBusinessNumber || ''} onChange={(e) => set('settings.whatsappBusinessNumber', e.target.value)}
              placeholder="Bills are sent from this number" className="w-full border rounded-lg px-3 py-2" />
          </div>
          <div className="col-span-2">
            <label className="block text-sm text-gray-600 mb-1">UPI ID (for the payment QR)</label>
            <input value={tenant.settings?.upiId || ''} onChange={(e) => set('settings.upiId', e.target.value)}
              placeholder="yourrestaurant@upi" className="w-full border rounded-lg px-3 py-2" />
          </div>
        </div>

        <button disabled={saving} className="bg-brand-600 text-white px-5 py-2.5 rounded-lg font-medium hover:bg-brand-700 disabled:opacity-60">
          {saving ? 'Saving…' : 'Save changes'}
        </button>
        {savedMsg && <span className="ml-3 text-green-600 text-sm font-medium">{savedMsg}</span>}
      </form>
    </div>
  );
}
