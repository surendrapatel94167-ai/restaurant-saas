import mongoose from 'mongoose';
import tenantPlugin from '../plugins/mongooseTenantPlugin.js';

const expenseSchema = new mongoose.Schema({
  category: { type: String, required: true },
  itemName: String,
  quantity: String,
  amount: { type: Number, required: true },
  date: { type: Date, default: Date.now },
  vendorId: { type: mongoose.Schema.Types.ObjectId, ref: 'Vendor' },
  note: String,
}, { timestamps: true });

expenseSchema.plugin(tenantPlugin);
expenseSchema.index({ tenantId: 1, date: -1 });

export default mongoose.model('Expense', expenseSchema);
