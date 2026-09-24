/**
 * WhatsApp Cloud API (Meta) integration stub — use the official API, not
 * unofficial libraries. Real call: POST /v19.0/{PHONE_NUMBER_ID}/messages with
 * WHATSAPP_ACCESS_TOKEN from env.
 */
export async function sendInvoice(tenant, order, customerPhone) {
  const itemLines = (order.items || [])
    .map((it) => `${it.quantity}x ${it.nameSnapshot} - ₹${it.priceSnapshot * it.quantity}`)
    .join('\n');

  const billMsg =
    `🧾 *${tenant.hotelName}*\n` +
    `Table ${order.tableNumber || '-'}\n` +
    `------------------------\n` +
    `${itemLines}\n` +
    `------------------------\n` +
    (order.couponDiscount ? `Coupon discount: -₹${order.couponDiscount}\n` : '') +
    (order.loyaltyDiscount ? `Points discount: -₹${order.loyaltyDiscount}\n` : '') +
    `*Total: ₹${order.totalAmount}*\n\n` +
    `Thank you${order.customerName ? ', ' + order.customerName : ''}! We hope you enjoyed your meal — see you again soon! 🙏`;

  console.log(
    `[whatsapp:sim] Would send itemized bill for order ${order._id} ` +
    `to ${customerPhone || 'unknown number'} from ${tenant.hotelName}:\n${billMsg}`
  );
  return { sent: true, simulated: true };
}

export async function sendMessage(tenant, phone, message) {
  console.log(`[whatsapp:sim] Would send to ${phone} from ${tenant.hotelName}: "${message}"`);
  return { sent: true, simulated: true };
}
