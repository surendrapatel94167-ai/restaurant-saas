import mongoose from 'mongoose';

// Not tenant-scoped via the plugin (super_admin notifications span every tenant),
// so tenantId is a plain optional reference instead.
const notificationSchema = new mongoose.Schema({
  recipientType: { type: String, enum: ['tenant_admin', 'super_admin'], required: true },
  tenantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant' },
  type: { type: String, default: 'general' }, // e.g. 'subscription_expiry'
  message: { type: String, required: true },
  isRead: { type: Boolean, default: false },
  // Optional structured data (e.g. who sent a staff deletion request).
  meta: { type: mongoose.Schema.Types.Mixed },
}, { timestamps: true });

notificationSchema.index({ recipientType: 1, tenantId: 1, createdAt: -1 });

export default mongoose.model('Notification', notificationSchema);
