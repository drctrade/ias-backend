// ================================
// MODULE SUPABASE - Gestion de la base de données
// ================================

const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;

let supabase = null;

if (SUPABASE_URL && SUPABASE_KEY) {
  supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
  console.log('[SUPABASE] Client initialisé');
} else {
  console.warn('[SUPABASE] Credentials manquants');
}

async function savePackage(packageData) {
  if (!supabase) {
    console.warn('[SUPABASE] Client non initialisé');
    return null;
  }

  try {
    const { data, error } = await supabase
      .from('packages')
      .insert([packageData])
      .select();

    if (error) throw error;

    console.log('[SUPABASE] ✅ Package sauvegardé');
    return data[0];
  } catch (error) {
    console.error('[SUPABASE] Erreur sauvegarde:', error.message);
    throw error;
  }
}

async function getPackages() {
  if (!supabase) {
    return [];
  }

  try {
    const { data, error } = await supabase
      .from('packages')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(10);

    if (error) throw error;

    return data || [];
  } catch (error) {
    console.error('[SUPABASE] Erreur récupération:', error.message);
    return [];
  }
}

module.exports = { savePackage, getPackages };
