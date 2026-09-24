import { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import api from '../../api/axios';
import { connectSocket } from '../../sockets/socket';

const NEXT_STATUS = {
  CONFIRMED: 'PREPARING',
  PREPARING: 'READY',
  READY: 'COMPLETED',
};

const STATUS_COLOR = {
  CONFIRMED: 'bg-blue-100 text-blue-800',
  PREPARING: 'bg-orange-100 text-orange-800',
  READY: 'bg-green-100 text-green-800',
  COMPLETED: 'bg-gray-100 text-gray-600',
};

export default function KdsPage() {
  const { user } = useSelector((s) => s.auth);
  const [orders, setOrders] = useState([]);
  const [alerts, setAlerts] = useState([]);

  const load = async () => {
    const { data } = await api.get('/orders');
    setOrders(data.filter((o) => !['WAITING_FOR_CONFIRMATION', 'COMPLETED'].includes(o.status)));
  };

  useEffect(() => {
    load();
    const socket = connectSocket(user?.tenantId);

    const beep = () => {
      try {
        const ctx = new (window.AudioContext || window.webkitAudioContext)();
        const osc = ctx.createOscillator();
        osc.connect(ctx.destination);
        osc.frequency.value = 880;
        osc.start();
        setTimeout(() => osc.stop(), 200);
      } catch (_) { /* audio not available, ignore */ }
    };

    socket.on('order_status_update', (order) => {
      setOrders((prev) => {
        const withoutThis = prev.filter((o) => o._id !== order._id);
        if (['WAITING_FOR_CONFIRMATION', 'COMPLETED'].includes(order.status)) return withoutThis;
        beep();
        return [order, ...withoutThis];
      });
    });
    socket.on('assistance_request', (payload) => {
      beep();
      setAlerts((prev) => [{ ...payload, id: Date.now() }, ...prev]);
    });

    return () => {
      socket.off('new_order');
      socket.off('order_status_update');
      socket.off('assistance_request');
    };
  }, [user?.tenantId]);

  const advanceStatus = async (order) => {
    const next = NEXT_STATUS[order.status];
    if (!next) return;
    await api.patch(`/kds/${order._id}/status`, { status: next });
  };

  return (
    <div>
      <h1 className="text-2xl font-bold text-ink-900 mb-1">Kitchen Display / Live Orders</h1>
      <p className="text-sm text-gray-500 mb-5">Confirmed orders only — updates instantly as staff advance status.</p>

      {alerts.length > 0 && (
        <div className="mb-4 space-y-1.5">
          {alerts.slice(0, 3).map((a) => (
            <div key={a.id} className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-lg text-sm font-medium">
              🔔 Table {a.tableNumber}: {a.type.replace('_', ' ')}
            </div>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {orders.map((order) => (
          <div key={order._id} className="bg-white rounded-xl shadow-card p-4 flex flex-col border-t-4 border-brand-500">
            <div className="flex justify-between items-center mb-1">
              <span className="font-semibold text-ink-900">Table {order.tableNumber || '—'}</span>
              <span className={`text-xs font-medium px-2 py-1 rounded-full ${STATUS_COLOR[order.status]}`}>{order.status}</span>
            </div>
            {order.preparationTime && (
              <p className="text-xs text-gray-500 mb-2">⏱ Prep time: {order.preparationTime} min</p>
            )}
            <ul className="text-sm flex-1 space-y-1.5 mb-3">
              {order.items.map((it, i) => (
                <li key={i}>
                  <span className="font-medium">{it.quantity}×</span> {it.nameSnapshot}
                  {it.specialInstructions && <span className="text-gray-500 italic"> — {it.specialInstructions}</span>}
                </li>
              ))}
            </ul>
            {NEXT_STATUS[order.status] && (
              <button
                onClick={() => advanceStatus(order)}
                className="bg-brand-600 text-white text-sm py-2 rounded-lg hover:bg-brand-700 transition font-medium"
              >
                Mark as {NEXT_STATUS[order.status]}
              </button>
            )}
          </div>
        ))}
        {orders.length === 0 && <p className="text-gray-500">No active orders.</p>}
      </div>
    </div>
  );
}
