import { useEffect, useState } from 'react';
import api from '../../api/axios';
import { useToast } from '../../components/ToastProvider';

export default function MessagesPage() {
  const [tenants, setTenants] = useState([]);
  const [mode, setMode] = useState('all'); // all | selected
  const [selected, setSelected] = useState([]);
  const [message, setMessage] = useState('');
  const [messageError, setMessageError] = useState('');
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState('');
  const toast = useToast();

  useEffect(() => { api.get('/super-admin/tenants').then(({ data }) => setTenants(data)); }, []);

  const toggleSelect = (id) => {
    setSelected((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);
  };

  const send = async (e) => {
    e.preventDefault();
    setMessageError('');
    if (!message.trim()) { setMessageError('Please write a message first'); return; }
    setSending(true); setResult('');
    try {
      const { data } = await api.post('/super-admin/messages', {
        tenantIds: mode === 'all' ? 'all' : selected,
        message,
      });
      const msg = `Sent to ${data.sent} hotel${data.sent === 1 ? '' : 's'} ✓`;
      setResult(msg);
      toast.success(msg);
      setMessage('');
      setSelected([]);
    } catch (err) {
      setResult(err.response?.data?.message || 'Failed to send');
      toast.error('Failed to send message');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-bold text-ink-900 mb-1">Messages</h1>
      <p className="text-sm text-gray-500 mb-5">Send a note to every restaurant, or just the ones you pick — shows up as a notification in their admin panel.</p>

      <form onSubmit={send} className="bg-white rounded-xl shadow-card p-5 space-y-4">
        <div className="flex gap-2">
          <button type="button" onClick={() => setMode('all')}
            className={`text-sm px-3 py-1.5 rounded-full font-medium ${mode === 'all' ? 'bg-brand-600 text-white' : 'bg-gray-100 text-gray-600'}`}>
            All hotels
          </button>
          <button type="button" onClick={() => setMode('selected')}
            className={`text-sm px-3 py-1.5 rounded-full font-medium ${mode === 'selected' ? 'bg-brand-600 text-white' : 'bg-gray-100 text-gray-600'}`}>
            Pick specific hotels
          </button>
        </div>

        {mode === 'selected' && (
          <div className="border rounded-lg p-3 max-h-48 overflow-y-auto space-y-1">
            {tenants.map((t) => (
              <label key={t._id} className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={selected.includes(t._id)} onChange={() => toggleSelect(t._id)} />
                {t.hotelName}
              </label>
            ))}
          </div>
        )}

        <textarea value={message} onChange={(e) => setMessage(e.target.value)} rows={4}
          placeholder="Type your message…" className="w-full border rounded-lg px-3 py-2 text-sm" />
        {messageError && <p className="text-red-500 text-xs">{messageError}</p>}

        <button disabled={sending} className="bg-brand-600 text-white px-5 py-2.5 rounded-lg font-medium hover:bg-brand-700 disabled:opacity-60">
          {sending ? 'Sending…' : 'Send'}
        </button>
        {result && <span className="ml-3 text-sm text-green-600 font-medium">{result}</span>}
      </form>
    </div>
  );
}
