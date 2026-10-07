import { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { Link } from 'react-router-dom';
import api from '../../api/axios';
import PasswordInput from '../../components/PasswordInput';
import { useToast } from '../../components/ToastProvider';
import { validateName, validatePhone, validateEmail, validatePassword } from '../../utils/validators';

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
  const isSuperAdmin = user?.role === 'super_admin';
  const [me, setMe] = useState(null);
  const [originalEmail, setOriginalEmail] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [saving, setSaving] = useState(false);
  const toast = useToast();
  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [otpState, setOtpState] = useState(null); // { message } while waiting for the OTP
  const [otp, setOtp] = useState('');
  const [otpError, setOtpError] = useState('');

  const load = async () => {
    const { data } = await api.get('/auth/my-profile');
    setMe(data);
    setOriginalEmail(data.email);
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
    setError(''); setMsg('');
    const errs = {
      name: validateName(me.name),
      phone: validatePhone(me.phone),
      email: isSuperAdmin ? validateEmail(me.email) : '',
    };
    if (newPassword) {
      errs.newPassword = validatePassword(newPassword);
      if (!currentPassword) errs.currentPassword = 'Enter your current password to set a new one';
    }
    // super-admin changing email also needs the current password
    if (isSuperAdmin && me.email !== originalEmail && !currentPassword) {
      errs.currentPassword = 'Enter your current password to change your email';
    }
    Object.keys(errs).forEach((k) => { if (!errs[k]) delete errs[k]; });
    setFieldErrors(errs);
    if (Object.keys(errs).length) return;

    setSaving(true);
    try {
      const payload = { name: me.name.trim(), phone: me.phone, profileImageUrl: me.profileImageUrl };
      if (isSuperAdmin) payload.email = me.email;
      if (currentPassword) payload.currentPassword = currentPassword;
      if (newPassword) payload.newPassword = newPassword;
      const { data } = await api.put('/auth/my-profile', payload);
      if (data.otpRequired) {
        setOtpState({ message: data.message });
        setOtp(''); setOtpError('');
        return;
      }
      setMe(data);
      setOriginalEmail(data.email);
      setCurrentPassword(''); setNewPassword('');
      setMsg('Profile updated!');
      toast.success('Profile updated');
      setTimeout(() => setMsg(''), 2000);
    } catch (err) {
      const message = err.response?.data?.message || 'Could not save changes';
      setError(message);
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  const approveOtp = async () => {
    setOtpError('');
    if (!/^\d{6}$/.test(otp.trim())) { setOtpError('Enter the 6-digit OTP'); return; }
    try {
      const { data } = await api.post('/auth/my-profile/verify-otp', { otp: otp.trim() });
      setMe(data.user);
      setOriginalEmail(data.user.email);
      setOtpState(null); setCurrentPassword(''); setNewPassword(''); setOtp('');
      toast.success('Change approved and saved');
    } catch (err) {
      setOtpError(err.response?.data?.message || 'Could not verify OTP');
    }
  };

  const rejectOtp = async () => {
    try { await api.post('/auth/my-profile/reject'); } catch { /* nothing pending is fine */ }
    setOtpState(null); setOtp(''); setCurrentPassword(''); setNewPassword('');
    load();
    toast.info('Change rejected — nothing was changed');
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
            className="w-full border rounded-lg px-3 py-2" />
          {fieldErrors.name && <p className="text-red-500 text-xs mt-1">{fieldErrors.name}</p>}
        </div>
        <div>
          <label className="block text-sm text-gray-600 mb-1">Email</label>
          {isSuperAdmin ? (
            <>
              <input value={me.email || ''} onChange={(e) => setMe({ ...me, email: e.target.value })} className="w-full border rounded-lg px-3 py-2" />
              {fieldErrors.email && <p className="text-red-500 text-xs mt-1">{fieldErrors.email}</p>}
              <p className="text-xs text-gray-400 mt-1">Changing your email needs your current password and an OTP approval.</p>
            </>
          ) : (
            <>
              <input value={me.email || ''} disabled className="w-full border rounded-lg px-3 py-2 bg-gray-50 text-gray-500" />
              <p className="text-xs text-gray-400 mt-1">Contact your admin to change your email.</p>
            </>
          )}
        </div>
        <div>
          <label className="block text-sm text-gray-600 mb-1">Mobile number</label>
          <input value={me.phone || ''} inputMode="numeric" maxLength={10} placeholder="10-digit mobile number"
            onChange={(e) => setMe({ ...me, phone: e.target.value.replace(/\D/g, '') })}
            className="w-full border rounded-lg px-3 py-2" />
          {fieldErrors.phone && <p className="text-red-500 text-xs mt-1">{fieldErrors.phone}</p>}
        </div>

        <div className="border-t pt-4">
          <p className="text-sm font-medium text-ink-900 mb-2">Change password</p>
          {isHotelAdmin ? (
            <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
              For security, your password can only be reset by the super-admin. Please contact them if you need a new one.
            </p>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <PasswordInput placeholder="Current password" value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)} className="border rounded-lg px-3 py-2 w-full" />
                {fieldErrors.currentPassword && <p className="text-red-500 text-xs mt-1">{fieldErrors.currentPassword}</p>}
              </div>
              <div>
                <PasswordInput placeholder="New password" value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)} className="border rounded-lg px-3 py-2 w-full" />
                {fieldErrors.newPassword && <p className="text-red-500 text-xs mt-1">{fieldErrors.newPassword}</p>}
              </div>
              <p className="col-span-2 text-xs text-gray-400">New password: min 6 characters with a letter, a number and a special character (@ # $ !).{isSuperAdmin ? ' An OTP will be sent to approve the change.' : ''}</p>
            </div>
          )}
        </div>

        {error && <p className="text-red-500 text-sm">{error}</p>}
        <button disabled={saving} className="bg-brand-600 text-white px-5 py-2.5 rounded-lg font-medium hover:bg-brand-700 disabled:opacity-60">
          {saving ? 'Saving…' : 'Save changes'}
        </button>
        {msg && <span className="ml-3 text-green-600 text-sm font-medium">{msg}</span>}
      </form>

      {!isHotelAdmin && !isSuperAdmin && (
        <p className="text-sm text-gray-500 mt-4">
          Leaving this restaurant? <Link to="/delete-account" className="text-red-600 font-medium hover:underline">Request account deletion</Link>
        </p>
      )}

      {otpState && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-5">
            <h3 className="font-bold text-ink-900 text-lg mb-1">Approve this change</h3>
            <p className="text-sm text-gray-500 mb-4">{otpState.message}</p>
            <input
              autoFocus value={otp} inputMode="numeric" maxLength={6} placeholder="6-digit OTP"
              onChange={(e) => { setOtp(e.target.value.replace(/\D/g, '')); setOtpError(''); }}
              className="w-full border rounded-lg px-3 py-2 text-center tracking-widest text-lg"
            />
            {otpError && <p className="text-red-500 text-xs mt-1">{otpError}</p>}
            <div className="flex gap-2 mt-4">
              <button onClick={rejectOtp} className="flex-1 bg-red-50 text-red-600 py-2.5 rounded-lg font-medium hover:bg-red-100">Reject</button>
              <button onClick={approveOtp} className="flex-1 bg-brand-600 text-white py-2.5 rounded-lg font-medium hover:bg-brand-700">Approve</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
