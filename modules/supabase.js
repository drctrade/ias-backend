// ================================
// MODULE SUPABASE - Gestion de la base de données
// ================================

const { createClient } = require('@supabase/supabase-js');

// Configuration Supabase
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;

let supabase = null;

// Initialiser le client Supabase si les credentials sont disponibles
if (SUPABASE_URL && SUPABASE_KEY) {
  supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
  console.log('[SUPABASE] Client initialisé');
} else {
  console.warn('[SUPABASE] Credentials manquants - Mode hors ligne');
}

/**
 * Sauvegarde un package dans Supabase
 */
async function savePackage(packageData) {
  if (!supabase) {
    console.warn('[SUPABASE] Client non initialisé');
    return null;
  }

  try {
    // Préparer les données pour Supabase
    const dbData = {
      id: packageData.id,
      company_name: packageData.company_name,
      website_url: packageData.website_url,
      status: packageData.status,
      
      // Audit data
      audit_score: packageData.audit?.score,
      audit_issues: packageData.audit?.issues,
      audit_opportunities: packageData.audit?.opportunities,
      color_palette: packageData.audit?.colors,
      detected_industry: packageData.audit?.industry,
      
      // Deliverables (stockés en JSON)
      html_code: packageData.deliverables?.html_code,
      ai_system_prompt: packageData.deliverables?.ai_system_prompt,
      brand_kit_prompt: packageData.deliverables?.brand_kit_prompt,
      loom_script: packageData.deliverables?.loom_script,
      email_templates: packageData.deliverables?.email_templates,
      
      // PDFs en base64
      audit_report_pdf: packageData.deliverables?.audit_report_pdf,
      proposal_pdf: packageData.deliverables?.proposal_pdf,
      
      // Visuels et prospects
      social_visuals: packageData.deliverables?.social_visuals,
      qualified_prospects: packageData.deliverables?.qualified_prospects,
      
      created_at: packageData.created_at
    };

    const { data, error } = await supabase
      .from('packages')
      .upsert([dbData])
      .select();

    if (error) {
      console.error('[SUPABASE] Erreur sauvegarde package:', error.message);
      throw error;
    }

    console.log('[SUPABASE] Package sauvegardé:', packageData.id);
    return data[0];

  } catch (error) {
    console.error('[SUPABASE] Erreur:', error.message);
    throw error;
  }
}

/**
 * Récupère un package par ID
 */
async function getPackage(packageId) {
  if (!supabase) {
    console.warn('[SUPABASE] Client non initialisé');
    return null;
  }

  try {
    const { data, error } = await supabase
      .from('packages')
      .select('*')
      .eq('id', packageId)
      .single();

    if (error) {
      console.error('[SUPABASE] Erreur récupération package:', error.message);
      return null;
    }

    return data;

  } catch (error) {
    console.error('[SUPABASE] Erreur:', error.message);
    return null;
  }
}

/**
 * Liste tous les packages
 */
async function listPackages(limit = 50) {
  if (!supabase) {
    console.warn('[SUPABASE] Client non initialisé');
    return [];
  }

  try {
    const { data, error } = await supabase
      .from('packages')
      .select('id, company_name, website_url, status, audit_score, detected_industry, created_at')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('[SUPABASE] Erreur liste packages:', error.message);
      return [];
    }

    return data || [];

  } catch (error) {
    console.error('[SUPABASE] Erreur:', error.message);
    return [];
  }
}

/**
 * Récupère les prospects
 */
async function getProspects(limit = 100) {
  if (!supabase) {
    console.warn('[SUPABASE] Client non initialisé');
    return [];
  }

  try {
    const { data, error } = await supabase
      .from('prospects')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('[SUPABASE] Erreur récupération prospects:', error.message);
      return [];
    }

    return data || [];

  } catch (error) {
    console.error('[SUPABASE] Erreur:', error.message);
    return [];
  }
}

/**
 * Sauvegarde un prospect
 */
async function saveProspect(prospectData) {
  if (!supabase) {
    console.warn('[SUPABASE] Client non initialisé');
    return null;
  }

  try {
    const { data, error } = await supabase
      .from('prospects')
      .upsert([prospectData])
      .select();

    if (error) {
      console.error('[SUPABASE] Erreur sauvegarde prospect:', error.message);
      throw error;
    }

    return data[0];

  } catch (error) {
    console.error('[SUPABASE] Erreur:', error.message);
    throw error;
  }
}

/**
 * Met à jour le statut d'un package
 */
async function updatePackageStatus(packageId, status) {
  if (!supabase) {
    console.warn('[SUPABASE] Client non initialisé');
    return null;
  }

  try {
    const { data, error } = await supabase
      .from('packages')
      .update({ status: status, updated_at: new Date().toISOString() })
      .eq('id', packageId)
      .select();

    if (error) {
      console.error('[SUPABASE] Erreur mise à jour statut:', error.message);
      throw error;
    }

    return data[0];

  } catch (error) {
    console.error('[SUPABASE] Erreur:', error.message);
    throw error;
  }
}

/**
 * Supprime un package
 */
async function deletePackage(packageId) {
  if (!supabase) {
    console.warn('[SUPABASE] Client non initialisé');
    return false;
  }

  try {
    const { error } = await supabase
      .from('packages')
      .delete()
      .eq('id', packageId);

    if (error) {
      console.error('[SUPABASE] Erreur suppression package:', error.message);
      return false;
    }

    return true;

  } catch (error) {
    console.error('[SUPABASE] Erreur:', error.message);
    return false;
  }
}

module.exports = {
  savePackage,
  getPackage,
  listPackages,
  getProspects,
  saveProspect,
  updatePackageStatus,
  deletePackage
};
