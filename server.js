// ================================
// IAS STEALTH UPGRADE SYSTEM v4.1
// Architecture modulaire restaurée
// ================================

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
const crypto = require('crypto');

// Import des modules
const scraper = require('./modules/scraper');
const pdfGenerator = require('./modules/pdfGenerator');
const contentGenerator = require('./modules/contentGenerator');
const imageGenerator = require('./modules/imageGenerator');
const htmlGenerator = require('./modules/htmlGenerator');
const prospectFinder = require('./modules/prospectFinder');
const supabaseClient = require('./modules/supabase');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '50mb' }));

console.log('[Backend] Mode:', process.env.NODE_ENV || 'development');
console.log('[Backend] Gemini:', process.env.GEMINI_API_KEY ? 'ENABLED' : 'DISABLED');
console.log('[Backend] OpenAI:', process.env.OPENAI_API_KEY ? 'ENABLED' : 'DISABLED');

// ================================
// API ENDPOINTS
// ================================

// Health check
app.get('/', (req, res) => {
  res.json({
    status: 'OK',
    version: '4.1',
    features: ['Scraping', 'Gemini Imagen', 'PDF', 'Puppeteer', 'Prospects']
  });
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});


// PDF streaming endpoints (robust preview + download without base64 decoding in the browser)
app.get('/api/packages/:id/pdf/:type', async (req, res) => {
  try {
    const { id, type } = req.params;
    const download = req.query.download === '1';

    const pkg = await supabaseClient.getPackageById(id);
    if (!pkg) return res.status(404).json({ error: 'Package introuvable' });

    const field = type === 'audit' ? 'audit_report_pdf' : (type === 'proposal' ? 'proposal_pdf' : null);
    if (!field) return res.status(400).json({ error: 'Type PDF invalide' });

    let b64 = pkg[field];
    if (!b64) return res.status(404).json({ error: 'PDF introuvable' });

    // Accept raw base64 or data URL
    if (typeof b64 === 'string' && b64.startsWith('data:')) {
      const comma = b64.indexOf(',');
      b64 = comma >= 0 ? b64.slice(comma + 1) : b64;
    }

    const buffer = Buffer.from(b64, 'base64');

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Length', buffer.length);
    res.setHeader('Cache-Control', 'no-store');

    const filename = `${(pkg.company_name || 'package').replace(/\s+/g, '_')}_${type}.pdf`;
    if (download) {
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    } else {
      res.setHeader('Content-Disposition', `inline; filename="${filename}"`);
    }

    return res.end(buffer);
  } catch (error) {
    console.error('[PDF] ❌ Erreur:', error.message);
    return res.status(500).json({ error: 'Erreur PDF', details: error.message });
  }
});

// Get packages
app.get('/api/packages', async (req, res) => {
  try {
    const packages = await supabaseClient.getPackages();
    res.json({ success: true, packages });
  } catch (error) {
    console.error('[API] Erreur packages:', error.message);
    res.json({ success: true, packages: [] });
  }
});

// Get single package by ID
app.get('/api/packages/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const pkg = await supabaseClient.getPackageById(id);
    if (pkg) {
      res.json({ success: true, package: pkg });
    } else {
      res.status(404).json({ success: false, error: 'Package non trouvé' });
    }
  } catch (error) {
    console.error('[API] Erreur package:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Generate complete package
app.post('/api/generate/package', async (req, res) => {
  const { url, companyName } = req.body;

  if (!url) {
    return res.status(400).json({ error: 'URL requise' });
  }

  // IMPORTANT: we persist progressively so we never lose a generation if a late step fails.
  const packageId = crypto.randomUUID();
  let packageSnapshot = {
    id: packageId,
    company_name: companyName || null,
    website_url: url,
    status: 'processing',
    created_at: new Date().toISOString()
  };

  console.log(`[PACKAGE] 🚀 Génération pour ${url}... (id=${packageId})`);

  try {
    // Save the initial row immediately (so it appears in "Packages récents" even if something fails later)
    packageSnapshot = await supabaseClient.savePackage(packageSnapshot);

    console.log(`[PACKAGE] 📊 Étape 1/7: Connexion navigateur...`);

    console.log(`[PACKAGE] 📊 Étape 2/7: Scraping du site...`);
    const scrapedData = await scraper.scrapeWebsite(url);

    const finalCompanyName = companyName || scrapedData.title || 'Entreprise';

    // Persist scraped insights right away
    packageSnapshot = await supabaseClient.savePackage({
      ...packageSnapshot,
      company_name: finalCompanyName,
      audit_score: scrapedData.score,
      audit_issues: scrapedData.issues,
      audit_opportunities: scrapedData.opportunities,
      color_palette: scrapedData.colors,
      detected_industry: scrapedData.industry,
      status: 'processing_scraped'
    });

    console.log(`[PACKAGE] 📊 Étape 3/7: Génération HTML GHL avec GPT-4...`);
        const aiContent = await contentGenerator.generateAllContent(finalCompanyName, url, scrapedData);

    packageSnapshot = await supabaseClient.savePackage({
      ...packageSnapshot,
      ai_system_prompt: aiContent.systemPrompt,
      brand_kit_prompt: aiContent.brandKitPrompt,
      loom_script: aiContent.loomScript,
      email_templates: aiContent.emailTemplates,
      status: 'processing_content'
    });

    console.log(`[PACKAGE] 📊 Étape 4/7: Génération code HTML complet...`);
    const htmlCode = await htmlGenerator.generateGHLHtml({
      companyName: finalCompanyName,
      websiteUrl: url,
      auditData: scrapedData,
      aiContent
    });

    packageSnapshot = await supabaseClient.savePackage({
      ...packageSnapshot,
      html_code: htmlCode,
      status: 'processing_html'
    });

    console.log(`[PACKAGE] 📊 Étape 5/7: Génération visuels (gpt-image-1)...`);
    const socialVisuals = await imageGenerator.generateVisuals({
      companyName: finalCompanyName,
      websiteUrl: url,
      auditData: scrapedData,
      aiContent
    });

    packageSnapshot = await supabaseClient.savePackage({
      ...packageSnapshot,
      social_visuals: socialVisuals,
      status: 'processing_images'
    });

    console.log(`[PACKAGE] 📊 Étape 6/7: Génération PDF...`);
    const auditPDF = await pdfGenerator.generateAuditPDF({
      companyName: finalCompanyName,
      websiteUrl: url,
      auditData: scrapedData,
      aiContent
    });

    packageSnapshot = await supabaseClient.savePackage({
      ...packageSnapshot,
      audit_report_pdf: auditPDF,
      status: 'processing_audit_pdf'
    });

    const proposalPDF = await pdfGenerator.generateProposalPDF({
      companyName: finalCompanyName,
      websiteUrl: url,
      auditData: scrapedData,
      aiContent
    });

    packageSnapshot = await supabaseClient.savePackage({
      ...packageSnapshot,
      proposal_pdf: proposalPDF,
      status: 'processing_proposal_pdf'
    });

    console.log(`[PACKAGE] 📊 Étape 7/7: Recherche prospects...`);
    const prospects = await prospectFinder.findQualifiedProspects({
      companyName: finalCompanyName,
      websiteUrl: url,
      auditData: scrapedData
    });

    packageSnapshot = await supabaseClient.savePackage({
      ...packageSnapshot,
      qualified_prospects: prospects,
      status: 'completed'
    });

    console.log(`[PACKAGE] ✅ Package généré et sauvegardé !`);

    res.json({
      success: true,
      message: 'Package généré avec succès',
      package: packageSnapshot
    });

  } catch (error) {
    console.error('[PACKAGE] ❌ Erreur:', error.message);

    // Persist failure state but keep partial results
    try {
      await supabaseClient.savePackage({
        ...packageSnapshot,
        status: 'error',
      });
    } catch (e) {
      // ignore secondary failure
    }

    res.status(500).json({
      error: 'Erreur génération package',
      details: error.message,
      packageId: packageId
    });
  }
});


// ================================
// START SERVER
// ================================

app.listen(PORT, () => {
  console.log(`[Server] 🚀 Démarré sur le port ${PORT}`);
  console.log(`[Server] 📍 http://localhost:${PORT}`);
});
