import mongoose from 'mongoose';
import tenantPlugin from '../plugins/mongooseTenantPlugin.js';

const menuItemSchema = new mongoose.Schema({
  name: { type: Map, of: String, required: true },
  description: { type: Map, of: String },
  category: { type: String, required: true },
  price: { type: Number, required: true },
  imageUrl: String,
  isVeg: { type: Boolean, default: true },
  isAvailable: { type: Boolean, default: true },
  spiceLevelOptions: { type: [String], default: [] },
  tags: [String],
  discount: {
    isActive: { type: Boolean, default: false },
    percentage: { type: Number, default: 0, min: 0, max: 90 },
  },
  spiceLevel: { type: String, enum: ['mild', 'medium', 'hot'], default: 'mild' },
}, { timestamps: true });

menuItemSchema.plugin(tenantPlugin);
menuItemSchema.index({ tenantId: 1, category: 1 });

export default mongoose.model('MenuItem', menuItemSchema);
