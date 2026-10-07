import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import User from '../../models/User.model.js';
import { JWT_SECRET, JWT_EXPIRES_IN } from '../../config/env.js';

export function issueToken(user, tenantId = user.tenantId) {
  const token = jwt.sign(
    { userId: user._id, tenantId, role: user.role },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );
  return {
    token,
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      tenantId,
    },
  };
}

export async function login(email, password) {
  const normalized = String(email || '').trim().toLowerCase();
  // Exact (lowercased) match first; fall back to a case-insensitive match so
  // accounts created before emails were normalised can still log in.
  let user = await User.findOne({ email: normalized, isActive: true });
  if (!user) {
    const escaped = normalized.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    user = await User.findOne({ email: new RegExp(`^${escaped}$`, 'i'), isActive: true });
  }
  if (!user) {
    const err = new Error('Invalid credentials');
    err.statusCode = 401;
    throw err;
  }

  const isMatch = await bcrypt.compare(password, user.passwordHash);
  if (!isMatch) {
    const err = new Error('Invalid credentials');
    err.statusCode = 401;
    throw err;
  }

  return issueToken(user);
}

export async function hashPassword(plainPassword) {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(plainPassword, salt);
}
