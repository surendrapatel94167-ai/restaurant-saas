import mongoose from 'mongoose';
import tenantPlugin from '../plugins/mongooseTenantPlugin.js';

const orderItemSchema = new mongoose.Schema({
  menuItemId: { type: mongoose.Schema.Types.ObjectId, ref: 'MenuItem', required: true },
  nameSnapshot: String,
  priceSnapshot: Number,
  quantity: { type: Number, required: true },
  specialInstructions: String,
}, { _id: false });

const orderSchema = new mongoose.Schema({
  tableId: { type: mongoose.Schema.Types.ObjectId, ref: 'Table' },
  tableNumber: String,
  customerName: String,
  customerPhone: String,
  orderType: { type: String, enum: ['dine_in', 'takeaway'], default: 'dine_in' },
  items: [orderItemSchema],
  status: {
    type: String,
    enum: ['WAITING_FOR_CONFIRMATION', 'CONFIRMED', 'PREPARING', 'READY', 'COMPLETED'],
    default: 'WAITING_FOR_CONFIRMATION',
  },
  subtotal: Number,
  tax: Number,
  loyaltyDiscount: { type: Number, default: 0 },
  pointsRedeemed: { type: Number, default: 0 },
  pointsEarned: { type: Number, default: 0 },
  couponCode: String,
  couponDiscount: { type: Number, default: 0 },
  totalAmount: Number,
  payment: {
    method: { type: String, enum: ['upi', 'card', 'cash'] },
    status: { type: String, enum: ['PENDING', 'PAID'], default: 'PENDING' },
    transactionId: String,
    paidAt: Date,
  },
  // Set once the admin/manager confirms the order (see orders.controller confirmOrder).
  preparationTime: Number, // minutes
  confirmedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  confirmedAt: Date,
  assistanceRequests: [{
    type: { type: String, enum: ['call_waiter', 'clear_table'] },
    requestedAt: { type: Date, default: Date.now },
    resolved: { type: Boolean, default: false },
  }],
  whatsappInvoiceSent: { type: Boolean, default: false },
  syncedFromOffline: { type: Boolean, default: false },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

orderSchema.plugin(tenantPlugin);
orderSchema.index({ tenantId: 1, status: 1 });
orderSchema.index({ tenantId: 1, createdAt: -1 });

export default mongoose.model('Order', orderSchema);
