// ================================
// IAS BACKEND SERVER v3.0 FINAL
// Système avec Playwright + Browserless + Logs détaillés
// ================================

const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const { chromium } = require('playwright');
const { createClient } = require('@supabase/supabase-js');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// ================================
// SUPABASE CONFIGURATION
// ================================
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://abuvnijldapnuiwumxtv.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFidXZuaWpsZGFwbnVpd3VteHR2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY1Njc1NzksImV4cCI6MjA4MjE0MzU3OX0.p_6bCgF1oofxhxNvnDlXpz2dq340XsRPFzOTqwgTN_k';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// ================================
// PLAYWRIGHT + BROWSERLESS CONFIGURATION
// ================================
const BROWSERLESS_TOKEN = process.env.BROWSERLESS_TOKEN || '';
const USE_BROWSERLESS = !!BROWSERLESS_TOKEN;
const BROWSER_WS_ENDPOINT = `wss://production-sfo.browserless.io?token=${BROWSERLESS_TOKEN}`;

console.log(`[CONFIG] Mode: ${USE_BROWSERLESS ? 'Browserless' : 'Local'}`);
console.log(`[CONFIG] Browserless Token: ${BROWSERLESS_TOKEN ? '✅ Configuré' : '❌ Manquant'}`);

const BROWSER_CONFIG = {
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
  ]
};

// ================================
// UTILITY FUNCTIONS
// ================================

async function extractColors(page) {
  try {
    const colors = await page.evaluate(() => {
      const allElements = document.querySelectorAll('*');
      const colorSet = new Set();
      
      allElements.forEach(el => {
        const styles = window.getComputedStyle(el);
        const bgColor = styles.backgroundColor;
        const color = styles.color;
        
        if (bgColor && bgColor !== 'rgba(0, 0, 0, 0)' && bgColor !== 'transparent') {
          colorSet.add(bgColor);
        }
        if (color && color !== 'rgba(0, 0, 0, 0)' && color !== 'transparent') {
          colorSet.add(color);
        }
      });
      
      return Array.from(colorSet).slice(0, 10);
    });
    
    return colors.length > 0 ? colors : ['#0f204b', '#5bc236', '#ffffff', '#000000'];
  } catch (error) {
    console.error('[COLORS] Erreur:', error.message);
    return ['#0f204b', '#5bc236', '#ffffff', '#000000'];
  }
}

async function analyzeIssues(page) {
  try {
    const issues = await page.evaluate(() => {
      const problems = [];
      
      if (!document.querySelector('meta[name="viewport"]')) {
        problems.push('Site non-responsive (pas de meta viewport)');
      }
      
      const hasChatbot = document.querySelector('[class*="chat"]') || 
                        document.querySelector('[id*="chat"]') ||
                        document.querySelector('iframe[src*="chat"]');
      if (!hasChatbot) {
        problems.push('Pas de chatbot IA');
      }
      
      const hasModernCSS = document.querySelector('link[href*="tailwind"]') ||
                          document.querySelector('link[href*="bootstrap"]');
      if (!hasModernCSS) {
        problems.push('Design potentiellement obsolète');
      }
      
      const ctaButtons = document.querySelectorAll('a[href*="contact"], button[class*="cta"], a[class*="button"]');
      if (ctaButtons.length < 2) {
        problems.push('Manque de CTA (Call-to-Action)');
      }
      
      return problems.length > 0 ? problems : ['Aucun problème majeur détecté'];
    });
    
    return issues;
  } catch (error) {
    console.error('[ISSUES] Erreur:', error.message);
    return ['Erreur lors de l\'analyse'];
  }
}

function generateHTMLCode(companyName, colors, siteUrl) {
  const primaryColor = colors[0] || '#5bc236';
  const secondaryColor = colors[1] || '#0f204b';
  
  return `<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${companyName} - Site Modernisé</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css">
    <style>
        :root {
            --primary: ${primaryColor};
            --secondary: ${secondaryColor};
        }
        body {
            font-family: 'Inter', sans-serif;
        }
        .gradient-bg {
            background: linear-gradient(135deg, var(--primary) 0%, var(--secondary) 100%);
        }
    </style>
</head>
<body class="bg-gray-50">
    <header class="gradient-bg text-white py-20">
        <div class="container mx-auto px-4 text-center">
            <h1 class="text-5xl font-bold mb-4">${companyName}</h1>
            <p class="text-xl mb-8">Votre partenaire de confiance</p>
            <button class="bg-white text-gray-900 px-8 py-3 rounded-full font-bold hover:scale-105 transition-transform">
                <i class="fas fa-phone mr-2"></i>Contactez-nous
            </button>
        </div>
    </header>
    <section class="py-16">
        <div class="container mx-auto px-4">
            <h2 class="text-4xl font-bold text-center mb-12">Nos Services</h2>
            <div class="grid md:grid-cols-3 gap-8">
                <div class="bg-white p-8 rounded-xl shadow-lg">
                    <i class="fas fa-star text-4xl mb-4" style="color: var(--primary)"></i>
                    <h3 class="text-2xl font-bold mb-4">Service Premium</h3>
                    <p class="text-gray-600">Excellence et qualité garanties</p>
                </div>
                <div class="bg-white p-8 rounded-xl shadow-lg">
                    <i class="fas fa-bolt text-4xl mb-4" style="color: var(--primary)"></i>
                    <h3 class="text-2xl font-bold mb-4">Rapidité</h3>
                    <p class="text-gray-600">Service rapide et efficace</p>
                </div>
                <div class="bg-white p-8 rounded-xl shadow-lg">
                    <i class="fas fa-shield-alt text-4xl mb-4" style="color: var(--primary)"></i>
                    <h3 class="text-2xl font-bold mb-4">Confiance</h3>
                    <p class="text-gray-600">Plus de 1000 clients satisfaits</p>
                </div>
            </div>
        </div>
    </section>
    <footer class="bg-gray-900 text-white py-8 text-center">
        <p>&copy; 2025 ${companyName}. Tous droits réservés.</p>
        <p class="text-gray-400 mt-2">Site original: <a href="${siteUrl}" class="underline">${siteUrl}</a></p>
    </footer>
</body>
</html>`;
}

function generateAISystemPrompt(companyName, siteUrl, colors) {
  return `Tu es l'assistant virtuel de ${companyName}, une entreprise accessible sur ${siteUrl}.

**Ton rôle:**
- Répondre aux questions des visiteurs sur les services de ${companyName}
- Qualifier les prospects en posant des questions pertinentes
- Proposer des rendez-vous ou des devis
- Être chaleureux, professionnel et efficace

**Informations sur l'entreprise:**
- Nom: ${companyName}
- Site web: ${siteUrl}
- Couleurs de marque: ${colors.slice(0, 3).join(', ')}

**Ton de communication:**
- Professionnel mais accessible
- Empathique et à l'écoute
- Orienté solution
- Français impeccable

**Exemples de réponses:**
Visiteur: "Quels sont vos services ?"
Toi: "Nous proposons [LISTE DES SERVICES]. Quel service vous intéresse particulièrement ?"

Visiteur: "Combien ça coûte ?"
Toi: "Nos tarifs varient selon vos besoins spécifiques. Puis-je vous poser quelques questions pour vous préparer un devis personnalisé ?"

**Consignes importantes:**
✅ Toujours être positif et encourageant
✅ Poser des questions ouvertes pour qualifier
✅ Proposer des solutions concrètes
❌ Ne jamais dire "Je ne sais pas"`;
}

function generateLoomScript(companyName, siteUrl, issues) {
  return `🎥 SCRIPT LOOM - ${companyName.toUpperCase()}

## INTRO (0:00 - 0:15)
"Bonjour ! J'ai analysé votre site ${siteUrl} et j'ai identifié ${issues.length} opportunités d'amélioration."

## PROBLÈMES (0:15 - 1:00)
${issues.map((issue, i) => `${i + 1}. ${issue}`).join('\n')}

## SOLUTION (1:00 - 1:45)
"Voici ce que je propose :
✅ Un site web moderne et responsive
✅ Un chatbot IA intégré 24/7
✅ Un design optimisé pour la conversion
✅ Une stratégie de prospection automatisée"

## CLOSING (1:45 - 2:00)
"Je vous ai préparé un package complet. Souhaitez-vous qu'on en discute cette semaine ?"`;
}

function generateEmailTemplates(companyName, siteUrl) {
  return [
    {
      subject: `${companyName} - Opportunité d'amélioration`,
      body: `Bonjour,

J'ai analysé ${siteUrl} et identifié plusieurs opportunités d'amélioration pour augmenter vos conversions.

J'ai préparé pour vous :
✅ Un audit complet
✅ Un prototype HTML modernisé
✅ Un chatbot IA clé-en-main

Seriez-vous disponible 15 minutes cette semaine ?

Cordialement`
    },
    {
      subject: `[Rappel] Package de transformation pour ${companyName}`,
      body: `Bonjour,

Je voulais m'assurer que vous aviez bien reçu mon email concernant ${siteUrl}.

Le package inclut un design moderne, un chatbot IA et une stratégie de prospection.

Meilleur moment pour vous ?

Cordialement`
    },
    {
      subject: `Dernier rappel - ${companyName}`,
      body: `Bonjour,

Dernier message concernant le package de transformation pour ${siteUrl}.

Si le timing n'est pas bon, pas de souci !

Excellente journée !`
    }
  ];
}

// ================================
// API ENDPOINTS
// ================================

app.get('/', (req, res) => {
  res.json({
    status: 'OK',
    version: '3.0',
    message: 'IAS Backend API - FINAL',
    mode: USE_BROWSERLESS ? 'Browserless' : 'Local',
    timestamp: new Date().toISOString()
  });
});

app.post('/api/scrape/website', async (req, res) => {
  const { url } = req.body;

  if (!url) {
    return res.status(400).json({ error: 'URL manquante' });
  }

  console.log(`[SCRAPING] 🚀 Analyse de ${url}...`);

  let browser;
  try {
    if (USE_BROWSERLESS) {
      console.log('[SCRAPING] 🌐 Connexion à Browserless...');
      browser = await chromium.connect(BROWSER_WS_ENDPOINT);
    } else {
      console.log('[SCRAPING] 💻 Lancement de Chromium local...');
      browser = await chromium.launch(BROWSER_CONFIG);
    }

    const page = await browser.newPage();
    console.log('[SCRAPING] 📄 Navigation vers', url);
    
    await page.goto(url, { 
      waitUntil: 'domcontentloaded',
      timeout: 180000  // 3 minutes
    });

    console.log('[SCRAPING] 🎨 Extraction des couleurs...');
    const title = await page.title();
    const colors = await extractColors(page);
    
    console.log('[SCRAPING] 🔍 Analyse des problèmes...');
    const issues = await analyzeIssues(page);

    const scrapedData = {
      url,
      title,
      colors,
      issues,
      score: Math.max(100 - (issues.length * 10), 50),
      timestamp: new Date().toISOString()
    };

    await browser.close();
    
    console.log(`[SCRAPING] ✅ Terminé ! Score: ${scrapedData.score}/100`);
    
    res.json(scrapedData);

  } catch (error) {
    if (browser) await browser.close();
    console.error('[SCRAPING] ❌ Erreur:', error.message);
    res.status(500).json({ 
      error: 'Erreur lors du scraping', 
      details: error.message 
    });
  }
});

app.post('/api/generate/package', async (req, res) => {
  const { url, companyName, prospectId } = req.body;

  if (!url || !companyName) {
    return res.status(400).json({ error: 'URL et nom requis' });
  }

  console.log(`[PACKAGE] 🚀 Génération pour ${url}...`);

  let browser;
  try {
    console.log('[PACKAGE] 📊 Étape 1/5: Connexion au navigateur...');
    
    if (USE_BROWSERLESS) {
      console.log('[PACKAGE] 🌐 Connexion à Browserless...');
      browser = await chromium.connect(BROWSER_WS_ENDPOINT);
    } else {
      console.log('[PACKAGE] 💻 Lancement de Chromium local...');
      browser = await chromium.launch(BROWSER_CONFIG);
    }

    console.log('[PACKAGE] 📊 Étape 2/5: Scraping du site...');
    const page = await browser.newPage();
    
    await page.goto(url, { 
      waitUntil: 'domcontentloaded',
      timeout: 180000
    });

    console.log('[PACKAGE] 📊 Étape 3/5: Extraction des données...');
    const title = await page.title();
    const colors = await extractColors(page);
    const issues = await analyzeIssues(page);
    const score = Math.max(100 - (issues.length * 10), 50);

    await browser.close();

    console.log('[PACKAGE] 📊 Étape 4/5: Génération des livrables...');
    const htmlCode = generateHTMLCode(companyName, colors, url);
    const aiPrompt = generateAISystemPrompt(companyName, url, colors);
    const loomScript = generateLoomScript(companyName, url, issues);
    const emailTemplates = generateEmailTemplates(companyName, url);

    console.log('[PACKAGE] 📊 Étape 5/5: Sauvegarde dans Supabase...');
    const packageData = {
      prospect_id: prospectId || null,
      target_website_url: url,
      html_code: htmlCode,
      ai_system_prompt: aiPrompt,
      loom_script: loomScript,
      email_templates: emailTemplates,
      color_palette: { colors },
      lead_leakages: issues,
      audit_summary: `Site: ${title}. Score: ${score}/100. ${issues.length} problèmes.`,
      status: 'completed',
      generation_completed_at: new Date().toISOString()
    };

    const { data, error } = await supabase
      .from('packages')
      .insert([packageData])
      .select();

    if (error) throw error;

    console.log('[PACKAGE] ✅ Package créé avec succès !');

    res.json({
      success: true,
      message: 'Package généré avec succès',
      package: data[0],
      score: score,
      deliverables: {
        html_code: htmlCode.substring(0, 200) + '...',
        ai_system_prompt: aiPrompt.substring(0, 200) + '...',
        loom_script: loomScript.substring(0, 200) + '...',
        emails_count: emailTemplates.length
      }
    });

  } catch (error) {
    if (browser) await browser.close();
    console.error('[PACKAGE] ❌ Erreur:', error.message);
    res.status(500).json({ 
      error: 'Erreur lors de la génération', 
      details: error.message 
    });
  }
});

app.get('/api/prospects', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('prospects')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;

    res.json({
      success: true,
      count: data.length,
      prospects: data
    });

  } catch (error) {
    console.error('[PROSPECTS] Erreur:', error.message);
    res.status(500).json({ 
      error: 'Erreur prospects', 
      details: error.message 
    });
  }
});

app.listen(PORT, () => {
  console.log(`
╔══════════════════════════════════════════════════════════╗
║              🚀 IAS BACKEND API v3.0 FINAL              ║
║  ✅ Serveur démarré sur le port ${PORT}                    ║
║  🌐 Mode: ${USE_BROWSERLESS ? 'Browserless ✅' : 'Local ⚠️'}                            ║
╚══════════════════════════════════════════════════════════╝
  `);
});
