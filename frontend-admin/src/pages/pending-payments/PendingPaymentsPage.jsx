import { useEffect, useState } from 'react';
import api from '../../api/axios';
import { useConfirm } from '../../components/ConfirmProvider';
import { useToast } from '../../components/ToastProvider';

export default function PendingPaymentsPage() {
  const [orders, setOrders] = useState([]);
  const [busyId, setBusyId] = useState('');
  const { confirm } = useConfirm();
  const toast = useToast();

  const load = async () => {
    const { data } = await api.get('/orders', { params: { status: 'COMPLETED', paymentStatus: 'PENDING' } });
    setOrders(data);
  };

  useEffect(() => { load(); }, []);

  const markPaid = async (order) => {
    const ok = await confirm({
      title: `Mark ₹${order.totalAmount} as paid?`,
      message: `Table ${order.tableNumber || '—'} · ${order.payment?.method?.toUpperCase()} · ${order.customerName}`,
    });
    if (!ok) return;
    setBusyId(order._id);
    try {
      await api.patch(`/orders/${order._id}/mark-paid`);
      toast.success('Payment marked as received');
      setOrders((prev) => prev.filter((o) => o._id !== order._id));
    } catch (err) {
      toast.error('Failed to update payment');
    } finally {
      setBusyId('');
    }
  };

  return (
    <div>
      <h1 className="text-2xl font-bold text-ink-900 mb-1">Pending Payments</h1>
      <p className="text-sm text-gray-500 mb-5">Orders that are done but payment (cash/card) hasn't been collected yet.</p>

      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {orders.map((order) => (
          <div key={order._id} className="bg-white rounded-xl shadow-card p-4 flex flex-col border-t-4 border-orange-400">
            <div className="flex justify-between items-center mb-2">
              <span className="font-semibold text-ink-900">Table {order.tableNumber || '—'}</span>
              <span className="text-[10px] uppercase font-semibold text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
                {order.payment?.method}
              </span>
            </div>
            <p className="text-xs text-gray-500 mb-3">{order.customerName} · {order.customerPhone}</p>
            <ul className="text-sm flex-1 space-y-1.5 mb-3">
              {order.items.map((it, i) => (
                <li key={i}>
                  <span className="font-medium">{it.quantity}×</span> {it.nameSnapshot}
                </li>
              ))}
            </ul>
            <p className="text-lg font-bold text-orange-600 mb-3">₹{order.totalAmount}</p>
            <button
              disabled={busyId === order._id}
              onClick={() => markPaid(order)}
              className="bg-green-600 text-white text-sm py-2 rounded-lg hover:bg-green-700 transition font-medium disabled:opacity-60"
            >
              {busyId === order._id ? 'Updating…' : 'Mark as Paid'}
            </button>
          </div>
        ))}
        {orders.length === 0 && <p className="text-gray-500">No pending payments — all settled up! 🎉</p>}
      </div>
    </div>
  );
}
