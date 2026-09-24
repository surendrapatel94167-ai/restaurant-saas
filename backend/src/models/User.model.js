import mongoose from 'mongoose';
import tenantPlugin from '../plugins/mongooseTenantPlugin.js';

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true },
    phone: String,
    passwordHash: { type: String, required: true },
    role: {
      type: String,
      enum: ['super_admin', 'hotel_admin', 'manager', 'chef', 'waiter', 'cashier'],
      required: true,
    },
    employmentDetails: {
      dailyWage: Number,
      monthlySalary: Number,
      joinDate: Date,
      endDate: Date,
      overtimeRatePerHour: Number,
    },
    profileImageUrl: String,
    isActive: { type: Boolean, default: true },
    // Other branches this admin can switch into, besides their primary tenantId.
    linkedTenantIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Tenant' }],
  },
  { timestamps: true }
);

userSchema.plugin(tenantPlugin);
userSchema.index({ tenantId: 1, email: 1 }, { unique: true });

export default mongoose.model('User', userSchema);
