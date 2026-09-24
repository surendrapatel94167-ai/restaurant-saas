import mongoose from 'mongoose';

// Singleton document — there is only ever one of these for the whole platform.
const platformSettingsSchema = new mongoose.Schema({
  monthlyPrice: { type: Number, default: 999 },
  yearlyPrice: { type: Number, default: 9999 },

  offerActive: { type: Boolean, default: false },
  offerLabel: String, // e.g. "This month only: 20% off!"
  offerMonthlyPrice: Number,
  offerYearlyPrice: Number,

  // The platform's OWN UPI ID — restaurants pay their subscription fee here
  // (different from a restaurant's own UPI ID, which their customers pay).
  upiId: String,
}, { timestamps: true });

platformSettingsSchema.statics.getSingleton = async function () {
  let doc = await this.findOne();
  if (!doc) doc = await this.create({});
  return doc;
};

export default mongoose.model('PlatformSettings', platformSettingsSchema);
