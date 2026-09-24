import mongoose from 'mongoose';
import tenantPlugin from '../plugins/mongooseTenantPlugin.js';

const customerSchema = new mongoose.Schema({
  name: { type: String, required: true },
  phone: { type: String, required: true },
  totalOrders: { type: Number, default: 0 },
  lastOrderAt: Date,
  loyaltyPoints: { type: Number, default: 0 },
  pushSubscription: {
    endpoint: String,
    keys: { p256dh: String, auth: String },
  },
}, { timestamps: true });

customerSchema.plugin(tenantPlugin);
customerSchema.index({ tenantId: 1, phone: 1 }, { unique: true });

export default mongoose.model('Customer', customerSchema);
