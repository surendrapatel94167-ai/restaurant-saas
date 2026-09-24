/**
 * No payment gateway — customer pays the restaurant directly (UPI app deep
 * link, or in person for cash/card), and the restaurant's admin/manager
 * manually marks the payment as received (see orders.controller markPaymentPaid).
 * This file exists only so the codebase has one obvious place to plug in a
 * real gateway later, if ever wanted.
 */
export async function createPaymentIntent(order) {
  return {
    paymentIntentId: `manual_${order._id}_${Date.now()}`,
    amount: order.totalAmount,
    currency: 'INR',
  };
}

export async function verifyPayment() {
  // Not used by the current flow — payment is confirmed by restaurant staff,
  // not verified against a gateway. Kept for API-compatibility only.
  return { verified: true };
}
