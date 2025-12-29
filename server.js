// ================================
// IAS STEALTH UPGRADE SYSTEM v4.0
// Système complet de génération de packages d'audit
// ================================

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

// Import des modules personnalisés
const scraper = require('./modules/scraper');
const pdfGenerator = require('./modules/pdfGenerator');
const contentGenerator = require('./modules/contentGenerator');
const imageGenerator = require('./modules/imageGenerator');
const prospectFinder = require('./modules/prospectFinder');
const supabaseClient = require('./modules/supabase');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '50mb' }));

// Servir les fichiers statiques
app.use(express.static(path.join(__dirname, 'public')));

// ================================
// HEALTH CHECK
// ================================
app.get('/', (req, res) => {
  res.json({
    status: 'OK',
    version: '4.0.0',
    message: 'IAS Stealth Upgrade System - API Active',
    timestamp: new Date().toISOString(),
    endpoints: {
      health: 'GET /',
      scrape: 'POST /api/scrape/website',
      generatePackage: 'POST /api/generate/package',
      getPackage: 'GET /api/packages/:id',
      listPackages: 'GET /api/packages',
      prospects: 'GET /api/prospects'
    }
  });
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

// ================================
// SCRAPING ENDPOINT
// ================================
app.post('/api/scrape/website', async (req, res) => {
  const { url } = req.body;

  if (!url) {
    return res.status(400).json({ error: 'URL manquante', success: false });
  }

  console.log(`[SCRAPING] 🚀 Analyse de ${url}...`);

  try {
    const scrapedData = await scraper.scrapeWebsite(url);
    console.log(`[SCRAPING] ✅ Terminé ! Score: ${scrapedData.score}/100`);
    res.json({ success: true, data: scrapedData });
  } catch (error) {
    console.error('[SCRAPING] ❌ Erreur:', error.message);
    res.status(500).json({ 
      success: false,
      error: 'Erreur lors du scraping', 
      details: error.message 
    });
  }
});

// ================================
// GÉNÉRATION DE PACKAGE COMPLET
// ================================
app.post('/api/generate/package', async (req, res) => {
  const { url, companyName } = req.body;

  if (!url) {
    return res.status(400).json({ error: 'URL manquante', success: false });
  }

  const packageId = uuidv4();
  console.log(`[PACKAGE] 🚀 Génération du package ${packageId} pour ${url}...`);

  try {
    // Étape 1: Scraping du site
    console.log('[PACKAGE] 📊 Étape 1/7: Scraping du site...');
    const scrapedData = await scraper.scrapeWebsite(url);
    const finalCompanyName = companyName || scrapedData.companyName || extractDomainName(url);

    // Étape 2: Génération du contenu AI
    console.log('[PACKAGE] 📊 Étape 2/7: Génération du contenu AI...');
    const aiContent = await contentGenerator.generateAllContent(finalCompanyName, url, scrapedData);

    // Étape 3: Génération du code HTML GHL
    console.log('[PACKAGE] 📊 Étape 3/7: Génération du code HTML...');
    const htmlCode = contentGenerator.generateHTMLCode(finalCompanyName, scrapedData.colors, url, scrapedData);

    // Étape 4: Génération du rapport PDF
    console.log('[PACKAGE] 📊 Étape 4/7: Génération du rapport PDF...');
    const pdfBase64 = await pdfGenerator.generateAuditPDF(finalCompanyName, url, scrapedData, aiContent);

    // Étape 5: Génération des visuels réseaux sociaux
    console.log('[PACKAGE] 📊 Étape 5/7: Génération des visuels...');
    const socialVisuals = await imageGenerator.generateSocialVisuals(finalCompanyName, scrapedData.colors, scrapedData.industry);

    // Étape 6: Recherche de prospects qualifiés
    console.log('[PACKAGE] 📊 Étape 6/7: Recherche de prospects...');
    const prospects = await prospectFinder.findProspects(scrapedData.industry, finalCompanyName);

    // Étape 7: Génération de la proposition de service
    console.log('[PACKAGE] 📊 Étape 7/7: Génération de la proposition...');
    const proposalPdf = await pdfGenerator.generateProposalPDF(finalCompanyName, url, scrapedData);

    // Compilation du package complet
    const packageData = {
      id: packageId,
      company_name: finalCompanyName,
      website_url: url,
      created_at: new Date().toISOString(),
      status: 'completed',
      
      // Données d'audit
      audit: {
        score: scrapedData.score,
        issues: scrapedData.issues,
        opportunities: scrapedData.opportunities,
        colors: scrapedData.colors,
        fonts: scrapedData.fonts,
        industry: scrapedData.industry
      },

      // Livrables
      deliverables: {
        // 1. Rapport d'Audit PDF
        audit_report_pdf: pdfBase64,
        
        // 2. Code HTML GHL
        html_code: htmlCode,
        
        // 3. System Prompt AI Agent
        ai_system_prompt: aiContent.systemPrompt,
        
        // 4. Pomelli Brand Kit Prompt
        brand_kit_prompt: aiContent.brandKitPrompt,
        
        // 5. 6 Visuels Réseaux Sociaux
        social_visuals: socialVisuals,
        
        // 6. Script Vidéo Loom
        loom_script: aiContent.loomScript,
        
        // 7. Proposition de Service PDF
        proposal_pdf: proposalPdf,
        
        // 8. 10 Prospects Qualifiés
        qualified_prospects: prospects,
        
        // 9. 3 Templates Emails
        email_templates: aiContent.emailTemplates
      }
    };

    // Sauvegarder dans Supabase si configuré
    if (process.env.SUPABASE_URL && process.env.SUPABASE_KEY) {
      try {
        await supabaseClient.savePackage(packageData);
        console.log('[PACKAGE] 💾 Sauvegardé dans Supabase');
      } catch (dbError) {
        console.warn('[PACKAGE] ⚠️ Erreur Supabase (non bloquante):', dbError.message);
      }
    }

    console.log('[PACKAGE] ✅ Package généré avec succès !');

    res.json({
      success: true,
      message: 'Package généré avec succès',
      packageId: packageId,
      package: packageData
    });

  } catch (error) {
    console.error('[PACKAGE] ❌ Erreur:', error.message);
    res.status(500).json({ 
      success: false,
      error: 'Erreur lors de la génération', 
      details: error.message 
    });
  }
});

// ================================
// RÉCUPÉRATION D'UN PACKAGE
// ================================
app.get('/api/packages/:id', async (req, res) => {
  const { id } = req.params;

  try {
    if (process.env.SUPABASE_URL && process.env.SUPABASE_KEY) {
      const packageData = await supabaseClient.getPackage(id);
      if (packageData) {
        return res.json({ success: true, package: packageData });
      }
    }
    res.status(404).json({ success: false, error: 'Package non trouvé' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ================================
// LISTE DES PACKAGES
// ================================
app.get('/api/packages', async (req, res) => {
  try {
    if (process.env.SUPABASE_URL && process.env.SUPABASE_KEY) {
      const { data, error } = await supabase
        .from('packages')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10);
      
      if (error) {
        console.log('[API] Table packages vide ou erreur:', error.message);
        return res.json({ success: true, packages: [] });
      }
      
      return res.json({ success: true, packages: data || [] });
    }
    res.json({ success: true, packages: [] });
  } catch (error) {
    console.error('[API] Erreur:', error.message);
    res.json({ success: true, packages: [] }); // Retourner tableau vide au lieu d'erreur
  }
});

// ================================
// PROSPECTS
// ================================
app.get('/api/prospects', async (req, res) => {
  try {
    if (process.env.SUPABASE_URL && process.env.SUPABASE_KEY) {
      const { data, error } = await supabase
        .from('prospects')
        .select('*')
        .order('score', { ascending: false });
      
      if (error) {
        console.log('[API] Table prospects vide ou erreur:', error.message);
        return res.json({ success: true, prospects: [] });
      }
      
      return res.json({ success: true, prospects: data || [] });
    }
    res.json({ success: true, prospects: [] });
  } catch (error) {
    console.error('[API] Erreur:', error.message);
    res.json({ success: true, prospects: [] }); // Retourner tableau vide au lieu d'erreur
  }
});

// ================================
// UTILITAIRES
// ================================
function extractDomainName(url) {
  try {
    const domain = new URL(url).hostname.replace('www.', '');
    const name = domain.split('.')[0];
    return name.charAt(0).toUpperCase() + name.slice(1);
  } catch {
    return 'Client';
  }
}

// ================================
// DÉMARRAGE DU SERVEUR
// ================================
app.listen(PORT, '0.0.0.0', () => {
  console.log(`
╔══════════════════════════════════════════════════════════════╗
║           🚀 IAS STEALTH UPGRADE SYSTEM v4.0                ║
║  ✅ Serveur démarré sur le port ${PORT}                         ║
║  📊 Endpoints disponibles:                                   ║
║     - GET  /                    Health check                 ║
║     - POST /api/scrape/website  Scraper un site             ║
║     - POST /api/generate/package Générer un package complet ║
║     - GET  /api/packages/:id    Récupérer un package        ║
║     - GET  /api/packages        Lister les packages         ║
║     - GET  /api/prospects       Lister les prospects        ║
╚══════════════════════════════════════════════════════════════╝
  `);
});

module.exports = app;
