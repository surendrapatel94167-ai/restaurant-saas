import mongoose from 'mongoose';
import tenantPlugin from '../plugins/mongooseTenantPlugin.js';

const vendorTxnSchema = new mongoose.Schema({
  type: { type: String, enum: ['debit', 'credit'], required: true },
  amount: { type: Number, required: true },
  note: String,
  date: { type: Date, default: Date.now },
}, { _id: false });

const vendorSchema = new mongoose.Schema({
  name: { type: String, required: true },
  contactPhone: String,
  khataBalance: { type: Number, default: 0 },
  transactions: [vendorTxnSchema],
}, { timestamps: true });

vendorSchema.plugin(tenantPlugin);

export default mongoose.model('Vendor', vendorSchema);
