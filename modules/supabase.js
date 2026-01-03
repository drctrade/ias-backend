import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Buckets (create in Supabase Storage)
// - ias-assets (public): stores images + pdfs
const DEFAULT_BUCKET = process.env.SUPABASE_BUCKET || 'ias-assets';

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.warn('[SUPABASE] Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY. Database/storage calls will fail.');
}

export const supabase = createClient(SUPABASE_URL || '', SUPABASE_SERVICE_ROLE_KEY || '', {
  auth: { persistSession: false },
});

export const buckets = {
  assets: DEFAULT_BUCKET,
};

export async function getPackageById(id) {
  const { data, error } = await supabase.from('packages').select('*').eq('id', id).single();
  if (error) throw error;
  return data;
}

export async function listPackages(limit = 25) {
  const { data, error } = await supabase
    .from('packages')
    .select('id,company_name,website_url,status,audit_score,created_at,updated_at')
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data || [];
}

export async function upsertPackage(row) {
  const { data, error } = await supabase.from('packages').upsert(row).select('*').single();
  if (error) throw error;
  return data;
}

export async function updatePackage(id, patch) {
  const { data, error } = await supabase
    .from('packages')
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select('*')
    .single();
  if (error) throw error;
  return data;
}

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
    cacheControl: '3600',
  });
  if (error) throw error;
  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  return { bucket, path, publicUrl: data?.publicUrl || null };
}

export async function downloadBuffer({ bucket = buckets.assets, path }) {
  const { data, error } = await supabase.storage.from(bucket).download(path);
  if (error) throw error;
  const arrayBuffer = await data.arrayBuffer();
  return Buffer.from(arrayBuffer);
}
