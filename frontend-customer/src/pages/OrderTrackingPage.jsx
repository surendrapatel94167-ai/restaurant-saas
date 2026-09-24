import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../api/axios';
import { connectSocket } from '../sockets/socket';
import OrderPromptsModal from '../components/OrderPromptsModal';

const STEPS = ['WAITING_FOR_CONFIRMATION', 'CONFIRMED', 'PREPARING', 'READY', 'COMPLETED'];
const LABELS = {
  WAITING_FOR_CONFIRMATION: 'Waiting for Confirmation',
  CONFIRMED: 'Confirmed',
  PREPARING: 'Preparing',
  READY: 'Ready',
  COMPLETED: 'Completed',
};

function getBanner(order) {
  if (order.status === 'WAITING_FOR_CONFIRMATION') {
    if (order.payment?.status === 'PAID') {
      return { text: 'Payment Successful ✅ — Waiting for Restaurant Confirmation…', style: 'bg-amber-50 text-amber-700 border-amber-200' };
    }
    return { text: 'Payment Pending ⏳ — Please pay at the restaurant.', style: 'bg-orange-50 text-orange-700 border-orange-200' };
  }
  if (order.status === 'CONFIRMED' || order.status === 'PREPARING') {
    return {
      text: `Order Confirmed ✅ — Your order will be ready in ${order.preparationTime ?? '—'} minutes.`,
      style: 'bg-green-50 text-green-700 border-green-200',
    };
  }
  if (order.status === 'READY') {
    return { text: '🔔 Your order is ready!', style: 'bg-green-50 text-green-700 border-green-200' };
  }
  if (order.status === 'COMPLETED') {
    return { text: '✅ Order complete. Enjoy your meal!', style: 'bg-gray-50 text-gray-600 border-gray-200' };
  }
  return null;
}

export default function OrderTrackingPage() {
  const { tenantSlug, tableId, orderId } = useParams();
  const navigate = useNavigate();
  const [order, setOrder] = useState(null);
  const [sent, setSent] = useState({});

  useEffect(() => {
    api.get(`/customer/${tenantSlug}/orders/${orderId}`).then(({ data }) => setOrder(data));
  }, [tenantSlug, orderId]);

  useEffect(() => {
    if (!order?.tenantId) return;
    const socket = connectSocket(order.tenantId);
    socket.on('order_status_update', (updated) => {
      if (updated._id === orderId) setOrder(updated);
    });
    return () => socket.off('order_status_update');
  }, [order?.tenantId, orderId]);

  const requestAssistance = async (type) => {
    await api.post(`/customer/${tenantSlug}/orders/${orderId}/assistance`, { type });
    setSent((s) => ({ ...s, [type]: true }));
    setTimeout(() => setSent((s) => ({ ...s, [type]: false })), 3000);
  };

  if (!order) return <p className="text-center mt-8 text-gray-500">Loading order…</p>;

  const currentIdx = STEPS.indexOf(order.status);
  const banner = getBanner(order);
  const total = order.totalAmount;

  if (order.status === 'COMPLETED' && localStorage.getItem('activeOrderId') === orderId) {
    localStorage.removeItem('activeOrderId');
  }

  return (
    <div className="max-w-lg mx-auto p-4 pb-24">
      <h1 className="text-xl font-bold mb-3">Order Status</h1>

      {banner && (
        <div className={`border rounded-lg px-3 py-2.5 text-sm font-medium mb-4 ${banner.style}`}>
          {banner.text}
        </div>
      )}

      <div className="bg-white rounded-xl shadow-card p-4 mb-4">
        {STEPS.map((step, idx) => (
          <div key={step} className="flex items-center gap-3 mb-3 last:mb-0">
            <div className={`w-3 h-3 rounded-full ${idx <= currentIdx ? 'bg-brand-600' : 'bg-gray-200'}`} />
            <span className={idx <= currentIdx ? 'font-semibold text-gray-800' : 'text-gray-400'}>
              {LABELS[step]}
            </span>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-xl shadow-card p-4 mb-4">
        <p className="font-medium mb-2">Items</p>
        {order.items.map((it, i) => (
          <div key={i} className="flex justify-between text-sm mb-1">
            <span>{it.quantity}× {it.nameSnapshot}</span>
            <span>₹{it.priceSnapshot * it.quantity}</span>
          </div>
        ))}
        <div className="flex justify-between font-bold border-t pt-2 mt-2">
          <span>Total</span><span>₹{total}</span>
        </div>
        <div className="flex justify-between text-xs text-gray-500 mt-2 pt-2 border-t">
          <span>Payment method: {order.payment?.method?.toUpperCase()}</span>
          <span className={order.payment?.status === 'PAID' ? 'text-green-600 font-medium' : 'text-orange-600 font-medium'}>
            {order.payment?.status}
          </span>
        </div>
      </div>

      {order.payment?.status === 'PAID' && (
        <div className="bg-green-50 border border-green-200 text-green-700 rounded-lg px-3 py-2 text-sm font-medium mb-4 text-center">
          ✓ Paid ({order.payment.method}) — your bill will arrive on WhatsApp shortly.
          {order.pointsEarned > 0 && <span className="block mt-1">🎁 You earned {order.pointsEarned} loyalty points!</span>}
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={() => requestAssistance('call_waiter')}
          className="bg-white border border-brand-600 text-brand-600 py-2 rounded-lg font-medium"
        >
          {sent.call_waiter ? 'Waiter notified ✓' : 'Call Waiter'}
        </button>
        <button
          onClick={() => requestAssistance('clear_table')}
          className="bg-white border border-brand-600 text-brand-600 py-2 rounded-lg font-medium"
        >
          {sent.clear_table ? 'Request sent ✓' : 'Clear Table'}
        </button>
      </div>

      {order.payment?.status === 'PAID' && (
        <button
          onClick={() => navigate(`/menu/${tenantSlug}/${tableId}/review?orderId=${orderId}`)}
          className="w-full mt-4 bg-gradient-to-r from-brand-600 to-brand-700 text-white py-3 rounded-xl font-semibold"
        >
          ⭐ Rate your meal
        </button>
      )}

      <OrderPromptsModal
        tenantSlug={tenantSlug}
        orderId={orderId}
        customerName={order.customerName}
        customerPhone={order.customerPhone}
      />
    </div>
  );
}
