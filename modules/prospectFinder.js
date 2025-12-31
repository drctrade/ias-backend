// ================================
// MODULE PROSPECT FINDER - Recherche de prospects qualifiés
// ================================

async function findProspects(industry, companyName) {
  console.log(`[PROSPECTS] Recherche pour l'industrie: ${industry}`);

  const prospects = [
    { name: 'ABC Corp', reason: 'Site obsolète' },
    { name: 'XYZ Ltd', reason: 'Pas de chatbot' },
    { name: 'Demo Inc', reason: 'Mauvais design' }
  ];

  console.log('[PROSPECTS] ✅ 3 prospects trouvés');

  return {
    industry,
    prospects,
    count: prospects.length
  };
}

module.exports = { findProspects };
