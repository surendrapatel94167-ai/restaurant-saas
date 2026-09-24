import { v2 as cloudinary } from 'cloudinary';
import { CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET } from '../config/env.js';

const configured = Boolean(CLOUDINARY_CLOUD_NAME && CLOUDINARY_API_KEY && CLOUDINARY_API_SECRET);

if (configured) {
  cloudinary.config({
    cloud_name: CLOUDINARY_CLOUD_NAME,
    api_key: CLOUDINARY_API_KEY,
    api_secret: CLOUDINARY_API_SECRET,
  });
}

/**
 * If `value` is a base64 data URI (what every upload form in this app sends),
 * upload it to Cloudinary and return the hosted URL. Otherwise (already a
 * URL, empty, undefined) return it untouched. If Cloudinary isn't configured
 * or the upload fails, falls back to keeping the original base64 — so image
 * uploads never hard-break just because Cloudinary isn't set up yet.
 */
export async function uploadIfBase64(value, folder = 'restaurant-saas') {
  if (!value || typeof value !== 'string' || !value.startsWith('data:')) return value;
  if (!configured) return value;
  try {
    const result = await cloudinary.uploader.upload(value, { folder, resource_type: 'image' });
    return result.secure_url;
  } catch (err) {
    console.error('[cloudinary] upload failed, keeping original value:', err.message);
    return value;
  }
}

export const isCloudinaryConfigured = configured;
