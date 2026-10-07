// Form validation rules — mirrored on the server (backend/src/utils/validators.js),
// which is the one that actually enforces them. This copy gives instant feedback.
// Every function returns an error string, or '' when the value is fine.

export function validateName(name, label = 'Name') {
  const v = String(name ?? '').trim();
  if (!v) return `${label} is required`;
  if (v.length < 3) return `${label} must be at least 3 characters`;
  if (!/^\p{L}/u.test(v)) return `${label} must start with a letter (not a number or symbol)`;
  return '';
}

export function normalizePhone(phone) {
  return String(phone ?? '').trim();
}

export function validatePhone(phone, { required = true } = {}) {
  const v = normalizePhone(phone);
  if (!v) return required ? 'Mobile number is required' : '';
  if (!/^\d{10}$/.test(v)) return 'Mobile number must be exactly 10 digits';
  return '';
}

export function normalizeEmail(email) {
  return String(email ?? '').trim().toLowerCase();
}

export function validateEmail(email) {
  const v = normalizeEmail(email);
  if (!v) return 'Email is required';
  if (/\s/.test(v)) return 'Email cannot contain spaces';
  const parts = v.split('@');
  if (parts.length !== 2 || !parts[0]) return 'Enter a valid email address';
  const domain = parts[1];
  if (domain.length < 5) return 'Email must have at least 5 characters after "@"';
  if (!/^[a-z0-9-]+(\.[a-z0-9-]+)+$/.test(domain)) return 'Enter a valid email domain (e.g. gmail.com)';
  return '';
}

// Letter + number + special character, 6+ chars. Same rule everywhere a
// password is set so a password created in one place always works in another.
export function validatePassword(pw) {
  const v = String(pw ?? '');
  if (!v) return 'Password is required';
  if (v.length < 6) return 'Password must be at least 6 characters';
  if (!/[A-Za-z]/.test(v)) return 'Password must include at least one letter';
  if (!/\d/.test(v)) return 'Password must include at least one number';
  if (!/[^A-Za-z0-9]/.test(v)) return 'Password must include at least one special character (e.g. @ # $ !)';
  return '';
}

export function validateSalary(amount) {
  const n = Number(amount);
  if (amount === '' || amount === null || amount === undefined || Number.isNaN(n)) return 'Enter an amount';
  if (n < 200) return 'Amount cannot be less than ₹200';
  return '';
}

export function validateDateRange(joinDate, endDate) {
  if (!joinDate) return 'Join date is required';
  if (endDate && new Date(endDate) < new Date(joinDate)) return 'End date cannot be before the join date';
  return '';
}

// Collects the first error from a { field: errorString } map.
export function firstError(errors) {
  return Object.values(errors).find(Boolean) || '';
}

