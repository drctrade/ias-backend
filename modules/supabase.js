// ================================
// MODULE SUPABASE - Gestion de la base de données
// ================================

const { createClient } = require('@supabase/supabase-js');
const crypto = require('crypto');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;

let supabase = null;

if (SUPABASE_URL && SUPABASE_KEY) {
  supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
  console.log('[SUPABASE] Client initialisé');
} else {
  console.warn('[SUPABASE] ⚠️ SUPABASE_URL ou SUPABASE_KEY manquant. Mode offline.');
}

// Helper: safely ensure a UUID exists
function ensureId(pkg = {}) {
  return pkg.id || crypto.randomUUID();
}

/**
 * Upsert a package (insert or update by id).
 * This is intentionally idempotent so we can save partial results at every step.
 */
async function savePackage(packageData) {
  if (!supabase) return packageData;

  const payload = { ...packageData };
  payload.id = ensureId(payload);

  // Keep updated_at fresh on every save
  payload.updated_at = new Date().toISOString();

  try {
    const { data, error } = await supabase
      .from('packages')
      .upsert(payload, { onConflict: 'id' })
      .select('*')
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('[SUPABASE] Erreur sauvegarde package:', error.message);
    // Fallback: return payload so the app can keep running even if Supabase fails
    return payload;
  }
}

async function getPackages(limit = 10) {
  if (!supabase) return [];

  try {
    const { data, error } = await supabase
      .from('packages')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('[SUPABASE] Erreur recuperation packages:', error.message);
    return [];
  }
}

async function getPackageById(id) {
  if (!supabase) return null;

  try {
    const { data, error } = await supabase
      .from('packages')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('[SUPABASE] Erreur recuperation package:', error.message);
    return null;
  }
}

module.exports = { savePackage, getPackages, getPackageById };
