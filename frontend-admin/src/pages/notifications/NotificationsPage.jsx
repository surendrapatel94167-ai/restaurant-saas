import { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import api from '../../api/axios';
import { useConfirm } from '../../components/ConfirmProvider';
import { useToast } from '../../components/ToastProvider';

export default function NotificationsPage() {
  const { user } = useSelector((s) => s.auth);
  const [notifications, setNotifications] = useState([]);
  const { confirm } = useConfirm();
  const toast = useToast();

  const isSuperAdmin = user?.role === 'super_admin';
  const listEndpoint = isSuperAdmin ? '/notifications/super-admin' : '/notifications';

  const load = async () => {
    const { data } = await api.get(listEndpoint);
    setNotifications(data);
  };

  useEffect(() => { load(); }, []);

  const remove = async (id) => {
    await api.delete(`/notifications/${id}`);
    setNotifications((prev) => prev.filter((n) => n._id !== id));
    toast.success('Notification removed');
  };

  const clearAll = async () => {
    const ok = await confirm({ title: 'Clear all notifications?', message: 'This removes everything from this list — this cannot be undone.', danger: true });
    if (!ok) return;
    await api.delete('/notifications');
    setNotifications([]);
    toast.success('All notifications cleared');
  };

  return (
    <div className="max-w-2xl">
      <div className="flex justify-between items-center mb-1">
        <h1 className="text-2xl font-bold text-ink-900">Notifications</h1>
        {notifications.length > 0 && (
          <button onClick={clearAll} className="text-sm text-red-500 font-medium hover:underline">Clear all</button>
        )}
      </div>
      <p className="text-sm text-gray-500 mb-5">Keep what's important, remove the rest.</p>

      <div className="space-y-2">
        {notifications.map((n) => (
          <div key={n._id} className={`bg-white rounded-xl shadow-card p-4 flex items-start gap-3 ${!n.isRead ? 'border-l-4 border-brand-500' : ''}`}>
            <div className="flex-1 min-w-0">
              {isSuperAdmin && n.tenantId?.hotelName && (
                <p className="text-xs font-semibold text-brand-600 mb-0.5">{n.tenantId.hotelName}</p>
              )}
              <p className="text-sm text-ink-900">{n.message}</p>
              <p className="text-xs text-gray-400 mt-1">{new Date(n.createdAt).toLocaleString()}</p>
            </div>
            <button onClick={() => remove(n._id)} className="text-gray-400 hover:text-red-500 text-lg leading-none flex-shrink-0" aria-label="Remove">
              &times;
            </button>
          </div>
        ))}
        {notifications.length === 0 && (
          <p className="text-gray-400 text-center py-10">No notifications.</p>
        )}
      </div>
    </div>
  );
}
