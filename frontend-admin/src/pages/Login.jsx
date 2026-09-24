import { useState } from 'react';
import { useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import api from '../api/axios';
import { setCredentials } from '../features/authSlice';
import PasswordInput from '../components/PasswordInput';
import InstallAppButton from '../components/InstallAppButton';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    const errs = {};
    if (!email.trim()) errs.email = 'Email is required';
    if (!password.trim()) errs.password = 'Password is required';
    setFieldErrors(errs);
    if (Object.keys(errs).length) return;

    setLoading(true);
    try {
      const { data } = await api.post('/auth/login', { email, password });
      dispatch(setCredentials(data));
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-ink-950 via-ink-900 to-brand-900 p-4">
      <form onSubmit={handleSubmit} className="bg-white/95 backdrop-blur p-8 rounded-2xl shadow-2xl w-full max-w-sm space-y-5">
        <div>
          <div className="w-10 h-10 rounded-xl bg-brand-500 mb-4 flex items-center justify-center text-white font-bold text-lg">R</div>
          <h1 className="text-xl font-bold text-ink-900">Staff Login</h1>
          <p className="text-sm text-gray-500 mt-1">Restaurant SaaS control panel</p>
        </div>

        {error && <p className="text-red-600 text-sm bg-red-50 border border-red-100 rounded-lg px-3 py-2">{error}</p>}

        <div className="space-y-3">
          <div>
            <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Email</label>
            <input
              type="email" value={email} onChange={(e) => setEmail(e.target.value)}
              className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2.5 outline-none focus:ring-2 focus:ring-brand-400 focus:border-transparent transition"
              placeholder="you@hotel.com"
            />
            {fieldErrors.email && <p className="text-red-500 text-xs mt-1">{fieldErrors.email}</p>}
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Password</label>
            <PasswordInput
              value={password} onChange={(e) => setPassword(e.target.value)}
              className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2.5 outline-none focus:ring-2 focus:ring-brand-400 focus:border-transparent transition"
              placeholder="••••••••"
            />
            {fieldErrors.password && <p className="text-red-500 text-xs mt-1">{fieldErrors.password}</p>}
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-brand-600 text-white py-2.5 rounded-lg font-semibold hover:bg-brand-700 transition shadow-card disabled:opacity-70 flex items-center justify-center gap-2"
        >
          {loading && <Loader2 size={16} className="animate-spin" />}
          {loading ? 'Signing in…' : 'Log in'}
        </button>
      </form>
      <div className="w-full max-w-sm">
        <InstallAppButton />
      </div>
    </div>
  );
}
