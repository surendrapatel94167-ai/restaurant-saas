import mongoose from 'mongoose';

/**
 * mongooseTenantPlugin
 * Attach to every tenant-scoped schema (Menu, Order, Attendance, etc — NOT Tenant itself).
 * Use Model.forTenant(req.tenantId) / Model.findOneForTenant(...) everywhere in
 * tenant-scoped routes instead of hand-writing { tenantId } filters.
 */
export default function mongooseTenantPlugin(schema) {
  schema.add({
    tenantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Tenant',
      required: true,
      index: true,
    },
  });

  schema.statics.forTenant = function (tenantId) {
    if (!tenantId) {
      throw new Error('forTenant() called without a tenantId — refusing to run an unscoped query');
    }
    return this.find({ tenantId });
  };

  schema.statics.findOneForTenant = function (tenantId, filter = {}) {
    if (!tenantId) {
      throw new Error('findOneForTenant() called without a tenantId');
    }
    return this.findOne({ ...filter, tenantId });
  };
}
