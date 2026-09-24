import Attendance from '../models/Attendance.model.js';

export async function calculateMonthlySalary(tenantId, userId, year, month, employmentDetails) {
  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 0, 23, 59, 59);

  const records = await Attendance.forTenant(tenantId).where({
    userId,
    date: { $gte: startDate, $lte: endDate },
  });

  const daysPresent = records.filter((r) => r.status === 'present' || r.status === 'half_day').length;
  const totalOvertimeHours = records.reduce((sum, r) => sum + (r.overtimeHours || 0), 0);

  const { dailyWage, monthlySalary, overtimeRatePerHour = 0 } = employmentDetails || {};

  let baseSalary = 0;
  if (dailyWage) {
    baseSalary = daysPresent * dailyWage;
  } else if (monthlySalary) {
    const totalDaysInMonth = endDate.getDate();
    baseSalary = (daysPresent / totalDaysInMonth) * monthlySalary;
  }

  const overtimePay = totalOvertimeHours * overtimeRatePerHour;

  return {
    daysPresent,
    totalOvertimeHours,
    baseSalary: Math.round(baseSalary),
    overtimePay: Math.round(overtimePay),
    totalPayable: Math.round(baseSalary + overtimePay),
  };
}
