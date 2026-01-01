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

    console.log(`[PACKAGE] 📊 Étape 3/7: Génération HTML GHL...`);
    const htmlCode = generateHTMLCode(finalCompanyName, scrapedData.colors, scrapedData.logoUrl, scrapedData.sections, url);

    console.log(`[PACKAGE] 📊 Étape 4/7: Génération contenus IA...`);
    const aiContent = await contentGenerator.generateAllContent(finalCompanyName, url, scrapedData);

    console.log(`[PACKAGE] 📊 Étape 5/7: Génération visuels Gemini...`);
    const socialVisuals = await imageGenerator.generateSocialVisuals(finalCompanyName, scrapedData.colors, scrapedData.industry);

    console.log(`[PACKAGE] 📊 Étape 6/7: Génération PDF...`);
    const auditPDF = await pdfGenerator.generateAuditPDF(finalCompanyName, url, scrapedData, aiContent);
    const proposalPDF = await pdfGenerator.generateProposalPDF(finalCompanyName, url, scrapedData);

    console.log(`[PACKAGE] 📊 Étape 7/7: Sauvegarde Supabase...`);
    const packageData = {
      company_name: finalCompanyName,
      website_url: url,
      status: 'completed',
      audit_score: scrapedData.score,
      audit_issues: scrapedData.issues,
      color_palette: { colors: scrapedData.colors },
      detected_industry: scrapedData.industry,
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
// HELPER FUNCTIONS
// ================================

function generateHTMLCode(companyName, colors, logoUrl, sections, siteUrl) {
  const primaryColor = colors[0] || '#5bc236';
  const secondaryColor = colors[1] || '#0f204b';
  
  const sectionsHTML = sections.slice(0, 3).map((sec, i) => `
    <section class="py-16 ${i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}">
        <div class="container mx-auto px-4">
            <h2 class="text-4xl font-bold text-center mb-12">${sec.title}</h2>
            <p class="text-center text-gray-600">Contenu à personnaliser</p>
        </div>
    </section>
  `).join('\n');
  
  const logoHTML = logoUrl ? `<img src="${logoUrl}" alt="${companyName} Logo" class="h-12">` : `<h1 class="text-3xl font-bold">${companyName}</h1>`;
  
  return `<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${companyName} - Site Modernisé</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <style>
        :root {
            --primary: ${primaryColor};
            --secondary: ${secondaryColor};
        }
        .gradient-bg {
            background: linear-gradient(135deg, var(--primary) 0%, var(--secondary) 100%);
        }
    </style>
</head>
<body>
    <header class="gradient-bg text-white py-4">
        <div class="container mx-auto px-4 flex justify-between items-center">
            ${logoHTML}
            <nav>
                <button class="bg-white text-gray-900 px-6 py-2 rounded-full font-bold">Contact</button>
            </nav>
        </div>
    </header>

    ${sectionsHTML}

    <footer class="bg-gray-900 text-white py-8 text-center">
        <p>&copy; 2025 ${companyName}. Site original: <a href="${siteUrl}" class="underline">${siteUrl}</a></p>
    </footer>
</body>
</html>`;
}

// ================================
// START SERVER
// ================================

app.listen(PORT, () => {
  console.log(`[Server] 🚀 Démarré sur le port ${PORT}`);
  console.log(`[Server] 📍 http://localhost:${PORT}`);
});
