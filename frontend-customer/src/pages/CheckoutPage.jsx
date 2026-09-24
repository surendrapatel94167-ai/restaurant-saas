import { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import api from '../api/axios';
import { clearCart } from '../features/cartSlice';

export default function CheckoutPage() {
  const { tenantSlug, tableId } = useParams();
  const cart = useSelector((s) => s.cart.items);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [placing, setPlacing] = useState(false);
  const [error, setError] = useState('');
  const [customerName, setCustomerName] = useState(() => localStorage.getItem('customerName') || '');
  const [customerPhone, setCustomerPhone] = useState(() => localStorage.getItem('customerPhone') || '');
  const [paymentMethod, setPaymentMethod] = useState('upi');
  const [loyalty, setLoyalty] = useState(null); // { points, enabled, redeemValue }
  const [redeemPoints, setRedeemPoints] = useState(0);
  const [couponInput, setCouponInput] = useState('');
  const [coupon, setCoupon] = useState(null); // { code, discountPercentage, scope, menuItemIds }
  const [couponError, setCouponError] = useState('');
  const [applyingCoupon, setApplyingCoupon] = useState(false);

  // UPI pay screen state — shown right after order creation if UPI was chosen.
  const [payingOrder, setPayingOrder] = useState(null);
  const [upiId, setUpiId] = useState('');
  const [hotelName, setHotelName] = useState('');
  const [confirmingPayment, setConfirmingPayment] = useState(false);
  const [payError, setPayError] = useState('');

  const subtotal = cart.reduce((s, i) => s + i.price * i.quantity, 0);
  const tax = Math.round(subtotal * 0.05);
  const preDiscountTotal = subtotal + tax;

  const couponDiscount = useMemo(() => {
    if (!coupon) return 0;
    if (coupon.scope === 'all') return Math.round(subtotal * (coupon.discountPercentage / 100));
    const matchIds = new Set(coupon.menuItemIds);
    const matchedTotal = cart
      .filter((i) => matchIds.has(i.menuItemId))
      .reduce((s, i) => s + i.price * i.quantity, 0);
    return Math.round(matchedTotal * (coupon.discountPercentage / 100));
  }, [coupon, cart, subtotal]);

  const remainingAfterCoupon = Math.max(0, preDiscountTotal - couponDiscount);
  const loyaltyDiscount = loyalty ? Math.min(Math.round(redeemPoints * loyalty.redeemValue), remainingAfterCoupon) : 0;
  const total = Math.max(0, remainingAfterCoupon - loyaltyDiscount);

  useEffect(() => {
    api.get(`/customer/${tenantSlug}/landing`).then(({ data }) => {
      setHotelName(data.hotelName || '');
      setUpiId(data.upiId || '');
    });
  }, [tenantSlug]);

  // Look up the guest's points balance once they've entered a phone number
  // that looks complete (debounced-ish: just re-fires on blur-worthy length).
  useEffect(() => {
    if (customerPhone.trim().length < 10) { setLoyalty(null); return; }
    api.get(`/customer/${tenantSlug}/loyalty`, { params: { phone: customerPhone.trim() } })
      .then(({ data }) => { setLoyalty(data); setRedeemPoints(0); })
      .catch(() => setLoyalty(null));
  }, [customerPhone, tenantSlug]);

  const applyCoupon = async () => {
    setCouponError('');
    if (!couponInput.trim()) return;
    if (customerPhone.trim().length < 10) { setCouponError('Enter your phone number first.'); return; }
    setApplyingCoupon(true);
    try {
      const { data } = await api.get(`/customer/${tenantSlug}/coupons/validate`, {
        params: { code: couponInput.trim(), phone: customerPhone.trim() },
      });
      setCoupon({ code: couponInput.trim().toUpperCase(), ...data });
    } catch (err) {
      setCoupon(null);
      setCouponError(err.response?.data?.message || 'Invalid coupon code');
    } finally {
      setApplyingCoupon(false);
    }
  };

  const removeCoupon = () => { setCoupon(null); setCouponInput(''); setCouponError(''); };

  const handlePlaceOrder = async () => {
    if (!customerName.trim() || !customerPhone.trim()) {
      setError('Please enter your name and phone number.');
      return;
    }
    setPlacing(true);
    setError('');
    try {
      localStorage.setItem('customerName', customerName);
      localStorage.setItem('customerPhone', customerPhone);

      const { data: order } = await api.post(`/customer/${tenantSlug}/orders`, {
        tableId,
        orderType: 'dine_in',
        customerName,
        customerPhone,
        redeemPoints,
        couponCode: coupon?.code,
        paymentMethod,
        items: cart.map((i) => ({
          menuItemId: i.menuItemId,
          quantity: i.quantity,
          specialInstructions: i.specialInstructions,
        })),
      });

      dispatch(clearCart());
      localStorage.setItem('activeOrderId', order._id);

      if (paymentMethod === 'upi') {
        // Show the exact-amount UPI pay screen right now — order already
        // exists and is visible to the restaurant regardless of payment state.
        setPayingOrder(order);
      } else {
        // Cash/Card: payment stays PENDING, settled at the restaurant.
        navigate(`/menu/${tenantSlug}/${tableId}/track/${order._id}`);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to place order');
    } finally {
      setPlacing(false);
    }
  };

  const confirmUpiPayment = async () => {
    setConfirmingPayment(true);
    setPayError('');
    try {
      const { data: intent } = await api.post(`/customer/${tenantSlug}/orders/${payingOrder._id}/payment`);
      await api.post(`/customer/${tenantSlug}/orders/${payingOrder._id}/payment/confirm`, {
        paymentIntentId: intent.paymentIntentId,
        method: 'upi',
        customerPhone,
      });
      navigate(`/menu/${tenantSlug}/${tableId}/track/${payingOrder._id}`);
    } catch (err) {
      setPayError(err.response?.data?.message || 'Payment failed, please try again');
    } finally {
      setConfirmingPayment(false);
    }
  };

  if (payingOrder) {
    const upiLink = `upi://pay?pa=${encodeURIComponent(upiId || 'restaurant@upi')}&pn=${encodeURIComponent(hotelName || 'Restaurant')}&am=${payingOrder.totalAmount}&cu=INR&tn=${encodeURIComponent('Order ' + payingOrder._id.slice(-6))}`;
    const qrImg = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(upiLink)}`;
    return (
      <div className="max-w-lg mx-auto min-h-screen bg-[#fbf7f4] flex flex-col items-center justify-center px-6 text-center">
        <h1 className="text-lg font-bold text-ink-900 mb-1">Scan & Pay</h1>
        <p className="text-sm text-gray-500 mb-4">Pay exactly <span className="font-semibold text-ink-900">₹{payingOrder.totalAmount}</span> to {hotelName}</p>
        <img src={qrImg} alt="Payment QR" className="w-56 h-56 rounded-xl shadow-card bg-white p-2" />
        {!upiId && <p className="text-xs text-amber-600 mt-2">Restaurant hasn't set a UPI ID yet — admin can add it in Profile.</p>}
        {payError && <p className="text-red-500 text-sm mt-3">{payError}</p>}
        <button
          onClick={confirmUpiPayment}
          disabled={confirmingPayment}
          className="mt-6 w-full bg-brand-600 text-white py-3 rounded-xl font-semibold disabled:opacity-60"
        >
          {confirmingPayment ? 'Confirming…' : "I've Paid"}
        </button>
        <button
          onClick={() => navigate(`/menu/${tenantSlug}/${tableId}/track/${payingOrder._id}`)}
          className="mt-3 text-sm text-gray-500"
        >
          I'll pay later / at the counter →
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto pb-40">
      <header className="bg-gradient-to-r from-ink-950 to-brand-800 text-white p-4 sticky top-0 z-10 rounded-b-2xl shadow-lg flex items-center gap-3">
        <button onClick={() => navigate(-1)}>←</button>
        <h1 className="text-lg font-bold">Confirm Order</h1>
      </header>

      <div className="p-4 space-y-4">
        <div className="bg-white rounded-xl shadow-card p-4">
          <p className="font-medium mb-2">Your details</p>
          <div className="space-y-2">
            <input
              placeholder="Your name"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              className="w-full border rounded-lg px-3 py-2 text-sm"
              required
            />
            <input
              placeholder="Phone number (for your bill on WhatsApp)"
              type="tel"
              value={customerPhone}
              onChange={(e) => setCustomerPhone(e.target.value)}
              className="w-full border rounded-lg px-3 py-2 text-sm"
              required
            />
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-card p-4">
          <p className="font-medium mb-2">Have a coupon code?</p>
          {coupon ? (
            <div className="flex justify-between items-center bg-green-50 border border-green-200 rounded-lg px-3 py-2">
              <span className="text-sm text-green-700 font-medium">✓ {coupon.code} applied ({coupon.discountPercentage}% off)</span>
              <button onClick={removeCoupon} className="text-xs text-red-500">Remove</button>
            </div>
          ) : (
            <div className="flex gap-2">
              <input
                value={couponInput}
                onChange={(e) => setCouponInput(e.target.value.toUpperCase())}
                placeholder="e.g. WELCOME10"
                className="flex-1 border rounded-lg px-3 py-2 text-sm uppercase"
              />
              <button
                onClick={applyCoupon}
                disabled={applyingCoupon}
                className="bg-ink-900 text-white px-4 rounded-lg text-sm font-medium disabled:opacity-60"
              >
                {applyingCoupon ? '…' : 'Apply'}
              </button>
            </div>
          )}
          {couponError && <p className="text-red-500 text-xs mt-1">{couponError}</p>}
        </div>

        {loyalty?.enabled && loyalty.points > 0 && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
            <div className="flex justify-between items-center mb-2">
              <p className="text-sm font-medium text-amber-800">🎁 You have {loyalty.points} points</p>
              <span className="text-xs text-amber-700">= ₹{Math.round(loyalty.points * loyalty.redeemValue)} off</span>
            </div>
            <label className="flex items-center gap-2 text-sm text-amber-800">
              <input
                type="checkbox"
                checked={redeemPoints > 0}
                onChange={(e) => setRedeemPoints(e.target.checked ? Math.min(loyalty.points, Math.floor(remainingAfterCoupon / loyalty.redeemValue)) : 0)}
              />
              Use my points on this order
            </label>
            {redeemPoints > 0 && (
              <input
                type="range"
                min="0"
                max={Math.min(loyalty.points, Math.floor(remainingAfterCoupon / loyalty.redeemValue))}
                value={redeemPoints}
                onChange={(e) => setRedeemPoints(Number(e.target.value))}
                className="w-full mt-2"
              />
            )}
          </div>
        )}

        <div className="bg-white rounded-xl shadow-card p-4">
          <p className="font-medium mb-2">Payment Method</p>
          <div className="space-y-2">
            {[['upi', 'Online UPI — pay now'], ['card', 'Card — pay at restaurant'], ['cash', 'Cash — pay at restaurant']].map(([val, label]) => (
              <label key={val} className="flex items-center gap-2 text-sm">
                <input type="radio" checked={paymentMethod === val} onChange={() => setPaymentMethod(val)} />
                {label}
              </label>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-card p-4">
          <div className="flex justify-between text-sm mb-1"><span>Subtotal</span><span>₹{subtotal}</span></div>
          <div className="flex justify-between text-sm mb-1"><span>Tax (5%)</span><span>₹{tax}</span></div>
          {couponDiscount > 0 && (
            <div className="flex justify-between text-sm mb-1 text-green-700"><span>Coupon discount</span><span>−₹{couponDiscount}</span></div>
          )}
          {loyaltyDiscount > 0 && (
            <div className="flex justify-between text-sm mb-1 text-amber-700"><span>Points discount</span><span>−₹{loyaltyDiscount}</span></div>
          )}
          <div className="flex justify-between font-bold text-lg border-t pt-2 mt-2"><span>Total</span><span>₹{total}</span></div>
        </div>

        {error && <p className="text-red-500 text-sm">{error}</p>}
      </div>

      <div
        className="fixed left-0 right-0 bg-white border-t p-4 max-w-lg mx-auto"
        style={{ bottom: 'calc(60px + var(--safe-bottom))' }}
      >
        <button
          onClick={handlePlaceOrder}
          disabled={placing || cart.length === 0}
          className="w-full bg-brand-600 text-white py-3 rounded-lg font-semibold disabled:opacity-50"
        >
          {placing ? 'Placing order…' : `Place Order — ₹${total}`}
        </button>
      </div>
    </div>
  );
}
