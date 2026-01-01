// ================================
// IAS STEALTH UPGRADE SYSTEM v4.1
// Architecture modulaire restaurée
// ================================

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');

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

// Stream Audit PDF (no base64 decoding in browser)
app.get('/api/packages/:id/pdf/audit', async (req, res) => {
  try {
    const { id } = req.params;
    const pkg = await supabaseClient.getPackageById(id);

    if (!pkg || !pkg.audit_report_pdf) {
      return res.status(404).json({ success: false, error: 'PDF non trouvé' });
    }

    let base64Data = pkg.audit_report_pdf;
    if (typeof base64Data === 'string' && base64Data.startsWith('data:application/pdf;base64,')) {
      base64Data = base64Data.replace('data:application/pdf;base64,', '');
    }

    const buffer = Buffer.from(base64Data, 'base64');

    const download = req.query.download === '1' || req.query.download === 'true';
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Length', buffer.length);
    res.setHeader('Content-Disposition', `${download ? 'attachment' : 'inline'}; filename="audit_${(pkg.company_name || 'company').replace(/\s+/g,'_')}.pdf"`);

    return res.send(buffer);
  } catch (error) {
    console.error('[API] Erreur stream audit PDF:', error.message);
    return res.status(500).json({ success: false, error: 'Erreur serveur PDF' });
  }
});

// Stream Proposal PDF
app.get('/api/packages/:id/pdf/proposal', async (req, res) => {
  try {
    const { id } = req.params;
    const pkg = await supabaseClient.getPackageById(id);

    if (!pkg || !pkg.proposal_pdf) {
      return res.status(404).json({ success: false, error: 'PDF non trouvé' });
    }

    let base64Data = pkg.proposal_pdf;
    if (typeof base64Data === 'string' && base64Data.startsWith('data:application/pdf;base64,')) {
      base64Data = base64Data.replace('data:application/pdf;base64,', '');
    }

    const buffer = Buffer.from(base64Data, 'base64');

    const download = req.query.download === '1' || req.query.download === 'true';
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Length', buffer.length);
    res.setHeader('Content-Disposition', `${download ? 'attachment' : 'inline'}; filename="proposition_${(pkg.company_name || 'company').replace(/\s+/g,'_')}.pdf"`);

    return res.send(buffer);
  } catch (error) {
    console.error('[API] Erreur stream proposal PDF:', error.message);
    return res.status(500).json({ success: false, error: 'Erreur serveur PDF' });
  }
});


// Generate complete package
app.post('/api/generate/package', async (req, res) => {
  const { url, companyName } = req.body;

  if (!url) {
    return res.status(400).json({ error: 'URL requise' });
  }

  console.log(`[PACKAGE] 🚀 Génération pour ${url}...`);

  try {
    console.log(`[PACKAGE] 📊 Étape 1/7: Connexion navigateur...`);
    
    console.log(`[PACKAGE] 📊 Étape 2/7: Scraping du site...`);
    const scrapedData = await scraper.scrapeWebsite(url);

    const finalCompanyName = companyName || scrapedData.title || 'Entreprise';

    console.log(`[PACKAGE] 📊 Étape 3/7: Génération HTML GHL avec GPT-4...`);
    const aiContent = await contentGenerator.generateAllContent(finalCompanyName, url, scrapedData);

    console.log(`[PACKAGE] 📊 Étape 4/7: Génération code HTML complet...`);
    const htmlCode = await htmlGenerator.generateModernHTML(finalCompanyName, url, scrapedData, aiContent);

    console.log(`[PACKAGE] 📊 Étape 5/7: Génération visuels Gemini...`);
    const socialVisuals = await imageGenerator.generateSocialVisuals(finalCompanyName, scrapedData.colors, scrapedData.industry);

    console.log(`[PACKAGE] 📊 Étape 6/7: Génération PDF...`);
    const auditPDF = await pdfGenerator.generateAuditPDF(finalCompanyName, url, scrapedData, aiContent);
    const providerLogoUrl = process.env.PROVIDER_LOGO_URL || 'https://storage.googleapis.com/msgsndr/3JVjplwbMF0mBlGPnSIp/media/67d72a6b1031c95c8a996682.png';
    const proposalPDF = await pdfGenerator.generateProposalPDF(finalCompanyName, url, scrapedData, providerLogoUrl);

    console.log(`[PACKAGE] 📊 Étape 7/7: Sauvegarde Supabase...`);
    const packageData = {
      company_name: finalCompanyName,
      website_url: url,
      status: 'completed',
      audit_score: scrapedData.score,
      audit_issues: scrapedData.issues,
      color_palette: { colors: scrapedData.colors },
      detected_industry: scrapedData.industry,
      detected_language: scrapedData.language,
      detected_region: scrapedData.region,
      site_meta: scrapedData.meta,
      site_headings: scrapedData.headings,
      html_code: htmlCode,
      ai_system_prompt: aiContent.systemPrompt,
      brand_kit_prompt: aiContent.brandKitPrompt,
      loom_script: aiContent.loomScript,
      email_templates: aiContent.emailTemplates,
      audit_report_pdf: auditPDF,
      proposal_pdf: proposalPDF,
      social_visuals: socialVisuals,
      created_at: new Date().toISOString()
    };

    const savedPackage = await supabaseClient.savePackage(packageData);

    console.log(`[PACKAGE] ✅ Package sauvegardé !`);

    res.json({
      success: true,
      message: 'Package généré avec succès',
      package: savedPackage || packageData
    });

  } catch (error) {
    console.error('[PACKAGE] ❌ Erreur:', error.message);
    res.status(500).json({
      error: 'Erreur génération package',
      details: error.message
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