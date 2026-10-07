import { useEffect, useRef, useState } from 'react';
import api from '../../api/axios';

function getLocation() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) return reject(new Error('Location not supported on this device'));
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      (err) => reject(err),
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
  });
}

export default function StaffAttendancePage() {
  const [history, setHistory] = useState([]);
  const [busy, setBusy] = useState('');
  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');
  const [camera, setCamera] = useState(null); // { action, location } while the live camera is open
  const videoRef = useRef(null);
  const streamRef = useRef(null);

  const load = async () => {
    const { data } = await api.get('/hr/attendance');
    setHistory(data);
  };

  useEffect(() => { load(); return stopCamera; }, []);

  const today = history.find((r) => new Date(r.date).toDateString() === new Date().toDateString());

  function stopCamera() {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }

  // Punch needs BOTH location and a live camera photo. If either is switched
  // off / denied, the punch is blocked with a clear message.
  const startPunch = async (action) => {
    setError(''); setMsg('');
    setBusy('checking');
    try {
      let location;
      try {
        location = await getLocation();
      } catch (err) {
        setError(err?.code === 1
          ? 'Location is blocked. Turn ON location access for this app/browser, then try again — you cannot punch without it.'
          : 'Could not get your location. Turn ON your phone location (GPS) and try again — you cannot punch without it.');
        return;
      }
      if (!navigator.mediaDevices?.getUserMedia) {
        setError('Camera is not available on this device/browser — you cannot punch without it.');
        return;
      }
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' }, audio: false });
        streamRef.current = stream;
      } catch {
        setError('Camera is blocked or off. Allow camera access for this app/browser, then try again — you cannot punch without it.');
        return;
      }
      setCamera({ action, location });
    } finally {
      setBusy('');
    }
  };

  // attach the stream once the <video> element exists
  useEffect(() => {
    if (camera && videoRef.current && streamRef.current) {
      videoRef.current.srcObject = streamRef.current;
      videoRef.current.play().catch(() => {});
    }
  }, [camera]);

  const cancelCamera = () => { stopCamera(); setCamera(null); };

  const captureAndPunch = async () => {
    const video = videoRef.current;
    if (!video || !video.videoWidth) { setError('Camera is not ready yet — wait a second and try again.'); return; }
    const { action, location } = camera;
    const label = action === 'in' ? 'Punch In' : 'Punch Out';
    const scale = Math.min(1, 640 / video.videoWidth);
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(video.videoWidth * scale);
    canvas.height = Math.round(video.videoHeight * scale);
    canvas.getContext('2d').drawImage(video, 0, 0, canvas.width, canvas.height);
    const selfieUrl = canvas.toDataURL('image/jpeg', 0.7);
    cancelCamera();

    setBusy(label); setError(''); setMsg('');
    try {
      await api.post(action === 'in' ? '/hr/punch-in' : '/hr/punch-out', { selfieUrl, lat: location.lat, lng: location.lng });
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
      <p className="text-sm text-gray-500 mb-5">Punch In/Out works only with your camera AND location turned on — a live selfie + your location confirm you're at the restaurant. Half-day and leave don't need that.</p>

      <div className="bg-white rounded-xl shadow-card p-5 mb-6">
        <p className="text-sm text-gray-500 mb-3">
          Today: <span className="font-medium text-ink-900 capitalize">{today?.status?.replace('_', ' ') || 'Not marked yet'}</span>
          {today?.punchIn && <span className="ml-2 text-xs text-gray-400">In: {new Date(today.punchIn).toLocaleTimeString()}</span>}
          {today?.punchOut && <span className="ml-2 text-xs text-gray-400">Out: {new Date(today.punchOut).toLocaleTimeString()}</span>}
        </p>
        <div className="grid grid-cols-2 gap-3">
          <button disabled={!!busy} onClick={() => startPunch('in')}
            className="bg-brand-600 text-white py-2.5 rounded-lg font-medium disabled:opacity-60">
            {busy === 'Punch In' ? 'Saving…' : busy === 'checking' ? 'Checking…' : '📸 Punch In (arrived)'}
          </button>
          <button disabled={!!busy} onClick={() => startPunch('out')}
            className="bg-brand-600 text-white py-2.5 rounded-lg font-medium disabled:opacity-60">
            {busy === 'Punch Out' ? 'Saving…' : busy === 'checking' ? 'Checking…' : '📸 Punch Out (leaving)'}
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

      {camera && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-4">
            <h3 className="font-bold text-ink-900 mb-2">{camera.action === 'in' ? 'Punch In' : 'Punch Out'} — take a selfie</h3>
            <video ref={videoRef} playsInline muted className="w-full rounded-xl bg-black aspect-[3/4] object-cover -scale-x-100" />
            <p className="text-xs text-gray-500 mt-2">📍 Location captured. Face the camera and tap Capture.</p>
            <div className="flex gap-2 mt-3">
              <button onClick={cancelCamera} className="flex-1 bg-gray-100 text-gray-700 py-2.5 rounded-lg font-medium">Cancel</button>
              <button onClick={captureAndPunch} className="flex-1 bg-brand-600 text-white py-2.5 rounded-lg font-medium">📸 Capture</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
