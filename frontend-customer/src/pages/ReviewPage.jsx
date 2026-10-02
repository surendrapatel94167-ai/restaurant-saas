import { useState } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import api from '../api/axios';

const STARS = [1, 2, 3, 4, 5];

export default function ReviewPage() {
  const { tenantSlug, tableId } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const [rating, setRating] = useState(0);
  const [customerName, setCustomerName] = useState('');
  const [dishName, setDishName] = useState('');
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!rating) { setError('Please select a star rating.'); return; }
    setSubmitting(true);
    setError('');
    try {
      await api.post(`/customer/${tenantSlug}/reviews`, {
        rating,
        customerName: customerName || 'Guest',
        dishName,
        comment,
        tableNumber: tableId,
        orderId: searchParams.get('orderId') || undefined,
      });
      setDone(true);
    } catch (err) {
      setError(err.response?.data?.message || 'Could not submit review, please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (done) {
    return (
      <div className="max-w-lg mx-auto min-h-screen bg-[#F7F8FA] flex flex-col items-center justify-center px-6 pb-20 text-center">
        <span className="text-5xl mb-4">🙏</span>
        <h1 className="text-xl font-bold text-ink-900">Thanks for your review!</h1>
        <p className="text-gray-500 mt-2 text-sm">It'll appear on our review page once approved.</p>
        <button onClick={() => navigate(`/menu/${tenantSlug}/${tableId}`)} className="mt-6 bg-brand-600 text-white px-5 py-2.5 rounded-xl font-medium">
          Back to start
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto min-h-screen bg-[#F7F8FA] px-4 pb-24">
      <header className="bg-gradient-to-r from-ink-950 to-brand-800 text-white p-5 sticky top-0 z-10 rounded-b-2xl shadow-lg flex items-center gap-3">
        <button onClick={() => navigate(`/menu/${tenantSlug}/${tableId}`)} className="text-lg">←</button>
        <h1 className="text-lg font-bold">Rate your meal</h1>
      </header>

      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
        <div className="bg-white rounded-xl shadow-card p-4 text-center">
          <p className="text-sm text-gray-500 mb-2">Your rating</p>
          <div className="flex justify-center gap-2">
            {STARS.map((s) => (
              <button type="button" key={s} onClick={() => setRating(s)} className="text-3xl">
                {s <= rating ? '⭐' : '☆'}
              </button>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-card p-4 space-y-3">
          <div>
            <label className="block text-xs text-gray-500 mb-1">Your name (optional)</label>
            <input value={customerName} onChange={(e) => setCustomerName(e.target.value)}
              className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="Guest" />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Which dish?</label>
            <input value={dishName} onChange={(e) => setDishName(e.target.value)}
              className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="e.g. Paneer Butter Masala" />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Your thoughts</label>
            <textarea value={comment} onChange={(e) => setComment(e.target.value)} rows={3}
              className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="How was it?" />
          </div>
        </div>

        {error && <p className="text-red-500 text-sm text-center">{error}</p>}

        <button disabled={submitting} className="w-full bg-brand-600 text-white py-3 rounded-xl font-semibold hover:bg-brand-700 transition disabled:opacity-60">
          {submitting ? 'Submitting…' : 'Submit review'}
        </button>
      </form>
    </div>
  );
}
