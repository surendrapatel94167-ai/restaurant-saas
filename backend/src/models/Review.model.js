import mongoose from 'mongoose';
import tenantPlugin from '../plugins/mongooseTenantPlugin.js';

const reviewSchema = new mongoose.Schema({
  menuItemId: { type: mongoose.Schema.Types.ObjectId, ref: 'MenuItem' },
  dishNameSnapshot: String,
  orderId: { type: mongoose.Schema.Types.ObjectId, ref: 'Order' },
  tableNumber: String,
  customerName: { type: String, default: 'Guest' },
  rating: { type: Number, required: true, min: 1, max: 5 },
  comment: String,
  photoUrl: String, // data URI or uploaded image URL
  isApproved: { type: Boolean, default: false }, // admin decides what shows publicly
}, { timestamps: true });

reviewSchema.plugin(tenantPlugin);
reviewSchema.index({ tenantId: 1, isApproved: 1, createdAt: -1 });

export default mongoose.model('Review', reviewSchema);
