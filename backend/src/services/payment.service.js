/**
 * Razorpay integration stub — swap in real keys (RAZORPAY_KEY_ID / RAZORPAY_KEY_SECRET)
 * via config/env.js when ready. This simulates a successful payment so the checkout
 * flow is testable end-to-end without live keys.
 */
export async function createPaymentIntent(order) {
  return {
    provider: 'razorpay',
    paymentIntentId: `sim_${order._id}_${Date.now()}`,
    amount: order.totalAmount,
    currency: 'INR',
    status: 'created',
  };
}

export async function verifyPayment(paymentIntentId, signature) {
  // TODO: real signature verification with Razorpay webhook secret
  return { verified: true, transactionId: paymentIntentId };
}
