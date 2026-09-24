import { useEffect, useState } from 'react';
import api from '../../api/axios';
import { useToast } from '../../components/ToastProvider';

export default function PlatformSettingsPage() {
  const [settings, setSettings] = useState(null);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');
  const toast = useToast();

  const load = async () => {
    const { data } = await api.get('/platform-settings');
    setSettings(data);
  };

  useEffect(() => { load(); }, []);

  const set = (field, value) => setSettings((s) => ({ ...s, [field]: value }));

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true); setMsg('');
    try {
      const { data } = await api.put('/platform-settings', settings);
      setSettings(data);
      setMsg('Saved!');
      toast.success('Platform settings saved');
      setTimeout(() => setMsg(''), 2000);
    } catch (err) {
      toast.error('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  if (!settings) return <p className="text-gray-500">Loading…</p>;

  return (
    <div className="max-w-xl">
      <h1 className="text-2xl font-bold text-ink-900 mb-1">Platform Settings</h1>
      <p className="text-sm text-gray-500 mb-5">Subscription pricing, promotional offers, and where restaurants pay their subscription fee.</p>

      <form onSubmit={handleSave} className="space-y-5">
        <div className="bg-white rounded-xl shadow-card p-5">
          <h2 className="font-semibold mb-3">Standard Pricing</h2>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm text-gray-600 mb-1">Monthly (₹)</label>
              <input type="number" value={settings.monthlyPrice} onChange={(e) => set('monthlyPrice', Number(e.target.value))}
                className="w-full border rounded-lg px-3 py-2" />
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">Yearly (₹)</label>
              <input type="number" value={settings.yearlyPrice} onChange={(e) => set('yearlyPrice', Number(e.target.value))}
                className="w-full border rounded-lg px-3 py-2" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-card p-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold">Special Offer</h2>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={settings.offerActive} onChange={(e) => set('offerActive', e.target.checked)} />
              Active
            </label>
          </div>
          {settings.offerActive && (
            <div className="space-y-3">
              <input placeholder="Offer message, e.g. 'This month only: 20% off!'" value={settings.offerLabel || ''}
                onChange={(e) => set('offerLabel', e.target.value)} className="w-full border rounded-lg px-3 py-2" />
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm text-gray-600 mb-1">Offer Monthly (₹)</label>
                  <input type="number" value={settings.offerMonthlyPrice || ''} onChange={(e) => set('offerMonthlyPrice', Number(e.target.value))}
                    className="w-full border rounded-lg px-3 py-2" />
                </div>
                <div>
                  <label className="block text-sm text-gray-600 mb-1">Offer Yearly (₹)</label>
                  <input type="number" value={settings.offerYearlyPrice || ''} onChange={(e) => set('offerYearlyPrice', Number(e.target.value))}
                    className="w-full border rounded-lg px-3 py-2" />
                </div>
              </div>
              <p className="text-xs text-gray-400">Restaurant admins will see this offer on their Subscription page when renewing.</p>
            </div>
          )}
        </div>

        <div className="bg-white rounded-xl shadow-card p-5">
          <h2 className="font-semibold mb-3">Payment Collection</h2>
          <label className="block text-sm text-gray-600 mb-1">Platform UPI ID</label>
          <input placeholder="yourplatform@upi" value={settings.upiId || ''} onChange={(e) => set('upiId', e.target.value)}
            className="w-full border rounded-lg px-3 py-2" />
          <p className="text-xs text-gray-400 mt-1">Restaurants pay their subscription fee to this UPI ID — separate from any restaurant's own UPI ID for their customers.</p>
        </div>

        <button disabled={saving} className="bg-brand-600 text-white px-5 py-2.5 rounded-lg font-medium hover:bg-brand-700 disabled:opacity-60">
          {saving ? 'Saving…' : 'Save Settings'}
        </button>
        {msg && <span className="ml-3 text-green-600 text-sm font-medium">{msg}</span>}
      </form>
    </div>
  );
}
