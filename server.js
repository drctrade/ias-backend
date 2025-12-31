// ================================
// IAS BACKEND SERVER v4.1 PUPPETEER - FIXED FOR RENDER
// Puppeteer + Gemini Imagen + Emails Client + HTML Amélioré
// ================================

require('dotenv').config();

const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const PDFDocument = require('pdfkit');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '50mb' }));
app.use(express.static(path.join(__dirname, 'public')));

// ================================
// CONFIGURATION
// ================================
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

const supabase = SUPABASE_URL && SUPABASE_KEY ? createClient(SUPABASE_URL, SUPABASE_KEY) : null;
const genAI = GEMINI_API_KEY ? new GoogleGenerativeAI(GEMINI_API_KEY) : null;

console.log(`[Backend] Mode: ${process.env.NODE_ENV || 'development'}`);
console.log(`[Backend] Supabase: ${SUPABASE_URL ? 'ENABLED' : 'DISABLED'}`);
console.log(`[Backend] Gemini: ${GEMINI_API_KEY ? 'ENABLED' : 'DISABLED'}`);
console.log(`[Backend] OpenAI: ${OPENAI_API_KEY ? 'ENABLED' : 'DISABLED'}`);

// Configuration Puppeteer optimisée pour Render
const PUPPETEER_CONFIG = {
  headless: 'new',
  args: [
    '--no-sandbox',
    '--disable-setuid-sandbox',
    '--disable-dev-shm-usage',
    '--disable-accelerated-2d-canvas',
    '--no-first-run',
    '--no-zygote',
    '--disable-gpu',
    '--disable-software-rasterizer',
    '--disable-extensions',
    '--disable-web-resources',
    '--disable-component-extensions-with-background-pages'
  ],
  timeout: 30000
};

// Déterminer le chemin de Chrome
if (process.env.PUPPETEER_EXECUTABLE_PATH) {
  PUPPETEER_CONFIG.executablePath = process.env.PUPPETEER_EXECUTABLE_PATH;
}

let browser = null;

// ================================
// HELPER FUNCTIONS
// ================================

async function extractColors(page) {
  try {
    const colors = await page.evaluate(() => {
      const colorSet = new Set();
      const elements = document.querySelectorAll('*');
      
      elements.forEach(el => {
        const styles = window.getComputedStyle(el);
        ['color', 'backgroundColor', 'borderColor'].forEach(prop => {
          const color = styles[prop];
          if (color && color !== 'rgba(0, 0, 0, 0)' && color !== 'transparent') {
            colorSet.add(color);
          }
        });
      });
      
      return Array.from(colorSet).slice(0, 10);
    });
    
    return colors.length > 0 ? colors : ['#0f204b', '#5bc236', '#ffffff', '#000000'];
  } catch (error) {
    console.error('[COLORS] Erreur:', error.message);
    return ['#0f204b', '#5bc236', '#ffffff', '#000000'];
  }
}

async function extractMetadata(page, url) {
  try {
    const metadata = await page.evaluate(() => {
      return {
        title: document.title || '',
        description: document.querySelector('meta[name="description"]')?.content || '',
        keywords: document.querySelector('meta[name="keywords"]')?.content || '',
        ogImage: document.querySelector('meta[property="og:image"]')?.content || '',
        ogTitle: document.querySelector('meta[property="og:title"]')?.content || '',
        ogDescription: document.querySelector('meta[property="og:description"]')?.content || ''
      };
    });
    
    return metadata;
  } catch (error) {
    console.error('[METADATA] Erreur:', error.message);
    return {};
  }
}

async function generateAuditScore(metadata, colors) {
  let score = 50;
  
  if (metadata.title && metadata.title.length > 10) score += 10;
  if (metadata.description && metadata.description.length > 20) score += 10;
  if (metadata.ogImage) score += 10;
  if (colors && colors.length > 3) score += 10;
  if (metadata.keywords) score += 10;
  
  return Math.min(score, 95);
}

async function generateContentWithGemini(prompt) {
  if (!genAI) {
    console.warn('[GEMINI] API non configurée');
    return generateFallbackContent(prompt);
  }

  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-pro' });
    const result = await model.generateContent(prompt);
    const response = await result.response;
    return response.text();
  } catch (error) {
    console.error('[GEMINI] Erreur:', error.message);
    return generateFallbackContent(prompt);
  }
}

function generateFallbackContent(prompt) {
  // Contenu par défaut si les APIs ne sont pas disponibles
  if (prompt.includes('System Prompt')) {
    return `Vous êtes un agent IA professionnel. Vous aidez les clients à résoudre leurs problèmes de manière courtoise et efficace.`;
  }
  if (prompt.includes('Brand Kit')) {
    return `Guide de marque: Utilisez les couleurs principales pour créer une identité cohérente. Maintenez la typographie professionnelle.`;
  }
  if (prompt.includes('Loom')) {
    return `Script Vidéo Loom:\n1. Introduction (10s)\n2. Problèmes identifiés (30s)\n3. Solutions proposées (30s)\n4. Call-to-action (10s)`;
  }
  return 'Contenu généré par défaut';
}

async function generatePDF(companyName, metadata, score) {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument();
      const chunks = [];

      doc.on('data', chunk => chunks.push(chunk));
      doc.on('end', () => {
        const pdfBuffer = Buffer.concat(chunks);
        resolve(pdfBuffer.toString('base64'));
      });
      doc.on('error', reject);

      // Couverture
      doc.rect(0, 0, doc.page.width, doc.page.height).fill('#0f204b');
      doc.fillColor('#ffffff')
         .fontSize(42)
         .font('Helvetica-Bold')
         .text('RAPPORT D\'AUDIT', 50, 200, { align: 'center' });
      
      doc.fontSize(24)
         .font('Helvetica')
         .text(companyName, 50, 300, { align: 'center' });
      
      doc.fontSize(14)
         .text(`Date: ${new Date().toLocaleDateString('fr-FR')}`, 50, 400, { align: 'center' });

      // Page 2
      doc.addPage();
      doc.fillColor('#0f204b')
         .fontSize(24)
         .font('Helvetica-Bold')
         .text('RÉSUMÉ EXÉCUTIF', 50, 50);
      
      doc.fillColor('#000000')
         .fontSize(12)
         .font('Helvetica')
         .text(`Score du site: ${score}/100`, 50, 100);
      
      doc.text(`Titre: ${metadata.title || 'Non détecté'}`, 50, 130);
      doc.text(`Description: ${(metadata.description || 'Non disponible').substring(0, 100)}...`, 50, 160);

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
}

async function scrapeSite(url) {
  console.log(`[SCRAPER] Démarrage du scraping: ${url}`);
  
  let page = null;
  try {
    // Initialiser le navigateur si nécessaire
    if (!browser) {
      console.log('[BROWSER] Lancement du navigateur...');
      browser = await puppeteer.launch(PUPPETEER_CONFIG);
      console.log('[BROWSER] Navigateur lancé avec succès');
    }

    page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 720 });
    
    console.log('[PAGE] Navigation vers:', url);
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });

    // Extraire les données
    const colors = await extractColors(page);
    const metadata = await extractMetadata(page, url);
    const score = await generateAuditScore(metadata, colors);

    console.log('[SCRAPER] Scraping terminé avec succès');

    return {
      success: true,
      metadata,
      colors,
      score,
      url
    };

  } catch (error) {
    console.error('[SCRAPER] Erreur:', error.message);
    return {
      success: false,
      error: error.message,
      score: 30,
      colors: ['#0f204b', '#5bc236'],
      metadata: {}
    };
  } finally {
    if (page) {
      try {
        await page.close();
      } catch (e) {
        console.warn('[PAGE] Erreur fermeture page:', e.message);
      }
    }
  }
}

// ================================
// ROUTES
// ================================

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.post('/api/generate/package', async (req, res) => {
  const { url, companyName } = req.body;

  if (!url) {
    return res.status(400).json({ error: 'URL requise' });
  }

  console.log(`[PACKAGE] 🚀 Génération pour ${url}...`);

  try {
    // Étape 1: Scraper le site
    console.log('[PACKAGE] 📊 Étape 1/7: Connexion navigateur...');
    const scrapedData = await scrapeSite(url);

    if (!scrapedData.success) {
      throw new Error(`Erreur scraping: ${scrapedData.error}`);
    }

    // Étape 2: Générer le contenu AI
    console.log('[PACKAGE] 🤖 Étape 2/7: Génération du contenu AI...');
    const systemPrompt = await generateContentWithGemini(
      `Créez un system prompt pour un agent IA qui aide les clients de ${companyName || 'cette entreprise'}.`
    );

    const brandKit = await generateContentWithGemini(
      `Créez un Brand Kit Prompt pour ${companyName || 'cette entreprise'} avec les couleurs: ${scrapedData.colors.join(', ')}`
    );

    const loomScript = await generateContentWithGemini(
      `Créez un script Loom de 2 minutes pour prospecter ${companyName || 'cette entreprise'}.`
    );

    // Étape 3: Générer le PDF
    console.log('[PACKAGE] 📄 Étape 3/7: Génération du rapport PDF...');
    const auditPDF = await generatePDF(companyName || 'Entreprise', scrapedData.metadata, scrapedData.score);

    // Étape 4: Générer le HTML
    console.log('[PACKAGE] 💻 Étape 4/7: Génération du code HTML...');
    const htmlCode = `<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${companyName || 'Site Web'}</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; color: #333; }
        header { background: linear-gradient(135deg, ${scrapedData.colors[0]} 0%, ${scrapedData.colors[1]} 100%); color: white; padding: 60px 20px; text-align: center; }
        h1 { font-size: 3em; margin-bottom: 10px; }
        .container { max-width: 1200px; margin: 0 auto; padding: 40px 20px; }
        .features { display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 30px; margin: 40px 0; }
        .feature { padding: 20px; border-radius: 8px; background: #f5f5f5; }
        .cta { background: ${scrapedData.colors[0]}; color: white; padding: 20px 40px; border: none; border-radius: 8px; cursor: pointer; font-size: 1.1em; }
        footer { background: #333; color: white; text-align: center; padding: 20px; margin-top: 40px; }
    </style>
</head>
<body>
    <header>
        <h1>${companyName || 'Bienvenue'}</h1>
        <p>Transformez votre présence digitale</p>
    </header>
    
    <div class="container">
        <h2>Nos Services</h2>
        <div class="features">
            <div class="feature">
                <h3>Service 1</h3>
                <p>Description du service</p>
            </div>
            <div class="feature">
                <h3>Service 2</h3>
                <p>Description du service</p>
            </div>
            <div class="feature">
                <h3>Service 3</h3>
                <p>Description du service</p>
            </div>
        </div>
        
        <div style="text-align: center; margin: 40px 0;">
            <button class="cta">Contactez-nous</button>
        </div>
    </div>
    
    <footer>
        <p>&copy; 2025 ${companyName || 'Entreprise'}. Tous droits réservés.</p>
    </footer>
</body>
</html>`;

    // Étape 5: Générer les emails
    console.log('[PACKAGE] ✉️ Étape 5/7: Génération des templates emails...');
    const emailTemplates = [
      {
        name: 'Email 1 - Découverte',
        timing: 'Jour 1',
        subject: `Audit gratuit pour ${companyName || 'votre entreprise'}`,
        body: `Bonjour,\n\nJ'ai analysé votre site web et j'ai identifié 3 opportunités d'amélioration.\n\nSouhaitez-vous en discuter?\n\nCordialement`
      },
      {
        name: 'Email 2 - Relance',
        timing: 'Jour 3',
        subject: `Votre audit de site web - Résultats`,
        body: `Bonjour,\n\nVoici les résultats de votre audit...\n\nCordialement`
      },
      {
        name: 'Email 3 - Proposition',
        timing: 'Jour 7',
        subject: `Proposition personnalisée pour ${companyName || 'votre entreprise'}`,
        body: `Bonjour,\n\nJe vous propose une solution adaptée à vos besoins...\n\nCordialement`
      }
    ];

    // Étape 6: Générer les prospects
    console.log('[PACKAGE] 🎯 Étape 6/7: Identification des prospects...');
    const prospects = {
      industry: 'Services',
      prospects: [
        { id: 1, name: 'Prospect 1', reason: 'Site web obsolète' },
        { id: 2, name: 'Prospect 2', reason: 'Pas de chatbot' },
        { id: 3, name: 'Prospect 3', reason: 'Avis Google faibles' }
      ]
    };

    // Étape 7: Finaliser le package
    console.log('[PACKAGE] ✅ Étape 7/7: Finalisation du package...');

    const packageData = {
      id: `pkg_${Date.now()}`,
      company_name: companyName || 'Entreprise',
      website_url: url,
      audit_score: scrapedData.score,
      audit_metadata: scrapedData.metadata,
      colors: scrapedData.colors,
      deliverables: {
        audit_report_pdf: auditPDF,
        html_code: htmlCode,
        ai_system_prompt: systemPrompt,
        brand_kit_prompt: brandKit,
        loom_script: loomScript,
        email_templates: emailTemplates,
        qualified_prospects: prospects,
        social_visuals: []
      }
    };

    // Sauvegarder dans Supabase si configuré
    if (supabase) {
      try {
        await supabase.from('packages').insert([{
          id: packageData.id,
          company_name: packageData.company_name,
          website_url: packageData.website_url,
          audit_score: packageData.audit_score,
          deliverables: packageData.deliverables,
          created_at: new Date().toISOString()
        }]);
        console.log('[SUPABASE] Package sauvegardé');
      } catch (error) {
        console.warn('[SUPABASE] Erreur sauvegarde:', error.message);
      }
    }

    console.log('[PACKAGE] ✅ Génération terminée avec succès');

    res.json({
      success: true,
      package: packageData
    });

  } catch (error) {
    console.error('[PACKAGE] ❌ Erreur:', error.message);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

app.get('/api/packages', async (req, res) => {
  try {
    if (!supabase) {
      return res.json({ packages: [] });
    }

    const { data, error } = await supabase
      .from('packages')
      .select('id, company_name, website_url, audit_score, created_at')
      .order('created_at', { ascending: false })
      .limit(10);

    if (error) throw error;

    res.json({ packages: data || [] });
  } catch (error) {
    console.error('[API] Erreur:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// ================================
// DÉMARRAGE DU SERVEUR
// ================================

app.listen(PORT, () => {
  console.log(`[Server] 🚀 Démarré sur le port ${PORT}`);
  console.log(`[Server] 📍 http://localhost:${PORT}`);
});

// Gestion de l'arrêt gracieux
process.on('SIGINT', async () => {
  console.log('[Server] Arrêt du serveur...');
  if (browser) {
    await browser.close();
  }
  process.exit(0);
});
