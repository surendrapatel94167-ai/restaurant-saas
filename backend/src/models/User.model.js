import mongoose from 'mongoose';
import tenantPlugin from '../plugins/mongooseTenantPlugin.js';

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, lowercase: true, trim: true },
    phone: { type: String, trim: true },
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
    // Browser push subscriptions (super-admin installs the app → gets pushed
    // payment/approval alerts). One entry per device.
    pushSubscriptions: { type: [mongoose.Schema.Types.Mixed], default: [], select: false },
    // Super-admin email/password changes wait here until the OTP emailed to
    // the current address is confirmed.
    pendingChange: {
      type: {
        otpHash: String,
        expiresAt: Date,
        attempts: { type: Number, default: 0 },
        newEmail: String,
        newPasswordHash: String,
      },
      select: false,
    },
    // Other branches this admin can switch into, besides their primary tenantId.
    linkedTenantIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Tenant' }],
  },
  { timestamps: true }
);

userSchema.plugin(tenantPlugin);
// The tenant plugin makes tenantId mandatory, but the platform super-admin
// belongs to no restaurant — without this, every me.save() on the
// super-admin (name change, password change...) failed validation.
userSchema.path('tenantId').required(function () { return this.role !== 'super_admin'; });
userSchema.index({ tenantId: 1, email: 1 }, { unique: true });

export default mongoose.model('User', userSchema);
