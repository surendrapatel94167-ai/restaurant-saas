import { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import api from '../../api/axios';
import { connectSocket } from '../../sockets/socket';

const PREP_OPTIONS = [10, 15, 20, 30];

function OrderCard({ order, onConfirmed, onMarkedPaid }) {
  const [pickingTime, setPickingTime] = useState(false);
  const [customMinutes, setCustomMinutes] = useState('');
  const [busy, setBusy] = useState(false);

  const confirmWith = async (minutes) => {
    if (!minutes || minutes <= 0) return;
    setBusy(true);
    try {
      const { data } = await api.patch(`/orders/${order._id}/confirm`, { preparationTime: Number(minutes) });
      onConfirmed(data);
    } finally {
      setBusy(false);
    }
  };

  const markPaid = async () => {
    setBusy(true);
    try {
      const { data } = await api.patch(`/orders/${order._id}/mark-paid`);
      onMarkedPaid(data);
    } finally {
      setBusy(false);
    }
  };

  const needsCounterPayment = order.payment?.status === 'PENDING';

  return (
    <div className="bg-white rounded-xl shadow-card p-4 flex flex-col border-t-4 border-amber-400">
      <div className="flex justify-between items-center mb-2">
        <span className="font-semibold text-ink-900">Table {order.tableNumber || '—'}</span>
        <span className="text-xs bg-amber-100 text-amber-800 px-2 py-1 rounded-full font-medium">New</span>
      </div>
      <p className="text-xs text-gray-500 mb-1">{order.customerName} · {order.customerPhone}</p>
      <div className="flex items-center gap-2 mb-2">
        <span className="text-[10px] uppercase font-semibold text-gray-500">{order.payment?.method}</span>
        <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${order.payment?.status === 'PAID' ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}`}>
          {order.payment?.status}
        </span>
      </div>
      <ul className="text-sm flex-1 space-y-1.5 mb-3">
        {order.items.map((it, i) => (
          <li key={i}>
            <span className="font-medium">{it.quantity}×</span> {it.nameSnapshot}
            {it.specialInstructions && <span className="text-gray-500 italic"> — {it.specialInstructions}</span>}
          </li>
        ))}
      </ul>
      <p className="text-sm font-semibold text-brand-600 mb-3">Total ₹{order.totalAmount}</p>

      {needsCounterPayment && (
        <button
          disabled={busy}
          onClick={markPaid}
          className="bg-gray-100 text-gray-700 text-sm py-2 rounded-lg hover:bg-gray-200 transition font-medium disabled:opacity-60 mb-2"
        >
          Mark Payment as Paid
        </button>
      )}

      {!pickingTime ? (
        <button
          disabled={busy}
          onClick={() => setPickingTime(true)}
          className="bg-green-600 text-white text-sm py-2 rounded-lg hover:bg-green-700 transition font-medium disabled:opacity-60"
        >
          Confirm Order
        </button>
      ) : (
        <div className="space-y-2">
          <p className="text-xs text-gray-500">Preparation time?</p>
          <div className="grid grid-cols-4 gap-1.5">
            {PREP_OPTIONS.map((m) => (
              <button
                key={m}
                disabled={busy}
                onClick={() => confirmWith(m)}
                className="bg-brand-600 text-white text-xs py-2 rounded-lg hover:bg-brand-700 disabled:opacity-60"
              >
                {m}m
              </button>
            ))}
          </div>
          <div className="flex gap-1.5">
            <input
              type="number"
              min="1"
              placeholder="Custom (min)"
              value={customMinutes}
              onChange={(e) => setCustomMinutes(e.target.value)}
              className="flex-1 border rounded-lg px-2 py-1.5 text-xs"
            />
            <button
              disabled={busy || !customMinutes}
              onClick={() => confirmWith(customMinutes)}
              className="bg-ink-900 text-white text-xs px-3 rounded-lg disabled:opacity-60"
            >
              Set
            </button>
          </div>
          <button onClick={() => setPickingTime(false)} className="text-xs text-gray-500">← Back</button>
        </div>
      )}
    </div>
  );
}

export default function LiveOrdersPage() {
  const { user } = useSelector((s) => s.auth);
  const [orders, setOrders] = useState([]);

  const load = async () => {
    const { data } = await api.get('/orders');
    setOrders(data.filter((o) => o.status === 'WAITING_FOR_CONFIRMATION'));
  };

  useEffect(() => {
    load();
    const socket = connectSocket(user?.tenantId);

    const beep = () => {
      try {
        const ctx = new (window.AudioContext || window.webkitAudioContext)();
        const osc = ctx.createOscillator();
        osc.connect(ctx.destination);
        osc.frequency.value = 660;
        osc.start();
        setTimeout(() => osc.stop(), 250);
      } catch (_) { /* audio not available, ignore */ }
    };

    socket.on('new_order', (order) => {
      beep();
      setOrders((prev) => [order, ...prev]);
    });
    socket.on('order_status_update', (order) => {
      setOrders((prev) => {
        const withoutThis = prev.filter((o) => o._id !== order._id);
        return order.status === 'WAITING_FOR_CONFIRMATION' ? [order, ...withoutThis] : withoutThis;
      });
    });

    return () => {
      socket.off('new_order');
      socket.off('order_status_update');
    };
  }, [user?.tenantId]);

  const handleConfirmed = (order) => {
    setOrders((prev) => prev.filter((o) => o._id !== order._id));
  };

  const handleMarkedPaid = (order) => {
    setOrders((prev) => prev.map((o) => (o._id === order._id ? order : o)));
  };

  return (
    <div>
      <h1 className="text-2xl font-bold text-ink-900 mb-1">Live Orders</h1>
      <p className="text-sm text-gray-500 mb-5">New orders from guests — confirm with a prep time to send them to the kitchen. Cash/card orders can be marked paid once settled at the counter.</p>

      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {orders.map((order) => (
          <OrderCard key={order._id} order={order} onConfirmed={handleConfirmed} onMarkedPaid={handleMarkedPaid} />
        ))}
        {orders.length === 0 && <p className="text-gray-500">No new orders waiting.</p>}
      </div>
    </div>
  );
}
