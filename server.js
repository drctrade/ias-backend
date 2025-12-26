// ================================
// IAS BACKEND SERVER v2.1
// Système Complet avec PLAYWRIGHT (plus stable sur Render)
// ================================

const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const { chromium } = require('playwright');  // ✅ Playwright au lieu de Puppeteer
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
// PLAYWRIGHT CONFIGURATION (OPTIMISÉ RENDER)
// ================================
const BROWSER_CONFIG = {
  headless: true,
  args: [
    '--no-sandbox',
    '--disable-setuid-sandbox',
    '--disable-dev-shm-usage',
    '--disable-gpu'
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
    
    return colors;
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
      
      if (performance.timing.loadEventEnd - performance.timing.navigationStart > 3000) {
        problems.push('Temps de chargement lent (>3s)');
      }
      
      return problems.length > 0 ? problems : ['Aucun problème majeur détecté'];
    });
    
    return issues;
  } catch (error) {
    console.error('[ISSUES] Erreur:', error.message);
    return ['Erreur lors de l\'analyse'];
  }
}

// ================================
// GENERATION FUNCTIONS
// ================================

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

    <section class="gradient-bg text-white py-16 text-center">
        <div class="container mx-auto px-4">
            <h2 class="text-4xl font-bold mb-4">Prêt à Commencer ?</h2>
            <p class="text-xl mb-8">Contactez-nous dès aujourd'hui pour un devis gratuit</p>
            <button class="bg-white text-gray-900 px-10 py-4 rounded-full font-bold text-lg hover:scale-105 transition-transform">
                <i class="fas fa-envelope mr-2"></i>Obtenir un Devis
            </button>
        </div>
    </section>

    <footer class="bg-gray-900 text-white py-8 text-center">
        <p>&copy; 2025 ${companyName}. Tous droits réservés.</p>
        <p class="text-gray-400 mt-2">Site original: <a href="${siteUrl}" class="underline">${siteUrl}</a></p>
    </footer>

    <div id="chatbot-widget" style="position: fixed; bottom: 20px; right: 20px; z-index: 9999;">
        <button class="gradient-bg text-white w-16 h-16 rounded-full shadow-2xl hover:scale-110 transition-transform">
            <i class="fas fa-comments text-2xl"></i>
        </button>
    </div>
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
- Français impeccable (Canada/France selon le contexte)

**Exemples de réponses:**

Visiteur: "Quels sont vos services ?"
Toi: "Nous proposons [LISTE DES SERVICES]. Quel service vous intéresse particulièrement ? Je peux vous donner plus de détails."

Visiteur: "Combien ça coûte ?"
Toi: "Nos tarifs varient selon vos besoins spécifiques. Puis-je vous poser quelques questions pour vous préparer un devis personnalisé ? 📋"

Visiteur: "Je veux un rendez-vous"
Toi: "Parfait ! 🎉 Je peux vous proposer [JOURS/HEURES]. Quelle plage horaire vous conviendrait le mieux ?"

**Consignes importantes:**
✅ Toujours être positif et encourageant
✅ Poser des questions ouvertes pour qualifier
✅ Proposer des solutions concrètes
❌ Ne jamais dire "Je ne sais pas" (rediriger vers un humain si nécessaire)
❌ Ne jamais donner de prix exacts sans contexte`;
}

function generateLoomScript(companyName, siteUrl, issues) {
  return `🎥 **SCRIPT LOOM - PROPOSITION VIDÉO POUR ${companyName.toUpperCase()}**

---

## 📍 **INTRO (0:00 - 0:15)**

"Bonjour ! Je m'appelle [VOTRE NOM] et j'ai analysé votre site ${siteUrl}.

J'ai identifié **${issues.length} opportunités d'amélioration** qui pourraient vous faire perdre des clients en ce moment même."

---

## 🔍 **PROBLÈMES IDENTIFIÉS (0:15 - 1:00)**

**[Montrer le site à l'écran]**

"Voici ce que j'ai remarqué :

${issues.map((issue, i) => `${i + 1}. **${issue}**
   → Impact: Perte de conversions et crédibilité réduite`).join('\n\n')}

Ces problèmes sont **courants** mais **facilement corrigibles**."

---

## ✨ **SOLUTION (1:00 - 1:45)**

**[Montrer une maquette/exemple]**

"Voici ce que je propose :

✅ **Un site web moderne et responsive** adapté à votre image de marque
✅ **Un chatbot IA intégré** qui répond 24/7 et qualifie vos prospects
✅ **Un design optimisé pour la conversion** avec des CTA clairs
✅ **Une stratégie de prospection automatisée** pour générer des leads

Tout ça en gardant votre identité visuelle actuelle (vos couleurs, votre style)."

---

## 🎯 **CLOSING (1:45 - 2:00)**

"Je vous ai préparé un **package complet** avec :

📄 Un audit détaillé de votre site
🎨 Un prototype HTML de votre nouveau site
🤖 Le système prompt pour votre chatbot IA
📧 Une séquence d'emails de prospection

**Souhaitez-vous qu'on en discute cette semaine ?**

Répondez simplement à cet email ou prenez rendez-vous sur [VOTRE LIEN CALENDLY].

À très bientôt ! 🚀"

---

## 🎬 **NOTES DE TOURNAGE**

- **Durée totale:** 2 minutes max
- **Ton:** Professionnel mais amical
- **Montrer:** Le site actuel + exemples de solutions
- **CTA:** Réponse email OU rendez-vous direct`;
}

function generateEmailTemplates(companyName, siteUrl) {
  return [
    {
      subject: `${companyName} - Opportunité d'amélioration de votre site web`,
      body: `Bonjour,

Je me permets de vous contacter car j'ai analysé votre site ${siteUrl} et j'ai identifié plusieurs opportunités d'amélioration qui pourraient significativement augmenter vos conversions.

J'ai préparé pour vous :
✅ Un audit complet de votre site actuel
✅ Un prototype HTML modernisé avec vos couleurs
✅ Un chatbot IA clé-en-main pour qualifier vos prospects 24/7

Seriez-vous disponible pour un appel de 15 minutes cette semaine ?

Cordialement,
[VOTRE NOM]

P.S. : Je vous joins un aperçu vidéo de 2 minutes qui montre le potentiel de transformation.`
    },
    {
      subject: `[Rappel] Package de transformation pour ${companyName}`,
      body: `Bonjour,

Je voulais m'assurer que vous aviez bien reçu mon premier email concernant l'amélioration de ${siteUrl}.

Le package que j'ai préparé inclut :
- Design moderne et responsive
- Chatbot IA intégré
- Stratégie de prospection automatisée

Voici le lien vers la vidéo explicative : [LIEN LOOM]

Meilleur moment pour vous cette semaine ?

Cordialement,
[VOTRE NOM]`
    },
    {
      subject: `Dernier rappel - ${companyName}`,
      body: `Bonjour,

Dernier message de ma part concernant le package de transformation pour ${siteUrl}.

Si le timing n'est pas le bon, pas de souci ! Je comprendrai parfaitement.

Sinon, je reste à votre disposition pour échanger 15 minutes.

Excellente journée !
[VOTRE NOM]`
    }
  ];
}

// ================================
// API ENDPOINTS
// ================================

app.get('/', (req, res) => {
  res.json({
    status: 'OK',
    version: '2.1 (Playwright)',
    message: 'IAS Backend API - Système Complet avec Playwright',
    timestamp: new Date().toISOString(),
    endpoints: {
      health: 'GET /',
      scrapeWebsite: 'POST /api/scrape/website',
      generatePackage: 'POST /api/generate/package',
      getProspects: 'GET /api/prospects'
    }
  });
});

app.post('/api/scrape/website', async (req, res) => {
  const { url } = req.body;

  if (!url) {
    return res.status(400).json({ error: 'URL manquante' });
  }

  console.log(`[SCRAPING] Analyse de ${url}...`);

  let browser;
  try {
    browser = await chromium.launch(BROWSER_CONFIG);
    const page = await browser.newPage();
    
    await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });

    const title = await page.title();
    const colors = await extractColors(page);
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
    console.error('[SCRAPING] Erreur:', error.message);
    res.status(500).json({ 
      error: 'Erreur lors du scraping', 
      details: error.message 
    });
  }
});

app.post('/api/generate/package', async (req, res) => {
  const { url, companyName, prospectId } = req.body;

  if (!url || !companyName) {
    return res.status(400).json({ error: 'URL et nom de l\'entreprise requis' });
  }

  console.log(`[PACKAGE] Génération pour ${url}...`);

  let browser;
  try {
    browser = await chromium.launch(BROWSER_CONFIG);
    const page = await browser.newPage();
    
    await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });

    const title = await page.title();
    const colors = await extractColors(page);
    const issues = await analyzeIssues(page);
    const score = Math.max(100 - (issues.length * 10), 50);

    await browser.close();

    const htmlCode = generateHTMLCode(companyName, colors, url);
    const aiPrompt = generateAISystemPrompt(companyName, url, colors);
    const loomScript = generateLoomScript(companyName, url, issues);
    const emailTemplates = generateEmailTemplates(companyName, url);

    const packageData = {
      prospect_id: prospectId || null,
      target_website_url: url,
      html_code: htmlCode,
      ai_system_prompt: aiPrompt,
      loom_script: loomScript,
      email_templates: emailTemplates,
      color_palette: { colors },
      lead_leakages: issues,
      audit_summary: `Site analysé: ${title}. Score: ${score}/100. ${issues.length} problèmes identifiés.`,
      status: 'completed',
      generation_completed_at: new Date().toISOString()
    };

    const { data, error } = await supabase
      .from('packages')
      .insert([packageData])
      .select();

    if (error) throw error;

    console.log(`[PACKAGE] ✅ Package créé avec succès !`);

    res.json({
      success: true,
      message: 'Package généré avec succès',
      package: data[0],
      deliverables: {
        html_code: htmlCode.substring(0, 200) + '...',
        ai_system_prompt: aiPrompt.substring(0, 200) + '...',
        loom_script: loomScript.substring(0, 200) + '...',
        email_templates: emailTemplates.length
      }
    });

  } catch (error) {
    if (browser) await browser.close();
    console.error('[PACKAGE] Erreur:', error.message);
    res.status(500).json({ 
      error: 'Erreur lors de la génération du package', 
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
      error: 'Erreur lors de la récupération des prospects', 
      details: error.message 
    });
  }
});

// ================================
// START SERVER
// ================================

app.listen(PORT, () => {
  console.log(`
╔══════════════════════════════════════════════════════════╗
║                                                          ║
║              🚀 IAS BACKEND API v2.1                    ║
║              (Powered by Playwright)                     ║
║                                                          ║
║  ✅ Serveur démarré sur le port ${PORT}                    ║
║  🌐 URL: http://localhost:${PORT}                         ║
║                                                          ║
║  📚 Endpoints disponibles:                               ║
║     GET  /                    - Health check            ║
║     POST /api/scrape/website  - Scraper un site         ║
║     POST /api/generate/package - Générer package        ║
║     GET  /api/prospects       - Liste prospects         ║
║                                                          ║
╚══════════════════════════════════════════════════════════╝
  `);
});