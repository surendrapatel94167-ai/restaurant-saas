import { useEffect, useRef, useState } from 'react';
import api from '../../api/axios';

function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function getLocation() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) return reject(new Error('Location not supported on this device'));
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      (err) => reject(err),
      { enableHighAccuracy: true, timeout: 10000 }
    );
  });
}

export default function StaffAttendancePage() {
  const [history, setHistory] = useState([]);
  const [busy, setBusy] = useState('');
  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');
  const cameraInputRef = useRef(null);
  const pendingAction = useRef(null); // 'in' | 'out'

  const load = async () => {
    const { data } = await api.get('/hr/attendance');
    setHistory(data);
  };

  useEffect(() => { load(); }, []);

  const today = history.find((r) => new Date(r.date).toDateString() === new Date().toDateString());

  const startPunch = (action) => {
    pendingAction.current = action;
    cameraInputRef.current?.click();
  };

  const handleSelfie = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    const action = pendingAction.current;
    const label = action === 'in' ? 'Punch In' : 'Punch Out';
    setBusy(label); setError(''); setMsg('');
    try {
      const selfieUrl = await fileToDataUrl(file);
      let location = {};
      try {
        location = await getLocation();
      } catch {
        setError('Could not get your location — punch recorded without it. Please enable location access for next time.');
      }
      await api.post(action === 'in' ? '/hr/punch-in' : '/hr/punch-out', { selfieUrl, ...location });
      setMsg(`${label} recorded ✓`);
      load();
    } catch (err) {
      setError(err.response?.data?.message || 'Could not save');
    } finally {
      setBusy('');
    }
  };

  const act = async (label, fn) => {
    setBusy(label); setError(''); setMsg('');
    try {
      await fn();
      setMsg(`${label} recorded ✓`);
      load();
    } catch (err) {
      setError(err.response?.data?.message || 'Could not save');
    } finally {
      setBusy('');
    }
  };

  return (
    <div className="max-w-xl">
      <h1 className="text-2xl font-bold text-ink-900 mb-1">My Attendance</h1>
      <p className="text-sm text-gray-500 mb-5">Punch In/Out takes a quick selfie + your location, so it's confirmed you're at the restaurant. Half-day and leave don't need that.</p>

      {/* Hidden camera-capturing file input, triggered by the Punch buttons */}
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="user"
        onChange={handleSelfie}
        className="hidden"
      />

      <div className="bg-white rounded-xl shadow-card p-5 mb-6">
        <p className="text-sm text-gray-500 mb-3">
          Today: <span className="font-medium text-ink-900 capitalize">{today?.status?.replace('_', ' ') || 'Not marked yet'}</span>
          {today?.punchIn && <span className="ml-2 text-xs text-gray-400">In: {new Date(today.punchIn).toLocaleTimeString()}</span>}
          {today?.punchOut && <span className="ml-2 text-xs text-gray-400">Out: {new Date(today.punchOut).toLocaleTimeString()}</span>}
        </p>
        <div className="grid grid-cols-2 gap-3">
          <button disabled={!!busy} onClick={() => startPunch('in')}
            className="bg-brand-600 text-white py-2.5 rounded-lg font-medium disabled:opacity-60">
            {busy === 'Punch In' ? 'Saving…' : '📸 Punch In (arrived)'}
          </button>
          <button disabled={!!busy} onClick={() => startPunch('out')}
            className="bg-brand-600 text-white py-2.5 rounded-lg font-medium disabled:opacity-60">
            {busy === 'Punch Out' ? 'Saving…' : '📸 Punch Out (leaving)'}
          </button>
          <button disabled={!!busy} onClick={() => act('Half Day', () => api.post('/hr/self/half-day'))}
            className="bg-amber-100 text-amber-800 py-2.5 rounded-lg font-medium disabled:opacity-60">
            {busy === 'Half Day' ? 'Saving…' : '🌗 Mark Half Day'}
          </button>
          <button disabled={!!busy} onClick={() => act('Leave', () => api.post('/hr/self/leave'))}
            className="bg-red-50 text-red-700 py-2.5 rounded-lg font-medium disabled:opacity-60">
            {busy === 'Leave' ? 'Saving…' : "🌴 I'm on Leave Today"}
          </button>
        </div>
        {msg && <p className="text-green-600 text-sm mt-3">{msg}</p>}
        {error && <p className="text-red-500 text-sm mt-3">{error}</p>}
      </div>

      <div className="bg-white rounded-xl shadow-card p-5">
        <h2 className="font-semibold mb-3">My History</h2>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-gray-500 border-b">
              <th className="py-1">Date</th><th>Status</th><th>Hours</th>
            </tr>
          </thead>
          <tbody>
            {history.map((r) => (
              <tr key={r._id} className="border-b last:border-0">
                <td className="py-1">{new Date(r.date).toLocaleDateString()}</td>
                <td className="capitalize">{r.status?.replace('_', ' ')}</td>
                <td>{r.hoursWorked ?? '—'}</td>
              </tr>
            ))}
            {history.length === 0 && <tr><td colSpan="3" className="text-center text-gray-400 py-3">No records yet.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
