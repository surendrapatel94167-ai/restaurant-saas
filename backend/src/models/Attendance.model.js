import mongoose from 'mongoose';
import tenantPlugin from '../plugins/mongooseTenantPlugin.js';

const attendanceSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  date: { type: Date, required: true },
  punchIn: Date,
  punchOut: Date,
  punchInSelfieUrl: String,
  punchInLocation: { lat: Number, lng: Number },
  punchOutSelfieUrl: String,
  punchOutLocation: { lat: Number, lng: Number },
  hoursWorked: Number,
  overtimeHours: { type: Number, default: 0 },
  status: { type: String, enum: ['present', 'absent', 'half_day', 'on_leave'], default: 'present' },
  leaveType: { type: String, enum: ['paid', 'unpaid', 'sick'] },
}, { timestamps: true });

attendanceSchema.plugin(tenantPlugin);
attendanceSchema.index({ tenantId: 1, userId: 1, date: 1 }, { unique: true });

export default mongoose.model('Attendance', attendanceSchema);
