import { useEffect, useState } from 'react';
import api from '../../api/axios';
import { useConfirm } from '../../components/ConfirmProvider';
import { useToast } from '../../components/ToastProvider';

export default function ReviewsPage() {
  const [reviews, setReviews] = useState([]);
  const [filter, setFilter] = useState('all'); // all | approved | pending
  const { confirm } = useConfirm();
  const toast = useToast();

  const load = async () => {
    const { data } = await api.get('/reviews');
    setReviews(data);
  };

  useEffect(() => { load(); }, []);

  const toggle = async (id) => {
    await api.patch(`/reviews/${id}/toggle-approval`);
    toast.success('Review updated');
    load();
  };

  const remove = async (id) => {
    const ok = await confirm({ title: 'Delete this review?', message: 'This cannot be undone.', danger: true });
    if (!ok) return;
    await api.delete(`/reviews/${id}`);
    toast.success('Review deleted');
    load();
  };

  const visible = reviews.filter((r) => {
    if (filter === 'approved') return r.isApproved;
    if (filter === 'pending') return !r.isApproved;
    return true;
  });

  return (
    <div>
      <h1 className="text-2xl font-bold text-ink-900 mb-1">Reviews</h1>
      <p className="text-sm text-gray-500 mb-4">Choose which guest reviews show up on your public review page.</p>

      <div className="flex gap-2 mb-4">
        {['all', 'pending', 'approved'].map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`text-sm px-3 py-1.5 rounded-full font-medium capitalize ${
              filter === f ? 'bg-brand-600 text-white' : 'bg-white text-gray-600 border'
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {visible.map((r) => (
          <div key={r._id} className="bg-white rounded-xl shadow-card p-4">
            <div className="flex justify-between items-start">
              <div>
                <p className="font-semibold text-ink-900">{r.customerName}</p>
                {r.dishNameSnapshot && <p className="text-xs text-gray-500">{r.dishNameSnapshot}</p>}
                <p className="text-amber-500 text-sm">{'⭐'.repeat(r.rating)}</p>
              </div>
              <span className={`text-xs font-medium px-2 py-1 rounded-full ${r.isApproved ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                {r.isApproved ? 'Shown publicly' : 'Hidden'}
              </span>
            </div>
            {r.photoUrl && <img src={r.photoUrl} alt="" className="w-full h-32 object-cover rounded-lg mt-2" />}
            {r.comment && <p className="text-sm text-gray-700 mt-2">{r.comment}</p>}
            <div className="flex gap-3 mt-3">
              <button onClick={() => toggle(r._id)} className="text-sm text-brand-600 font-medium hover:underline">
                {r.isApproved ? 'Reject (hide)' : 'Approve & show'}
              </button>
              <button onClick={() => remove(r._id)} className="text-sm text-red-500 font-medium hover:underline">
                Delete
              </button>
            </div>
          </div>
        ))}
        {visible.length === 0 && <p className="text-gray-500 col-span-2 text-center mt-8">No reviews here yet.</p>}
      </div>
    </div>
  );
}
