import dotenv from 'dotenv';
dotenv.config();

const required = ['MONGO_URI', 'JWT_SECRET'];

for (const key of required) {
  if (!process.env[key]) {
    throw new Error(`Missing required env var: ${key}`);
  }
}

export const PORT = process.env.PORT || 5000;
export const MONGO_URI = process.env.MONGO_URI;
export const JWT_SECRET = process.env.JWT_SECRET;
export const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';
export const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || '*';
// Base URL of the CUSTOMER-facing frontend — used when generating table QR
// codes (they must point at the customer app, not the admin app or the API).
export const CUSTOMER_APP_URL = process.env.CUSTOMER_APP_URL || 'http://localhost:5175';

// Web Push (browser notifications for offers/announcements). This pair works
// out of the box; generate your own with `npx web-push generate-vapid-keys`
// for production so you control the private key.
export const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY
  || 'BJ76ahcOJmkAfWHMQ7y9dHqy2BTsMAI1T1kA8XAlXFm5_6sFG9NLqYyWKzjr21JFLumSRWNDKzK9iE6KPpb63xs';
export const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY
  || 'VMpguGTWAYv4o4Lp_WoJ9YCgTyei6uK8W44tkLuP29k';
export const VAPID_SUBJECT = process.env.VAPID_SUBJECT || 'mailto:admin@example.com';

// Cloudinary (image hosting) — optional. If unset, uploaded images just stay
// as base64 data URIs in MongoDB (works, but bloats documents). Set these to
// offload images to Cloudinary instead.
export const CLOUDINARY_CLOUD_NAME = process.env.CLOUDINARY_CLOUD_NAME || '';
export const CLOUDINARY_API_KEY = process.env.CLOUDINARY_API_KEY || '';
export const CLOUDINARY_API_SECRET = process.env.CLOUDINARY_API_SECRET || '';
