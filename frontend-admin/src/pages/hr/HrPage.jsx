import { useEffect, useState } from 'react';
import api from '../../api/axios';
import { useConfirm } from '../../components/ConfirmProvider';
import PasswordInput from '../../components/PasswordInput';
import { useToast } from '../../components/ToastProvider';
import {
  validateName, validateEmail, validatePhone, validatePassword, validateSalary, validateDateRange,
} from '../../utils/validators';

const ROLES = ['manager', 'chef', 'waiter', 'cashier'];

const emptyStaffForm = {
  name: '', email: '', phone: '', password: '', role: 'waiter',
  salaryType: 'monthly', salaryAmount: '', joinDate: '', endDate: '',
};

export default function HrPage() {
  const [staff, setStaff] = useState([]);
  const [attendance, setAttendance] = useState([]);
  const [attendanceFilter, setAttendanceFilter] = useState('');
  const [detailRecord, setDetailRecord] = useState(null);
  const [staffForm, setStaffForm] = useState(emptyStaffForm);
  const [editingId, setEditingId] = useState(null);
  const [fieldErrors, setFieldErrors] = useState({});
  const [staffError, setStaffError] = useState('');
  const [salaryQuery, setSalaryQuery] = useState({ userId: '', year: new Date().getFullYear(), month: new Date().getMonth() + 1 });
  const [salaryResult, setSalaryResult] = useState(null);
  const [error, setError] = useState('');
  const { confirm, prompt } = useConfirm();
  const toast = useToast();

  const loadAll = async () => {
    const [s, a] = await Promise.all([api.get('/staff'), api.get('/hr/attendance')]);
    setStaff(s.data);
    setAttendance(a.data);
  };

  useEffect(() => { loadAll(); }, []);

  const resetForm = () => {
    setStaffForm(emptyStaffForm);
    setEditingId(null);
    setFieldErrors({});
    setStaffError('');
  };

  const startEdit = (s) => {
    setEditingId(s._id);
    setFieldErrors({});
    setStaffError('');
    setStaffForm({
      name: s.name || '',
      email: s.email || '',
      phone: s.phone || '',
      password: '',
      role: s.role || 'waiter',
      salaryType: s.employmentDetails?.dailyWage ? 'daily' : 'monthly',
      salaryAmount: s.employmentDetails?.monthlySalary || s.employmentDetails?.dailyWage || '',
      joinDate: s.employmentDetails?.joinDate ? s.employmentDetails.joinDate.slice(0, 10) : '',
      endDate: s.employmentDetails?.endDate ? s.employmentDetails.endDate.slice(0, 10) : '',
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const submitStaff = async (e) => {
    e.preventDefault();
    setStaffError('');
    const errs = {
      name: validateName(staffForm.name),
      email: validateEmail(staffForm.email),
      phone: validatePhone(staffForm.phone),
      password: editingId ? '' : validatePassword(staffForm.password),
      salaryAmount: validateSalary(staffForm.salaryAmount),
      joinDate: !staffForm.joinDate ? 'Join date is required' : '',
      endDate: staffForm.joinDate ? validateDateRange(staffForm.joinDate, staffForm.endDate) : '',
    };
    Object.keys(errs).forEach((k) => { if (!errs[k]) delete errs[k]; });
    setFieldErrors(errs);
    if (Object.keys(errs).length) return;

    const employmentDetails = {
      ...(staffForm.salaryType === 'monthly' ? { monthlySalary: Number(staffForm.salaryAmount) } : { dailyWage: Number(staffForm.salaryAmount) }),
      joinDate: staffForm.joinDate || undefined,
      endDate: staffForm.endDate || undefined,
    };

    try {
      if (editingId) {
        await api.put(`/staff/${editingId}`, {
          name: staffForm.name, email: staffForm.email, phone: staffForm.phone,
          role: staffForm.role, employmentDetails,
        });
        toast.success('Staff details updated');
      } else {
        await api.post('/staff', {
          name: staffForm.name, email: staffForm.email, phone: staffForm.phone,
          password: staffForm.password, role: staffForm.role, employmentDetails,
        });
        toast.success('Staff added');
      }
      resetForm();
      loadAll();
    } catch (err) {
      const message = err.response?.data?.message || 'Failed to save staff';
      setStaffError(message);
      toast.error(message);
    }
  };

  const toggleStaffActive = async (id) => {
    try {
      await api.patch(`/staff/${id}/toggle-active`);
      toast.success('Status updated');
      loadAll();
    } catch (err) { toast.error(err.response?.data?.message || 'Could not update status'); }
  };

  const resetPassword = async (id) => {
    const newPassword = await prompt({
      title: 'Reset staff password',
      message: 'Min 6 characters, with a letter, a number and a special character (e.g. @ # $ !).',
      inputType: 'password',
      validate: validatePassword,
    });
    if (!newPassword) return;
    try {
      await api.post(`/staff/${id}/reset-password`, { newPassword });
      toast.success('Password reset — share it with them directly');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to reset password');
    }
  };

  const deleteStaff = async (id) => {
    const ok = await confirm({ title: 'Remove this staff member?', message: 'This cannot be undone.', danger: true });
    if (!ok) return;
    if (editingId === id) resetForm();
    await api.delete(`/staff/${id}`);
    toast.success('Staff removed');
    loadAll();
  };

  const calcSalary = async (e) => {
    e.preventDefault();
    setError('');
    if (!salaryQuery.userId) { setError('Pick a staff member first'); return; }
    try {
      const { data } = await api.get(`/hr/salary/${salaryQuery.userId}/${salaryQuery.year}/${salaryQuery.month}`);
      setSalaryResult(data);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to calculate');
    }
  };

  const staffName = (id) => staff.find((s) => s._id === id)?.name || '—';
  const visibleAttendance = attendanceFilter ? attendance.filter((a) => a.userId === attendanceFilter) : attendance;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-ink-900">HR — Staff & Salary</h1>

      <div className="bg-white rounded-xl shadow-card p-4">
        <h2 className="font-semibold mb-3">{editingId ? 'Edit Staff' : 'Add Staff'}</h2>
        <form onSubmit={submitStaff} className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
          <div>
            <input placeholder="Name" value={staffForm.name} onChange={(e) => setStaffForm({ ...staffForm, name: e.target.value })} className="border rounded px-2 py-1.5 w-full" />
            {fieldErrors.name && <p className="text-red-500 text-xs mt-1">{fieldErrors.name}</p>}
          </div>
          <div>
            <input placeholder="Email" type="text" autoComplete="off" value={staffForm.email} onChange={(e) => setStaffForm({ ...staffForm, email: e.target.value })} className="border rounded px-2 py-1.5 w-full" />
            {fieldErrors.email && <p className="text-red-500 text-xs mt-1">{fieldErrors.email}</p>}
          </div>
          <div>
            <input placeholder="Mobile (10 digits)" inputMode="numeric" maxLength={10} value={staffForm.phone}
              onChange={(e) => setStaffForm({ ...staffForm, phone: e.target.value.replace(/\D/g, '') })} className="border rounded px-2 py-1.5 w-full" />
            {fieldErrors.phone && <p className="text-red-500 text-xs mt-1">{fieldErrors.phone}</p>}
          </div>
          {editingId ? (
            <p className="text-xs text-gray-400 self-center">Use "Reset PW" in the table to change their password.</p>
          ) : (
            <div>
              <PasswordInput placeholder="Set password (A-z, 0-9, @#$)" value={staffForm.password} onChange={(e) => setStaffForm({ ...staffForm, password: e.target.value })} className="border rounded px-2 py-1.5 w-full" />
              {fieldErrors.password && <p className="text-red-500 text-xs mt-1">{fieldErrors.password}</p>}
            </div>
          )}
          <select value={staffForm.role} onChange={(e) => setStaffForm({ ...staffForm, role: e.target.value })} className="border rounded px-2 py-1.5">
            {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
          </select>
          <select value={staffForm.salaryType} onChange={(e) => setStaffForm({ ...staffForm, salaryType: e.target.value })} className="border rounded px-2 py-1.5">
            <option value="monthly">Monthly salary</option>
            <option value="daily">Daily wage</option>
          </select>
          <div>
            <input type="number" min="200" placeholder="Amount (min ₹200)" value={staffForm.salaryAmount} onChange={(e) => setStaffForm({ ...staffForm, salaryAmount: e.target.value })} className="border rounded px-2 py-1.5 w-full" />
            {fieldErrors.salaryAmount && <p className="text-red-500 text-xs mt-1">{fieldErrors.salaryAmount}</p>}
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-0.5">Join date</label>
            <input type="date" value={staffForm.joinDate} onChange={(e) => setStaffForm({ ...staffForm, joinDate: e.target.value })} className="border rounded px-2 py-1.5 w-full" />
            {fieldErrors.joinDate && <p className="text-red-500 text-xs mt-1">{fieldErrors.joinDate}</p>}
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-0.5">End date (optional)</label>
            <input type="date" min={staffForm.joinDate || undefined} value={staffForm.endDate} onChange={(e) => setStaffForm({ ...staffForm, endDate: e.target.value })} className="border rounded px-2 py-1.5 w-full" />
            {fieldErrors.endDate && <p className="text-red-500 text-xs mt-1">{fieldErrors.endDate}</p>}
          </div>
          <div className="flex gap-2 self-end">
            <button className="bg-brand-600 text-white rounded px-3 py-1.5 hover:bg-brand-700">
              {editingId ? 'Save changes' : 'Add Staff'}
            </button>
            {editingId && (
              <button type="button" onClick={resetForm} className="text-sm text-gray-500 px-2">Cancel</button>
            )}
          </div>
        </form>
        {staffError && <p className="text-red-500 text-sm mb-2">{staffError}</p>}

        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[640px]">
            <thead>
              <tr className="text-left text-gray-500 border-b">
                <th className="py-1">Name</th><th>Role</th><th>Salary rate</th><th>This month</th><th>Payable</th><th>Active</th><th></th>
              </tr>
            </thead>
            <tbody>
              {staff.map((s) => (
                <tr key={s._id} className={`border-b last:border-0 ${editingId === s._id ? 'bg-brand-50' : ''}`}>
                  <td className="py-1">{s.name}<br /><span className="text-xs text-gray-400">{s.email}</span></td>
                  <td className="capitalize">{s.role}</td>
                  <td>{s.employmentDetails?.monthlySalary ? `₹${s.employmentDetails.monthlySalary}/mo` : s.employmentDetails?.dailyWage ? `₹${s.employmentDetails.dailyWage}/day` : '—'}</td>
                  <td>{s.thisMonth ? `${s.thisMonth.daysPresent}d present` : '—'}</td>
                  <td className="font-semibold text-brand-600">{s.thisMonth ? `₹${s.thisMonth.totalPayable}` : '—'}</td>
                  <td>{s.isActive ? 'Yes' : 'No'}</td>
                  <td className="space-x-2 whitespace-nowrap">
                    <button onClick={() => startEdit(s)} className="text-brand-600 hover:underline">Edit</button>
                    <button onClick={() => toggleStaffActive(s._id)} className="text-brand-600 hover:underline">
                      {s.isActive ? 'Block' : 'Unblock'}
                    </button>
                    <button onClick={() => resetPassword(s._id)} className="text-amber-600 hover:underline">Reset PW</button>
                    <button onClick={() => deleteStaff(s._id)} className="text-red-500 hover:underline">Delete</button>
                  </td>
                </tr>
              ))}
              {staff.length === 0 && <tr><td colSpan="7" className="text-center text-gray-400 py-3">No staff added yet.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-card p-4">
        <div className="flex justify-between items-center mb-3">
          <h2 className="font-semibold">Attendance</h2>
          <select value={attendanceFilter} onChange={(e) => setAttendanceFilter(e.target.value)} className="border rounded px-2 py-1 text-sm">
            <option value="">All staff</option>
            {staff.map((s) => <option key={s._id} value={s._id}>{s.name}</option>)}
          </select>
        </div>
        <p className="text-xs text-gray-500 mb-3">Staff mark their own attendance from their panel — this is a read-only view.</p>

        <div className="overflow-x-auto max-h-72 overflow-y-auto">
          <table className="w-full text-sm min-w-[560px]">
            <thead>
              <tr className="text-left text-gray-500 border-b">
                <th className="py-1">Date</th><th>Staff</th><th>Status</th><th>Hours</th><th>OT</th><th>Verified</th><th></th>
              </tr>
            </thead>
            <tbody>
              {visibleAttendance.map((a) => (
                <tr key={a._id} className="border-b last:border-0">
                  <td className="py-1">{new Date(a.date).toLocaleDateString()}</td>
                  <td>{staffName(a.userId)}</td>
                  <td className="capitalize">{a.status?.replace('_', ' ')}</td>
                  <td>{a.hoursWorked ?? '—'}</td>
                  <td>{a.overtimeHours ?? 0}</td>
                  <td>{a.punchInSelfieUrl ? <img src={a.punchInSelfieUrl} alt="selfie" className="w-8 h-8 rounded-full object-cover" /> : '—'}</td>
                  <td><button onClick={() => setDetailRecord(a)} className="text-brand-600 hover:underline text-xs">View Details</button></td>
                </tr>
              ))}
              {visibleAttendance.length === 0 && <tr><td colSpan="7" className="text-center text-gray-400 py-3">No records yet.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-card p-4">
        <h2 className="font-semibold mb-3">Month-End Salary</h2>
        <form onSubmit={calcSalary} className="flex gap-3 items-end flex-wrap">
          <div>
            <label className="block text-sm text-gray-600">Staff</label>
            <select value={salaryQuery.userId} onChange={(e) => setSalaryQuery({ ...salaryQuery, userId: e.target.value })} className="border rounded px-2 py-1 w-48">
              <option value="">Select…</option>
              {staff.map((s) => <option key={s._id} value={s._id}>{s.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm text-gray-600">Year</label>
            <input type="number" value={salaryQuery.year} onChange={(e) => setSalaryQuery({ ...salaryQuery, year: e.target.value })}
              className="border rounded px-2 py-1 w-24" />
          </div>
          <div>
            <label className="block text-sm text-gray-600">Month</label>
            <input type="number" min="1" max="12" value={salaryQuery.month} onChange={(e) => setSalaryQuery({ ...salaryQuery, month: e.target.value })}
              className="border rounded px-2 py-1 w-20" />
          </div>
          <button className="bg-brand-600 text-white px-4 py-2 rounded hover:bg-brand-700">Calculate</button>
        </form>
        {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
        {salaryResult && (
          <div className="mt-4 text-sm bg-gray-50 rounded p-3">
            <p>Days present: {salaryResult.daysPresent}</p>
            <p>Overtime hours: {salaryResult.totalOvertimeHours}</p>
            <p>Base salary: ₹{salaryResult.baseSalary}</p>
            <p>Overtime pay: ₹{salaryResult.overtimePay}</p>
            <p className="font-bold text-brand-600">Total payable: ₹{salaryResult.totalPayable}</p>
          </div>
        )}
      </div>

      {detailRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4" onClick={() => setDetailRecord(null)}>
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-5 max-h-[85vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="font-bold text-ink-900 text-lg">{staffName(detailRecord.userId)}</h3>
                <p className="text-sm text-gray-500">{new Date(detailRecord.date).toLocaleDateString()} · <span className="capitalize">{detailRecord.status?.replace('_', ' ')}</span></p>
              </div>
              <button onClick={() => setDetailRecord(null)} className="text-gray-400 hover:text-gray-600 text-xl leading-none">&times;</button>
            </div>

            <div className="space-y-4 text-sm">
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-xs text-gray-500 mb-1">Hours worked</p>
                  <p className="font-semibold">{detailRecord.hoursWorked ?? '—'}</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-xs text-gray-500 mb-1">Overtime</p>
                  <p className="font-semibold">{detailRecord.overtimeHours ?? 0} hrs</p>
                </div>
              </div>

              {detailRecord.punchIn && (
                <div className="border-t pt-3">
                  <p className="font-medium text-ink-900 mb-2">🕐 Punch In — {new Date(detailRecord.punchIn).toLocaleTimeString()}</p>
                  <div className="flex gap-3">
                    {detailRecord.punchInSelfieUrl ? (
                      <img src={detailRecord.punchInSelfieUrl} alt="Punch in selfie" className="w-24 h-24 rounded-lg object-cover" />
                    ) : (
                      <div className="w-24 h-24 rounded-lg bg-gray-100 flex items-center justify-center text-xs text-gray-400">No photo</div>
                    )}
                    <div className="text-xs text-gray-500">
                      {detailRecord.punchInLocation?.lat ? (
                        <a
                          href={`https://www.google.com/maps?q=${detailRecord.punchInLocation.lat},${detailRecord.punchInLocation.lng}`}
                          target="_blank" rel="noopener noreferrer"
                          className="text-brand-600 hover:underline"
                        >
                          📍 View location on map
                        </a>
                      ) : 'No location captured'}
                    </div>
                  </div>
                </div>
              )}

              {detailRecord.punchOut && (
                <div className="border-t pt-3">
                  <p className="font-medium text-ink-900 mb-2">🕐 Punch Out — {new Date(detailRecord.punchOut).toLocaleTimeString()}</p>
                  <div className="flex gap-3">
                    {detailRecord.punchOutSelfieUrl ? (
                      <img src={detailRecord.punchOutSelfieUrl} alt="Punch out selfie" className="w-24 h-24 rounded-lg object-cover" />
                    ) : (
                      <div className="w-24 h-24 rounded-lg bg-gray-100 flex items-center justify-center text-xs text-gray-400">No photo</div>
                    )}
                    <div className="text-xs text-gray-500">
                      {detailRecord.punchOutLocation?.lat ? (
                        <a
                          href={`https://www.google.com/maps?q=${detailRecord.punchOutLocation.lat},${detailRecord.punchOutLocation.lng}`}
                          target="_blank" rel="noopener noreferrer"
                          className="text-brand-600 hover:underline"
                        >
                          📍 View location on map
                        </a>
                      ) : 'No location captured'}
                    </div>
                  </div>
                </div>
              )}

              {!detailRecord.punchIn && !detailRecord.punchOut && (
                <p className="text-gray-400 text-center py-4">No punch-in/out recorded for this entry (half-day/leave marked directly).</p>
              )}
            </div>

            <button
              onClick={() => setDetailRecord(null)}
              className="w-full mt-5 bg-gray-100 text-gray-700 py-2.5 rounded-lg font-medium hover:bg-gray-200"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
