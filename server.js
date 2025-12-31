// ================================
// IAS BACKEND SERVER v4.1 PUPPETEER
// Puppeteer + Gemini Imagen + Emails Client + HTML Amélioré
// ================================

require('dotenv').config();

const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const puppeteer = require('puppeteer');
const { createClient } = require('@supabase/supabase-js');
const { GoogleGenerativeAI } = require('@google/generative-ai');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '50mb' }));

// ================================
// CONFIGURATION
// ================================
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

if (!SUPABASE_KEY) throw new Error("supabaseKey is required.");

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
const genAI = GEMINI_API_KEY ? new GoogleGenerativeAI(GEMINI_API_KEY) : null;

console.log(`[Backend] Mode: ${process.env.NODE_ENV || 'development'}`);
console.log(`[Backend] Gemini: ${GEMINI_API_KEY ? 'ENABLED' : 'DISABLED'}`);
console.log(`[Backend] OpenAI: ${OPENAI_API_KEY ? 'ENABLED' : 'DISABLED'}`);

const PUPPETEER_CONFIG = {
  headless: true,
  args: [
    '--no-sandbox',
    '--disable-setuid-sandbox',
    '--disable-dev-shm-usage',
    '--disable-accelerated-2d-canvas',
    '--no-first-run',
    '--no-zygote',
    '--disable-gpu',
    '--disable-software-rasterizer',
    '--disable-extensions'
  ],
  ...(process.env.PUPPETEER_EXECUTABLE_PATH && {
    executablePath: process.env.PUPPETEER_EXECUTABLE_PATH
  })
};

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

async function extractLogo(page) {
  try {
    const logoUrl = await page.evaluate(() => {
      const selectors = [
        'img[alt*="logo" i]',
        'img.logo',
        '.logo img',
        'header img:first-of-type',
        '.header img:first-of-type',
        'nav img:first-of-type'
      ];
      
      for (const selector of selectors) {
        const img = document.querySelector(selector);
        if (img && img.src) return img.src;
      }
      return null;
    });
    
    return logoUrl;
  } catch (error) {
    console.error('[LOGO] Erreur:', error.message);
    return null;
  }
}

async function extractSections(page) {
  try {
    const sections = await page.evaluate(() => {
      const foundSections = [];
      const sectionTags = ['header', 'section', 'main', 'article', 'footer'];
      
      sectionTags.forEach(tag => {
        const elements = document.querySelectorAll(tag);
        elements.forEach((el, idx) => {
          const heading = el.querySelector('h1, h2, h3');
          const title = heading ? heading.textContent.trim() : `${tag.toUpperCase()} ${idx + 1}`;
          foundSections.push({ tag, title });
        });
      });
      
      return foundSections.slice(0, 8);
    });
    
    return sections;
  } catch (error) {
    console.error('[SECTIONS] Erreur:', error.message);
    return [];
  }
}

async function analyzeIssues(page) {
  try {
    const issues = await page.evaluate(() => {
      const problems = [];
      
      if (!document.querySelector('meta[name="viewport"]')) {
        problems.push('Site non-responsive');
      }
      
      const hasChatbot = document.querySelector('[class*="chat"]') || 
                        document.querySelector('[id*="chat"]');
      if (!hasChatbot) {
        problems.push('Pas de chatbot IA');
      }
      
      const ctaButtons = document.querySelectorAll('a[href*="contact"], button[class*="cta"]');
      if (ctaButtons.length < 2) {
        problems.push('Manque de CTA');
      }
      
      return problems.length > 0 ? problems : ['Aucun problème majeur'];
    });
    
    return issues;
  } catch (error) {
    console.error('[ISSUES] Erreur:', error.message);
    return ['Erreur analyse'];
  }
}

// ================================
// GENERATION FUNCTIONS
// ================================

function generateHTMLCode(companyName, colors, logoUrl, sections, siteUrl) {
  const primaryColor = colors[0] || '#5bc236';
  const secondaryColor = colors[1] || '#0f204b';
  
  const sectionsHTML = sections.slice(0, 3).map((sec, i) => `
    <section class="py-16 ${i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}">
        <div class="container mx-auto px-4">
            <h2 class="text-4xl font-bold text-center mb-12">${sec.title}</h2>
            <p class="text-center text-gray-600 max-w-2xl mx-auto">
                Contenu de la section ${sec.title} à personnaliser selon vos besoins.
            </p>
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

function generateAISystemPrompt(companyName, siteUrl, colors) {
  return `Tu es l'assistant virtuel de ${companyName} (${siteUrl}).

Ton rôle:
- Répondre aux questions sur les services
- Qualifier les prospects
- Proposer des rendez-vous

Ton de communication:
- Professionnel et chaleureux
- Français impeccable
- Orienté solution`;
}

function generateLoomScript(companyName, siteUrl, issues) {
  return `🎥 SCRIPT LOOM - ${companyName.toUpperCase()}

INTRO (0:00-0:15):
"Bonjour ! J'ai analysé ${siteUrl} et identifié ${issues.length} opportunités d'amélioration."

PROBLÈMES (0:15-1:00):
${issues.map((issue, i) => `${i + 1}. ${issue}`).join('\n')}

SOLUTION (1:00-1:45):
✅ Site moderne et responsive
✅ Chatbot IA 24/7
✅ Design optimisé conversion

CLOSING (1:45-2:00):
"Package complet prêt. On en discute cette semaine ?"`;
}

function generateEmailTemplates(companyName, siteUrl) {
  return [
    {
      subject: `IntelliAIScale - Opportunité pour ${companyName}`,
      from: "Darly <darly@intelliaiscale.com>",
      body: `Bonjour,

Je suis Darly d'IntelliAIScale. J'ai analysé ${siteUrl} et identifié des opportunités d'amélioration.

J'ai préparé pour vous :
✅ Audit complet
✅ Prototype HTML modernisé
✅ Chatbot IA clé-en-main

Disponible pour un appel de 15 min cette semaine ?

Cordialement,
Darly
IntelliAIScale`
    },
    {
      subject: `[Rappel] Package pour ${companyName}`,
      from: "Darly <darly@intelliaiscale.com>",
      body: `Bonjour,

Je voulais m'assurer que vous aviez reçu mon email concernant ${siteUrl}.

Le package inclut un design moderne, chatbot IA et prospection automatisée.

Meilleur moment pour échanger ?

Cordialement,
Darly`
    },
    {
      subject: `Dernier rappel - ${companyName}`,
      from: "Darly <darly@intelliaiscale.com>",
      body: `Bonjour,

Dernier message concernant le package pour ${siteUrl}.

Si le timing n'est pas bon, pas de souci !

Excellente journée,
Darly`
    }
  ];
}

async function generateGeminiImages(companyName, colors, count = 6) {
  if (!genAI) {
    console.log('[GEMINI] ⚠️  Pas de clé API, images désactivées');
    return [];
  }

  const images = [];
  const primaryColor = colors[0] || '#5bc236';
  
  const prompts = [
    `Professional business Instagram post for ${companyName}, modern design, color ${primaryColor}, high quality`,
    `Facebook cover image for ${companyName}, professional branding, color scheme ${primaryColor}`,
    `LinkedIn post graphic for ${companyName}, corporate style, ${primaryColor} accent`,
    `Social media story for ${companyName}, vertical format, trendy design`,
    `Professional service announcement for ${companyName}, clean and modern`,
    `Brand promotion visual for ${companyName}, eye-catching, ${primaryColor} theme`
  ];

  try {
    const model = genAI.getGenerativeModel({ model: "imagen-3.0-generate-001" });
    
    for (let i = 0; i < Math.min(count, prompts.length); i++) {
      try {
        const result = await model.generateContent(prompts[i]);
        const imageUrl = result.response?.candidates?.[0]?.content;
        if (imageUrl) {
          images.push({ prompt: prompts[i], url: imageUrl });
        }
      } catch (err) {
        console.error(`[GEMINI] Erreur image ${i + 1}:`, err.message);
      }
    }
  } catch (error) {
    console.error('[GEMINI] Erreur génération:', error.message);
  }

  return images;
}

// ================================
// API ENDPOINTS
// ================================

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

app.get('/api/packages', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('packages')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(10);

    if (error) throw error;

    res.json({ success: true, packages: data });
  } catch (error) {
    console.error('[API] Erreur packages:', error.message);
    res.json({ success: true, packages: [] });
  }
});

app.get('/api/prospects', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('prospects')
      .select('*')
      .order('score', { ascending: false });

    if (error) throw error;

    res.json({ success: true, prospects: data });
  } catch (error) {
    console.error('[API] Erreur prospects:', error.message);
    res.json({ success: true, prospects: [] });
  }
});

app.post('/api/generate/package', async (req, res) => {
  const { url, companyName } = req.body;

  if (!url || !companyName) {
    return res.status(400).json({ error: 'URL et nom entreprise requis' });
  }

  console.log(`[PACKAGE] 🚀 Génération pour ${url}...`);

  let browser;
  try {
    console.log(`[PACKAGE] 📊 Étape 1/7: Connexion navigateur...`);
    browser = await puppeteer.launch(PUPPETEER_CONFIG);
    const page = await browser.newPage();
    
    console.log(`[PACKAGE] 📊 Étape 2/7: Scraping du site...`);
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 });

    const colors = await extractColors(page);
    const logoUrl = await extractLogo(page);
    const sections = await extractSections(page);
    const issues = await analyzeIssues(page);
    const score = Math.max(100 - (issues.length * 10), 50);

    await browser.close();
    browser = null;

    console.log(`[PACKAGE] 📊 Étape 3/7: Génération HTML GHL...`);
    const htmlCode = generateHTMLCode(companyName, colors, logoUrl, sections, url);
    
    console.log(`[PACKAGE] 📊 Étape 4/7: Génération contenus IA...`);
    const aiPrompt = generateAISystemPrompt(companyName, url, colors);
    const loomScript = generateLoomScript(companyName, url, issues);
    const emailTemplates = generateEmailTemplates(companyName, url);

    console.log(`[PACKAGE] 📊 Étape 5/7: Génération visuels Gemini...`);
    const socialVisuals = await generateGeminiImages(companyName, colors, 6);

    console.log(`[PACKAGE] 📊 Étape 6/7: Sauvegarde Supabase...`);
    const packageData = {
      company_name: companyName,
      website_url: url,
      status: 'completed',
      audit_score: score,
      audit_issues: issues,
      color_palette: { colors },
      detected_industry: 'General',
      html_code: htmlCode,
      ai_system_prompt: aiPrompt,
      loom_script: loomScript,
      email_templates: emailTemplates,
      social_visuals: socialVisuals,
      created_at: new Date().toISOString()
    };

    const { data, error } = await supabase
      .from('packages')
      .insert([packageData])
      .select();

    if (error) throw error;

    console.log(`[PACKAGE] ✅ Package sauvegardé !`);

    res.json({
      success: true,
      message: 'Package généré avec succès',
      package: data[0]
    });

  } catch (error) {
    if (browser) await browser.close();
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
  console.log(`[Backend] Serveur démarré sur le port ${PORT}`);
});
