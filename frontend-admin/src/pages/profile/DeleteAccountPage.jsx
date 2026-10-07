import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../api/axios';
import { useToast } from '../../components/ToastProvider';

// A staff member (manager/chef/waiter/cashier) asking the super-admin to
// delete their account. Their details are prefilled (read-only) so the
// super-admin knows exactly who is asking and from which hotel.
export default function DeleteAccountPage() {
  const [info, setInfo] = useState(null);
  const [reason, setReason] = useState('');
  const [lastWorkingDate, setLastWorkingDate] = useState('');
  const [fieldError, setFieldError] = useState('');
  const [error, setError] = useState('');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const toast = useToast();

  useEffect(() => {
    api.get('/auth/deletion-request').then(({ data }) => {
      setInfo(data);
      if (data.alreadyRequested) setSent(true);
    }).catch(() => setError('Could not load your details'));
  }, []);

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    if (reason.trim().length < 10) { setFieldError('Please write a reason (at least 10 characters)'); return; }
    setFieldError('');
    setSending(true);
    try {
      await api.post('/auth/deletion-request', { reason: reason.trim(), lastWorkingDate });
      setSent(true);
      toast.success('Request sent to the super-admin');
    } catch (err) {
      const message = err.response?.data?.message || 'Could not send request';
      setError(message);
      toast.error(message);
    } finally {
      setSending(false);
    }
  };

  if (!info) return <p className="text-gray-500">{error || 'Loading…'}</p>;

  const Row = ({ label, value }) => (
    <div>
      <label className="block text-xs text-gray-500 mb-1">{label}</label>
      <div className="w-full border rounded-lg px-3 py-2 bg-gray-50 text-gray-700 text-sm min-h-[38px]">{value || '—'}</div>
    </div>
  );

  return (
    <div className="max-w-xl">
      <h1 className="text-2xl font-bold text-ink-900 mb-1">Delete My Account</h1>
      <p className="text-sm text-gray-500 mb-5">Send a request to the super-admin to permanently delete your account. They will review it — your account stays active until then.</p>

      {sent ? (
        <div className="bg-green-50 border border-green-200 rounded-xl p-5 text-sm text-green-800">
          ✅ Your deletion request has been sent to the super-admin. You'll be contacted once it's processed.
          <div className="mt-3"><Link to="/my-profile" className="text-brand-600 font-medium hover:underline">Back to My Profile</Link></div>
        </div>
      ) : (
        <form onSubmit={submit} className="bg-white rounded-xl shadow-card p-5 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Row label="Your name" value={info.name} />
            <Row label="Role" value={info.role} />
            <Row label="Mobile number" value={info.phone} />
            <Row label="Email" value={info.email} />
            <Row label="Hotel name" value={info.hotelName} />
            <Row label="Hotel address" value={info.address} />
          </div>

          <div>
            <label className="block text-sm text-gray-600 mb-1">Last working date (optional)</label>
            <input type="date" value={lastWorkingDate} onChange={(e) => setLastWorkingDate(e.target.value)} className="border rounded-lg px-3 py-2" />
          </div>

          <div>
            <label className="block text-sm text-gray-600 mb-1">Reason for leaving / deleting account</label>
            <textarea rows={4} value={reason} onChange={(e) => { setReason(e.target.value); setFieldError(''); }}
              placeholder="e.g. I have resigned from this restaurant…" className="w-full border rounded-lg px-3 py-2" />
            {fieldError && <p className="text-red-500 text-xs mt-1">{fieldError}</p>}
          </div>

          {error && <p className="text-red-500 text-sm">{error}</p>}
          <button disabled={sending} className="bg-red-600 text-white px-5 py-2.5 rounded-lg font-medium hover:bg-red-700 disabled:opacity-60">
            {sending ? 'Sending…' : 'Send deletion request'}
          </button>
        </form>
      )}
    </div>
  );
}
