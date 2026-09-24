import { useEffect, useState } from 'react';
import api from '../../api/axios';

export default function BillingPage() {
  const [status, setStatus] = useState(null);
  const [plan, setPlan] = useState('monthly');
  const [showPay, setShowPay] = useState(false);
  const [intent, setIntent] = useState(null);
  const [paying, setPaying] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const load = async () => {
    const { data } = await api.get('/tenant/billing/status');
    setStatus(data);
    if (data.subscription.plan !== 'trial') setPlan(data.subscription.plan);
  };

  useEffect(() => { load(); }, []);

  const priceFor = (p) => {
    if (!status) return 0;
    if (status.offer) return status.offer[p];
    return status.prices[p];
  };

  const startRenew = async () => {
    setError(''); setSuccess('');
    try {
      const { data } = await api.post('/tenant/billing/renew', { plan });
      setIntent(data);
      setShowPay(true);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to start renewal');
    }
  };

  const confirmPay = async () => {
    setPaying(true); setError('');
    try {
      await api.post('/tenant/billing/confirm', { paymentIntentId: intent.paymentIntentId, plan });
      setShowPay(false);
      setSuccess('Subscription renewed successfully!');
      load();
    } catch (err) {
      setError(err.response?.data?.message || 'Payment failed, please try again');
    } finally {
      setPaying(false);
    }
  };

  if (!status) return <p className="text-gray-500">Loading…</p>;

  const { subscription, daysLeft, prices, offer } = status;

  return (
    <div className="max-w-xl space-y-6">
      <h1 className="text-2xl font-bold text-ink-900">Subscription</h1>

      {offer && (
        <div className="bg-gradient-to-r from-amber-400 to-orange-500 text-white rounded-xl p-4 shadow-card">
          <p className="font-semibold">🎉 {offer.label || 'Special offer available!'}</p>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-card p-5">
        <p className="text-sm text-gray-500">Current plan</p>
        <p className="text-xl font-bold text-ink-900 capitalize">{subscription.plan}</p>
        <p className={`text-sm mt-1 ${daysLeft !== null && daysLeft <= 5 ? 'text-red-600 font-medium' : 'text-gray-500'}`}>
          {subscription.status === 'active'
            ? daysLeft !== null ? `${subscription.plan === 'trial' ? 'Trial ends' : 'Renews/expires'} in ${daysLeft} day${daysLeft === 1 ? '' : 's'} (${new Date(subscription.endDate).toLocaleDateString()})` : 'Active'
            : `Status: ${subscription.status}`}
        </p>
      </div>

      {!showPay ? (
        <div className="bg-white rounded-xl shadow-card p-5">
          <h2 className="font-semibold mb-3">Renew Subscription</h2>
          <div className="grid grid-cols-2 gap-3 mb-4">
            <button onClick={() => setPlan('monthly')}
              className={`border rounded-lg p-3 text-left ${plan === 'monthly' ? 'border-brand-600 bg-brand-50' : 'border-gray-200'}`}>
              <p className="font-medium text-ink-900">Monthly</p>
              {offer ? (
                <p className="text-xs">
                  <span className="line-through text-gray-400 mr-1">₹{prices.monthly}</span>
                  <span className="text-green-600 font-semibold">₹{offer.monthly}/month</span>
                </p>
              ) : (
                <p className="text-xs text-gray-500">₹{prices.monthly}/month</p>
              )}
            </button>
            <button onClick={() => setPlan('yearly')}
              className={`border rounded-lg p-3 text-left ${plan === 'yearly' ? 'border-brand-600 bg-brand-50' : 'border-gray-200'}`}>
              <p className="font-medium text-ink-900">Yearly</p>
              {offer ? (
                <p className="text-xs">
                  <span className="line-through text-gray-400 mr-1">₹{prices.yearly}</span>
                  <span className="text-green-600 font-semibold">₹{offer.yearly}/year</span>
                </p>
              ) : (
                <p className="text-xs text-gray-500">₹{prices.yearly}/year</p>
              )}
            </button>
          </div>
          <p className="text-lg font-bold text-brand-600 mb-3">₹{priceFor(plan)}</p>
          {error && <p className="text-red-500 text-sm mb-2">{error}</p>}
          {success && <p className="text-green-600 text-sm mb-2">{success}</p>}
          <button onClick={startRenew} className="bg-brand-600 text-white px-5 py-2.5 rounded-lg font-medium hover:bg-brand-700">
            Proceed to Pay
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-card p-5 text-center">
          <p className="font-medium mb-2">Pay ₹{intent.amount} for {plan === 'yearly' ? 'Yearly' : 'Monthly'} plan</p>
          <img
            src={`https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(`upi://pay?pa=${encodeURIComponent(intent.upiId || 'platform@upi')}&pn=RestaurantSaaS&am=${intent.amount}&cu=INR&tn=${encodeURIComponent('Subscription ' + plan)}`)}`}
            alt="Payment QR" className="w-52 h-52 mx-auto rounded-xl shadow-card bg-white p-2 mb-3"
          />
          {!intent.upiId && <p className="text-xs text-amber-600 mb-2">Platform hasn't set a UPI ID yet — contact your super-admin.</p>}
          <p className="text-xs text-gray-500 mb-3">Simulated payment verification — swap in real Razorpay keys in payment.service.js to go live.</p>
          {error && <p className="text-red-500 text-sm mb-2">{error}</p>}
          <button disabled={paying} onClick={confirmPay} className="bg-brand-600 text-white px-5 py-2.5 rounded-lg font-medium hover:bg-brand-700 disabled:opacity-60">
            {paying ? 'Confirming…' : "I've Paid"}
          </button>
          <button onClick={() => setShowPay(false)} className="block mx-auto mt-3 text-sm text-gray-500">← Back</button>
        </div>
      )}
    </div>
  );
}
