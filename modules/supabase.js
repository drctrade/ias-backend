import { createClient } from '@supabase/supabase-js';

/**
 * ENV expected (server-side):
 * - SUPABASE_URL
 * - SUPABASE_SERVICE_ROLE_KEY  (preferred)
 * Optional backwards-compat:
 * - SUPABASE_KEY (if you already used this name, we fall back to it)
 */
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_KEY || // backward compat with older setups
  '';

const DEFAULT_BUCKET = process.env.SUPABASE_BUCKET || 'ias-assets';

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.warn('[SUPABASE] Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY (or SUPABASE_KEY fallback). Database/storage calls will fail.');
}

export const supabase = createClient(SUPABASE_URL || '', SUPABASE_SERVICE_ROLE_KEY || '', {
  auth: { persistSession: false },
});

export const buckets = {
  assets: DEFAULT_BUCKET,
};

export function safeJson(value, fallback) {
  try {
    if (value === null || value === undefined) return fallback;
    if (typeof value === 'string') return JSON.parse(value);
    return value;
  } catch {
    return fallback;
  }
}

export async function uploadBuffer({ bucket = buckets.assets, path, buffer, contentType }) {
  const { error } = await supabase.storage.from(bucket).upload(path, buffer, {
    contentType,
    upsert: true,
  });
  if (error) throw error;
  return { bucket, path };
}

export async function uploadBase64({ bucket = buckets.assets, path, base64, contentType }) {
  const buffer = Buffer.from(base64, 'base64');
  return uploadBuffer({ bucket, path, buffer, contentType });
}

export function getPublicUrl({ bucket = buckets.assets, path }) {
  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  return data?.publicUrl || null;
}
