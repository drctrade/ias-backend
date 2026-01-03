import { createClient } from '@supabase/supabase-js';

// Support both the new env var name and your older one to avoid redeploy headaches
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_KEY ||                // legacy
  process.env.SUPABASE_SERVICE_KEY;          // legacy alt

const DEFAULT_BUCKET = process.env.SUPABASE_BUCKET || 'ias-assets';

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.warn('[SUPABASE] Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY (or SUPABASE_KEY). Database/storage calls will fail.');
}

export const supabase = createClient(SUPABASE_URL || '', SUPABASE_SERVICE_ROLE_KEY || '', {
  auth: { persistSession: false },
});

export const buckets = {
  assets: process.env.SUPABASE_BUCKET || DEFAULT_BUCKET,
};

/**
 * Insert or update a package row (id must exist on the payload)
 * Uses Postgres UPSERT semantics.
 */
export async function upsertPackage(payload) {
  const { data, error } = await supabase
    .from('packages')
    .upsert(payload, { onConflict: 'id' })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updatePackage(id, patch) {
  const { data, error } = await supabase
    .from('packages')
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function getPackageById(id) {
  const { data, error } = await supabase
    .from('packages')
    .select('*')
    .eq('id', id)
    .single();

  if (error) throw error;
  return data;
}

export async function listPackages(limit = 25) {
  const { data, error } = await supabase
    .from('packages')
    .select('id, company_name, website_url, status, audit_score, detected_industry, created_at, updated_at')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data || [];
}

/**
 * Storage helpers
 */
export async function uploadBuffer({ bucket = buckets.assets, path, buffer, contentType }) {
  const { error } = await supabase.storage
    .from(bucket)
    .upload(path, buffer, { contentType, upsert: true });

  if (error) throw error;

  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  return data?.publicUrl || null;
}

export async function downloadBuffer({ bucket = buckets.assets, path }) {
  const { data, error } = await supabase.storage.from(bucket).download(path);
  if (error) throw error;
  const ab = await data.arrayBuffer();
  return Buffer.from(ab);
}
