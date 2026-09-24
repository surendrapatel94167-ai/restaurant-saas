import { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import api from '../../api/axios';
import PasswordInput from '../../components/PasswordInput';

function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export default function MyProfilePage() {
  const { user } = useSelector((s) => s.auth);
  const isHotelAdmin = user?.role === 'hotel_admin';
  const [me, setMe] = useState(null);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');

  const load = async () => {
    const { data } = await api.get('/auth/my-profile');
    setMe(data);
  };

  useEffect(() => { load(); }, []);

  const handlePhoto = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const dataUrl = await fileToDataUrl(file);
    setMe((m) => ({ ...m, profileImageUrl: dataUrl }));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setError(''); setMsg(''); setSaving(true);
    try {
      const payload = { name: me.name, phone: me.phone, profileImageUrl: me.profileImageUrl };
      if (newPassword) {
        if (!currentPassword) { setError('Enter your current password to set a new one'); setSaving(false); return; }
        payload.currentPassword = currentPassword;
        payload.newPassword = newPassword;
      }
      const { data } = await api.put('/auth/my-profile', payload);
      setMe(data);
      setCurrentPassword(''); setNewPassword('');
      setMsg('Profile updated!');
      setTimeout(() => setMsg(''), 2000);
    } catch (err) {
      setError(err.response?.data?.message || 'Could not save changes');
    } finally {
      setSaving(false);
    }
  };

  if (!me) return <p className="text-gray-500">Loading…</p>;

  return (
    <div className="max-w-xl">
      <h1 className="text-2xl font-bold text-ink-900 mb-1">My Profile</h1>
      <p className="text-sm text-gray-500 mb-5">Your personal account details — visible only to you and your admin.</p>

      <form onSubmit={handleSave} className="bg-white rounded-xl shadow-card p-5 space-y-4">
        <div className="flex items-center gap-4">
          {me.profileImageUrl ? (
            <img src={me.profileImageUrl} alt="you" className="w-16 h-16 rounded-full object-cover" />
          ) : (
            <div className="w-16 h-16 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center text-xl font-bold">
              {me.name?.[0]}
            </div>
          )}
          <div>
            <label className="block text-sm text-gray-600 mb-1">Profile photo</label>
            <input type="file" accept="image/*" onChange={handlePhoto} className="text-sm" />
          </div>
        </div>

        <div>
          <label className="block text-sm text-gray-600 mb-1">Name</label>
          <input value={me.name || ''} onChange={(e) => setMe({ ...me, name: e.target.value })}
            className="w-full border rounded-lg px-3 py-2" required />
        </div>
        <div>
          <label className="block text-sm text-gray-600 mb-1">Email</label>
          <input value={me.email || ''} disabled className="w-full border rounded-lg px-3 py-2 bg-gray-50 text-gray-500" />
          <p className="text-xs text-gray-400 mt-1">Contact your admin to change your email.</p>
        </div>
        <div>
          <label className="block text-sm text-gray-600 mb-1">Phone</label>
          <input value={me.phone || ''} onChange={(e) => setMe({ ...me, phone: e.target.value })}
            className="w-full border rounded-lg px-3 py-2" />
        </div>

        <div className="border-t pt-4">
          <p className="text-sm font-medium text-ink-900 mb-2">Change password</p>
          {isHotelAdmin ? (
            <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
              For security, your password can only be reset by the super-admin. Please contact them if you need a new one.
            </p>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              <PasswordInput placeholder="Current password" value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)} className="border rounded-lg px-3 py-2 w-full" />
              <PasswordInput placeholder="New password" value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)} className="border rounded-lg px-3 py-2 w-full" />
            </div>
          )}
        </div>

        {error && <p className="text-red-500 text-sm">{error}</p>}
        <button disabled={saving} className="bg-brand-600 text-white px-5 py-2.5 rounded-lg font-medium hover:bg-brand-700 disabled:opacity-60">
          {saving ? 'Saving…' : 'Save changes'}
        </button>
        {msg && <span className="ml-3 text-green-600 text-sm font-medium">{msg}</span>}
      </form>
    </div>
  );
}
