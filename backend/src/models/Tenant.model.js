import mongoose from 'mongoose';

const tenantSchema = new mongoose.Schema(
  {
    hotelName: { type: String, required: true },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
    ownerName: String,
    contactEmail: { type: String, required: true },
    contactPhone: String,
    address: String,
    logoUrl: String,
    isActive: { type: Boolean, default: true },
    subscription: {
      plan: { type: String, enum: ['trial', 'monthly', 'yearly'], default: 'trial' },
      status: { type: String, enum: ['active', 'expired', 'cancelled', 'pending_approval'], default: 'active' },
      startDate: Date,
      endDate: Date,
      // Set when the admin self-reports a payment — the plan stays whatever
      // it was until super-admin approves it (see superAdmin.approveSubscription).
      pendingPlan: { type: String, enum: ['monthly', 'yearly'] },
      pendingSince: Date,
    },
    settings: {
      currency: { type: String, default: 'INR' },
      languages: { type: [String], default: ['en'] },
      gstNumber: String,
      whatsappBusinessNumber: String,
      instagramUrl: String,
      facebookUrl: String,
      websiteUrl: String,
      contactPhoneDisplay: String,
      upiId: String,
      loyalty: {
        enabled: { type: Boolean, default: true },
        earnPerRupee: { type: Number, default: 0.1 }, // 1 point per ₹10 spent
        redeemValue: { type: Number, default: 0.5 }, // ₹ discount per point (2 points = ₹1)
        milestoneEvery: { type: Number, default: 5 }, // auto-coupon every Nth visit
        milestoneDiscountPercentage: { type: Number, default: 10 },
      },
    },
  },
  { timestamps: true }
);

export default mongoose.model('Tenant', tenantSchema);
