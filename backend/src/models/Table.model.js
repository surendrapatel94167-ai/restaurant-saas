import mongoose from 'mongoose';
import tenantPlugin from '../plugins/mongooseTenantPlugin.js';

const tableSchema = new mongoose.Schema({
  tableNumber: { type: String, required: true },
  qrCodeUrl: String,
  currentStatus: { type: String, enum: ['available', 'occupied', 'needs_cleaning'], default: 'available' },
}, { timestamps: true });

tableSchema.plugin(tenantPlugin);
tableSchema.index({ tenantId: 1, tableNumber: 1 }, { unique: true });

export default mongoose.model('Table', tableSchema);
