const STYLES = {
  // Order lifecycle
  WAITING_FOR_CONFIRMATION: 'bg-amber-100 text-amber-700',
  CONFIRMED: 'bg-blue-100 text-blue-700',
  PREPARING: 'bg-orange-100 text-orange-700',
  READY: 'bg-teal-100 text-teal-700',
  COMPLETED: 'bg-green-100 text-green-700',
  CANCELLED: 'bg-red-100 text-red-700',
  // Payment
  PENDING: 'bg-amber-100 text-amber-700',
  PAID: 'bg-green-100 text-green-700',
  // Generic yes/no style flags
  active: 'bg-green-100 text-green-700',
  inactive: 'bg-gray-100 text-gray-600',
  approved: 'bg-green-100 text-green-700',
  rejected: 'bg-red-100 text-red-700',
};

const LABELS = {
  WAITING_FOR_CONFIRMATION: 'Pending',
};

export default function StatusBadge({ status, className = '' }) {
  const style = STYLES[status] || 'bg-gray-100 text-gray-600';
  const label = LABELS[status] || (typeof status === 'string' ? status.replace(/_/g, ' ') : status);
  return (
    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full capitalize whitespace-nowrap ${style} ${className}`}>
      {label}
    </span>
  );
}
