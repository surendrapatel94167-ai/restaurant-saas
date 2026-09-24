import { useEffect, useState } from 'react';
import api from '../../api/axios';

export default function CustomersPage() {
  const [customers, setCustomers] = useState([]);
  const [selected, setSelected] = useState([]);
  const [mode, setMode] = useState('all'); // all | selected
  const [message, setMessage] = useState('');
  const [messageError, setMessageError] = useState('');
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState('');

  const load = async () => {
    const { data } = await api.get('/customers');
    setCustomers(data);
  };

  useEffect(() => { load(); }, []);

  const toggle = (id) => {
    setSelected((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);
  };

  const send = async (e) => {
    e.preventDefault();
    setMessageError('');
    if (!message.trim()) { setMessageError('Please write a message first'); return; }
    setSending(true); setResult('');
    try {
      const { data } = await api.post('/customers/broadcast', {
        message,
        customerIds: mode === 'selected' ? selected : undefined,
      });
      setResult(`Sent to ${data.sent} customer${data.sent === 1 ? '' : 's'} on WhatsApp${data.pushSent ? ` + ${data.pushSent} via notification` : ''} ✓`);
      setMessage(''); setSelected([]);
    } catch (err) {
      setResult(err.response?.data?.message || 'Failed to send');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-ink-900">Customers</h1>

      <div className="bg-white rounded-xl shadow-card p-5">
        <h2 className="font-semibold mb-3">Send an offer / announcement</h2>
        <form onSubmit={send} className="space-y-3">
          <div className="flex gap-2">
            <button type="button" onClick={() => setMode('all')}
              className={`text-sm px-3 py-1.5 rounded-full font-medium ${mode === 'all' ? 'bg-brand-600 text-white' : 'bg-gray-100 text-gray-600'}`}>
              All customers ({customers.length})
            </button>
            <button type="button" onClick={() => setMode('selected')}
              className={`text-sm px-3 py-1.5 rounded-full font-medium ${mode === 'selected' ? 'bg-brand-600 text-white' : 'bg-gray-100 text-gray-600'}`}>
              Pick specific customers
            </button>
          </div>
          <textarea value={message} onChange={(e) => setMessage(e.target.value)} rows={3}
            placeholder="e.g. 20% off on all starters today only!" className="w-full border rounded-lg px-3 py-2 text-sm" />
          {messageError && <p className="text-red-500 text-xs">{messageError}</p>}
          <button disabled={sending} className="bg-brand-600 text-white px-5 py-2 rounded-lg font-medium hover:bg-brand-700 disabled:opacity-60">
            {sending ? 'Sending…' : 'Send on WhatsApp'}
          </button>
          {result && <span className="ml-3 text-sm text-green-600 font-medium">{result}</span>}
        </form>
      </div>

      <div className="bg-white rounded-xl shadow-card p-5">
        <h2 className="font-semibold mb-3">All Customers</h2>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-gray-500 border-b">
              {mode === 'selected' && <th></th>}
              <th className="py-1">Name</th><th>Phone</th><th>Orders</th><th>Last order</th>
            </tr>
          </thead>
          <tbody>
            {customers.map((c) => (
              <tr key={c._id} className="border-b last:border-0">
                {mode === 'selected' && (
                  <td><input type="checkbox" checked={selected.includes(c._id)} onChange={() => toggle(c._id)} /></td>
                )}
                <td className="py-1">{c.name}</td>
                <td>{c.phone}</td>
                <td>
                  {c.totalOrders}
                  {c.totalOrders > 1 && <span className="ml-1.5 text-[10px] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-full">Returning</span>}
                  {c.totalOrders > 0 && c.totalOrders % 5 === 0 && <span className="ml-1.5 text-[10px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full">🎁 Milestone</span>}
                </td>
                <td>{c.lastOrderAt ? new Date(c.lastOrderAt).toLocaleDateString() : '—'}</td>
              </tr>
            ))}
            {customers.length === 0 && <tr><td colSpan="4" className="text-center text-gray-400 py-4">No customers yet.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
