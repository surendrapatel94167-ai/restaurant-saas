import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { CLIENT_ORIGIN } from './config/env.js';
import errorHandler from './middlewares/errorHandler.js';
import sanitizeInput from './middlewares/sanitizeInput.js';

import authRoutes from './modules/auth/auth.routes.js';
import menuRoutes from './modules/menu/menu.routes.js';
import customerRoutes from './modules/customer/customer.routes.js';
import orderRoutes from './modules/orders/orders.routes.js';
import kdsRoutes from './modules/kds/kds.routes.js';
import hrRoutes from './modules/hr/hr.routes.js';
import financeRoutes from './modules/finance/finance.routes.js';
import superAdminRoutes from './modules/super-admin/superAdmin.routes.js';
import reviewRoutes from './modules/reviews/review.routes.js';
import tenantRoutes from './modules/tenant/tenant.routes.js';
import notificationRoutes from './modules/notifications/notification.routes.js';
import staffRoutes from './modules/staff/staff.routes.js';
import tablesRoutes from './modules/tables/tables.routes.js';
import customersRoutes from './modules/customers/customers.routes.js';
import analyticsRoutes from './modules/analytics/analytics.routes.js';
import couponsRoutes from './modules/coupons/coupons.routes.js';
import platformSettingsRoutes from './modules/platform-settings/platformSettings.routes.js';

const app = express();

const allowedOrigins = CLIENT_ORIGIN.split(',').map((o) => o.trim()).filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    // No origin = server-to-server / curl / Postman — allow it.
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) return callback(null, true);
    // Dev convenience: allow any localhost/127.0.0.1 port (customer + admin
    // frontends often land on different Vite ports like 5173/5174/5175...).
    if (/^https?:\/\/(localhost|127\.0\.0\.1):\d+$/.test(origin)) return callback(null, true);
    callback(new Error(`CORS blocked for origin: ${origin}`));
  },
  credentials: true,
}));
// Default is 100kb — too small since images (profile photos, menu photos,
// logos, attendance selfies) are sent as base64 JSON, not multipart.
app.use(express.json({ limit: '10mb' }));

// Security hardening:
// - helmet: sets safe HTTP headers (X-Frame-Options, no-sniff, HSTS, etc.)
// - sanitizeInput: strips any $ / . keys from req.body/query/params in place
//   (a crafted request like { email: { "$gt": "" } } can't be used for NoSQL
//   injection). Hand-rolled instead of express-mongo-sanitize, which crashes
//   on Express 4.19+ by trying to reassign req.query (now getter-only).
app.use(helmet({ crossOriginResourcePolicy: false }));
app.use(sanitizeInput());

// General API rate limit — generous, just to blunt scraping/abuse.
app.use('/api', rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many requests — please slow down and try again shortly.' },
}));

app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

app.use('/api/auth', authRoutes);
app.use('/api/menu', menuRoutes);
app.use('/api/customer', customerRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/kds', kdsRoutes);
app.use('/api/hr', hrRoutes);
app.use('/api/finance', financeRoutes);
app.use('/api/super-admin', superAdminRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/tenant', tenantRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/staff', staffRoutes);
app.use('/api/tables', tablesRoutes);
app.use('/api/customers', customersRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/coupons', couponsRoutes);
app.use('/api/platform-settings', platformSettingsRoutes);

app.use((req, res) => res.status(404).json({ message: 'Route not found' }));
app.use(errorHandler);

export default app;
