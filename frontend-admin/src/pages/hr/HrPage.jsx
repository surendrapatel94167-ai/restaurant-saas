import { useEffect, useState } from 'react';
import api from '../../api/axios';
import { useConfirm } from '../../components/ConfirmProvider';
import PasswordInput from '../../components/PasswordInput';

const ROLES = ['manager', 'chef', 'waiter', 'cashier'];

const emptyStaffForm = {
  name: '', email: '', phone: '', password: '', role: 'waiter',
  salaryType: 'monthly', salaryAmount: '', joinDate: '', endDate: '',
};

export default function HrPage() {
  const [staff, setStaff] = useState([]);
  const [attendance, setAttendance] = useState([]);
  const [attendanceFilter, setAttendanceFilter] = useState('');
  const [staffForm, setStaffForm] = useState(emptyStaffForm);
  const [editingId, setEditingId] = useState(null);
  const [fieldErrors, setFieldErrors] = useState({});
  const [staffError, setStaffError] = useState('');
  const [salaryQuery, setSalaryQuery] = useState({ userId: '', year: new Date().getFullYear(), month: new Date().getMonth() + 1 });
  const [salaryResult, setSalaryResult] = useState(null);
  const [error, setError] = useState('');
  const { confirm, prompt, notify } = useConfirm();

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
    const errs = {};
    if (!staffForm.name.trim()) errs.name = 'Name is required';
    if (!staffForm.email.trim()) errs.email = 'Email is required';
    if (!editingId) {
      if (!staffForm.password.trim()) errs.password = 'Set a password';
      else if (staffForm.password.length < 6) errs.password = 'At least 6 characters';
    }
    if (!staffForm.salaryAmount) errs.salaryAmount = 'Enter an amount';
    if (!staffForm.joinDate) errs.joinDate = 'Join date is required';
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
      } else {
        await api.post('/staff', {
          name: staffForm.name, email: staffForm.email, phone: staffForm.phone,
          password: staffForm.password, role: staffForm.role, employmentDetails,
        });
      }
      resetForm();
      loadAll();
    } catch (err) {
      setStaffError(err.response?.data?.message || 'Failed to save staff');
    }
  };

  const toggleStaffActive = async (id) => {
    await api.patch(`/staff/${id}/toggle-active`);
    loadAll();
  };

  const resetPassword = async (id) => {
    const newPassword = await prompt({
      title: 'Reset staff password',
      message: 'Set a new password for this staff member (min 6 characters).',
      inputType: 'password',
    });
    if (!newPassword) return;
    try {
      await api.post(`/staff/${id}/reset-password`, { newPassword });
      await notify({ title: 'Password reset', message: 'Share the new password with them directly.' });
    } catch (err) {
      await notify({ title: 'Failed', message: err.response?.data?.message || 'Failed to reset password' });
    }
  };

  const deleteStaff = async (id) => {
    const ok = await confirm({ title: 'Remove this staff member?', message: 'This cannot be undone.', danger: true });
    if (!ok) return;
    if (editingId === id) resetForm();
    await api.delete(`/staff/${id}`);
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
            <input placeholder="Email" type="email" value={staffForm.email} onChange={(e) => setStaffForm({ ...staffForm, email: e.target.value })} className="border rounded px-2 py-1.5 w-full" />
            {fieldErrors.email && <p className="text-red-500 text-xs mt-1">{fieldErrors.email}</p>}
          </div>
          <input placeholder="Phone" value={staffForm.phone} onChange={(e) => setStaffForm({ ...staffForm, phone: e.target.value })} className="border rounded px-2 py-1.5" />
          {editingId ? (
            <p className="text-xs text-gray-400 self-center">Use "Reset PW" in the table to change their password.</p>
          ) : (
            <div>
              <PasswordInput placeholder="Set password" value={staffForm.password} onChange={(e) => setStaffForm({ ...staffForm, password: e.target.value })} className="border rounded px-2 py-1.5 w-full" />
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
            <input type="number" placeholder="Amount (₹)" value={staffForm.salaryAmount} onChange={(e) => setStaffForm({ ...staffForm, salaryAmount: e.target.value })} className="border rounded px-2 py-1.5 w-full" />
            {fieldErrors.salaryAmount && <p className="text-red-500 text-xs mt-1">{fieldErrors.salaryAmount}</p>}
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-0.5">Join date</label>
            <input type="date" value={staffForm.joinDate} onChange={(e) => setStaffForm({ ...staffForm, joinDate: e.target.value })} className="border rounded px-2 py-1.5 w-full" />
            {fieldErrors.joinDate && <p className="text-red-500 text-xs mt-1">{fieldErrors.joinDate}</p>}
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-0.5">End date (optional)</label>
            <input type="date" value={staffForm.endDate} onChange={(e) => setStaffForm({ ...staffForm, endDate: e.target.value })} className="border rounded px-2 py-1.5 w-full" />
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
                <th className="py-1">Date</th><th>Staff</th><th>Status</th><th>Hours</th><th>OT</th><th>Verified</th>
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
                </tr>
              ))}
              {visibleAttendance.length === 0 && <tr><td colSpan="6" className="text-center text-gray-400 py-3">No records yet.</td></tr>}
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
    </div>
  );
}
