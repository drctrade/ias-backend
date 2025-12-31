// ================================
// IAS BACKEND SERVER v4.1 FINAL
// Gemini Imagen + PDF + Playwright + Browserless
// ================================

require('dotenv').config();

const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const { chromium } = require('playwright');
const { createClient } = require('@supabase/supabase-js');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const PDFDocument = require('pdfkit');
const archiver = require('archiver');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '50mb' }));

// ================================
// CONFIGURATION
// ================================
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://abuvnijldapnuiwumxtv.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_KEY;
const BROWSERLESS_TOKEN = process.env.BROWSERLESS_TOKEN || '';
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

const USE_BROWSERLESS = !!BROWSERLESS_TOKEN;
const BROWSER_WS_ENDPOINT = `wss://production-sfo.browserless.io?token=${BROWSERLESS_TOKEN}`;

console.log(`[CONFIG] Mode: ${USE_BROWSERLESS ? 'Browserless' : 'Local'}`);
console.log(`[CONFIG] Browserless: ${BROWSERLESS_TOKEN ? '✅' : '❌'}`);
console.log(`[CONFIG] Gemini: ${GEMINI_API_KEY ? '✅' : '❌'}`);

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
      // Recherche logo dans ordre de priorité
      const selectors = [
        'img[alt*="logo" i]',
        'img.logo',
        '.logo img',
        'header img:first-of-type',
        '.header img:first-of-type',
        'nav img:first-of-type',
        '[class*="logo"] img',
        '[id*="logo"] img'
      ];
      
      for (const selector of selectors) {
        const logo = document.querySelector(selector);
        if (logo && logo.src) {
          return logo.src;
        }
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
      const sectionsList = [];
      const sectionElements = document.querySelectorAll('section, .section, [class*="section"], main > div');
      
      sectionElements.forEach((section, index) => {
        const heading = section.querySelector('h1, h2, h3');
        const content = section.textContent.trim().substring(0, 300);
        
        if (content.length > 50) { // Ignorer sections vides
          sectionsList.push({
            title: heading ? heading.textContent.trim() : `Section ${index + 1}`,
            content: content,
            hasImage: !!section.querySelector('img'),
            hasButton: !!section.querySelector('button, a.btn, .button')
          });
        }
      });
      
      return sectionsList.slice(0, 6); // Max 6 sections principales
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
                        document.querySelector('[id*="chat"]') ||
                        document.querySelector('[class*="widget"]');
      if (!hasChatbot) {
        problems.push('Pas de chatbot IA');
      }
      
      const hasModernCSS = document.querySelector('link[href*="tailwind"]') ||
                          document.querySelector('link[href*="bootstrap"]');
      if (!hasModernCSS) {
        problems.push('Design potentiellement obsolète');
      }
      
      const ctaButtons = document.querySelectorAll('a[href*="contact"], button[class*="cta"], .btn, .button');
      if (ctaButtons.length < 2) {
        problems.push('Manque de CTA clairs');
      }
      
      const hasVoiceAgent = document.querySelector('[class*="voice"]') ||
                           document.querySelector('[id*="voice"]') ||
                           document.querySelector('[class*="vapi"]');
      if (!hasVoiceAgent) {
        problems.push('Pas de Voice AI Agent');
      }
      
      return problems.length > 0 ? problems : ['Aucun problème majeur'];
    });
    
    return issues;
  } catch (error) {
    return ['Erreur analyse'];
  }
}

async function detectIndustry(companyName, websiteContent) {
  try {
    // Détection simple basée sur mots-clés
    const content = websiteContent.toLowerCase();
    
    if (content.includes('santé') || content.includes('médical') || content.includes('clinique') || content.includes('docteur')) {
      return 'Santé';
    } else if (content.includes('e-commerce') || content.includes('boutique') || content.includes('shop')) {
      return 'E-commerce';
    } else if (content.includes('immobilier') || content.includes('propriété') || content.includes('maison')) {
      return 'Immobilier';
    } else if (content.includes('restaurant') || content.includes('café') || content.includes('traiteur')) {
      return 'Restauration';
    } else if (content.includes('avocat') || content.includes('juridique') || content.includes('legal')) {
      return 'Services juridiques';
    } else if (content.includes('marketing') || content.includes('agence') || content.includes('digital')) {
      return 'Services B2B';
    } else {
      return 'Services';
    }
  } catch (error) {
    console.error('[INDUSTRY] Erreur:', error.message);
    return 'Industrie non détectée';
  }
}

// ================================
// GÉNÉRATION CONTENU IA
// ================================

async function generateAIContent(companyName, websiteUrl, colors, issues, industry) {
  try {
    const prompts = {
      system_prompt: `Tu es un assistant IA expert pour ${companyName} (${industry}). Ton rôle est d'aider les visiteurs à obtenir des informations sur nos services, prendre rendez-vous et répondre à leurs questions. Utilise un ton ${industry === 'Santé' ? 'rassurant et professionnel' : 'dynamique et commercial'}. Couleurs de marque : ${colors.join(', ')}.`,
      
      brand_kit_prompt: `Crée un Brand Kit complet pour ${companyName} (${industry}) avec : 1) Palette de 5 couleurs (inclure ${colors[0]}), 2) 2 typographies recommandées (Google Fonts), 3) Style visuel (moderne/classique/minimaliste), 4) Ton de communication, 5) Guidelines visuelles pour réseaux sociaux.`,
      
      loom_script: `Script vidéo Loom de 90 secondes pour IntelliAIScale présentant l'upgrade à ${companyName} :

[0-15s] Intro
"Bonjour l'équipe ${companyName} ! Je suis Darly d'IntelliAIScale. J'ai analysé votre site ${websiteUrl} et j'ai identifié ${issues.length} opportunités majeures pour transformer votre présence digitale."

[15-45s] Problèmes détectés
${issues.map((issue, i) => `${i + 1}. ${issue}`).join('\n')}

[45-75s] Solutions proposées
"J'ai créé un package complet pour vous avec : un site modernisé utilisant vos couleurs actuelles, un chatbot IA personnalisé pour votre industrie (${industry}), 6 visuels professionnels pour vos réseaux sociaux, et un Voice AI Agent pour gérer vos appels."

[75-90s] CTA
"Tout est prêt dans le rapport PDF ci-joint. Seriez-vous disponible pour un appel de 15 minutes cette semaine pour vous montrer comment augmenter vos conversions de 30-50% ? Répondez simplement à cet email ou appelez-moi au [votre numéro]."`,
      
      email_templates: [
        {
          name: 'Email Initial',
          timing: 'Jour 0',
          subject: `IntelliAIScale - Transformation digitale pour ${companyName}`,
          body: `Bonjour l'équipe ${companyName},

Je suis Darly d'IntelliAIScale, et j'ai analysé votre site ${websiteUrl}.

J'ai identifié ${issues.length} opportunités d'amélioration qui pourraient augmenter vos conversions de 30-50% :

${issues.map((issue, i) => `${i + 1}. ${issue}`).join('\n')}

J'ai préparé un package complet pour vous incluant :
✅ Site web modernisé (conservant vos couleurs et logo actuels)
✅ Chatbot IA personnalisé pour ${industry}
✅ Voice AI Agent pour gérer vos appels 24/7
✅ 6 visuels professionnels pour vos réseaux sociaux
✅ Automation complète de votre prospection

Rapport complet (PDF) : [lien]
Vidéo démo (Loom 90s) : [lien]

Seriez-vous disponible pour un appel de 15 minutes cette semaine ?

Cordialement,
Darly
IntelliAIScale
darly@intelliaiscale.com
[Votre numéro]`
        },
        {
          name: 'Follow-up',
          timing: 'Jour 3',
          subject: `Re: Transformation digitale pour ${companyName}`,
          body: `Bonjour,

Je voulais m'assurer que vous aviez bien reçu le rapport d'audit complet pour ${websiteUrl}.

J'ai remarqué que votre site manque actuellement de ${issues[0]}. Cette seule amélioration pourrait augmenter vos conversions de 20-30%.

J'ai une solution clé en main à vous présenter, déjà configurée avec vos couleurs et votre identité visuelle.

Êtes-vous disponible jeudi ou vendredi pour 15 minutes ?

Cordialement,
Darly
IntelliAIScale
darly@intelliaiscale.com`
        },
        {
          name: 'Dernière relance',
          timing: 'Jour 7',
          subject: `Dernière opportunité : Package complet pour ${companyName}`,
          body: `Bonjour,

C'est la dernière fois que je vous contacte concernant le package complet que j'ai créé spécifiquement pour ${companyName}.

Package inclus (valeur $7,500) :
✅ Site modernisé (Tailwind CSS)
✅ Chatbot IA personnalisé
✅ Voice AI Agent (Vapi)
✅ 6 visuels pro pour réseaux sociaux
✅ Automation GHL complète
✅ Formation équipe (2h)

Ce package reste disponible jusqu'à vendredi soir.

Intéressé ? Répondez simplement "OUI" à cet email.

Cordialement,
Darly
IntelliAIScale
darly@intelliaiscale.com`
        }
      ]
    };
    
    return prompts;
  } catch (error) {
    console.error('[AI CONTENT] Erreur:', error.message);
    return null;
  }
}

// ================================
// GÉNÉRATION PDF
// ================================

function generateAuditPDF(packageData) {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ margin: 50 });
      const chunks = [];
      
      doc.on('data', chunk => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks).toString('base64')));
      
      // Header avec logo IntelliAIScale
      doc.fontSize(28).fillColor('#5bc236').text('Rapport d\'Audit', { align: 'center' });
      doc.fontSize(14).fillColor('#000000').text('par IntelliAIScale', { align: 'center' });
      doc.moveDown();
      doc.fontSize(18).text(packageData.company_name, { align: 'center' });
      doc.fontSize(12).fillColor('#666666').text(packageData.website_url, { align: 'center' });
      doc.moveDown(2);
      
      // Score avec cercle
      doc.fontSize(60).fillColor('#5bc236').text(`${packageData.audit_score}/100`, { align: 'center' });
      doc.fontSize(14).fillColor('#000000').text('Score d\'Audit Global', { align: 'center' });
      doc.moveDown(3);
      
      // Problèmes détectés
      doc.fontSize(18).fillColor('#0f204b').text('🔍 Problèmes Détectés');
      doc.moveDown(0.5);
      packageData.audit_issues.forEach((issue, i) => {
        doc.fontSize(12).fillColor('#000000').text(`${i + 1}. ${issue}`, { indent: 20 });
        doc.moveDown(0.3);
      });
      doc.moveDown(2);
      
      // Opportunités
      doc.fontSize(18).fillColor('#5bc236').text('💡 Opportunités d\'Amélioration');
      doc.moveDown(0.5);
      doc.fontSize(12).text('• Intégration chatbot IA personnalisé', { indent: 20 });
      doc.text('• Voice AI Agent pour appels 24/7', { indent: 20 });
      doc.text('• Refonte design moderne (Tailwind CSS)', { indent: 20 });
      doc.text('• Optimisation SEO et vitesse', { indent: 20 });
      doc.text('• Stratégie réseaux sociaux automatisée', { indent: 20 });
      doc.text('• Automation GHL complète', { indent: 20 });
      doc.moveDown(2);
      
      // Footer
      doc.fontSize(10).fillColor('#666666').text('IntelliAIScale - Transformation Digitale IA', { align: 'center' });
      doc.text('darly@intelliaiscale.com', { align: 'center' });
      
      doc.end();
    } catch (error) {
      reject(error);
    }
  });
}

function generateProposalPDF(packageData) {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ margin: 50 });
      const chunks = [];
      
      doc.on('data', chunk => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks).toString('base64')));
      
      doc.fontSize(28).fillColor('#5bc236').text('Proposition Commerciale', { align: 'center' });
      doc.fontSize(14).fillColor('#000000').text('IntelliAIScale', { align: 'center' });
      doc.moveDown();
      doc.fontSize(18).text(`pour ${packageData.company_name}`, { align: 'center' });
      doc.moveDown(3);
      
      doc.fontSize(20).fillColor('#0f204b').text('Package Stealth Upgrade');
      doc.moveDown(0.5);
      doc.fontSize(12).fillColor('#000000').text('Transformez votre présence digitale en 14 jours avec l\'intelligence artificielle.');
      doc.moveDown(2);
      
      doc.fontSize(16).fillColor('#5bc236').text('✅ Inclus dans ce package :');
      doc.moveDown(0.5);
      doc.fontSize(12).fillColor('#000000');
      doc.text('• Site web modernisé (Tailwind CSS, responsive)', { indent: 20 });
      doc.text('• Conservation de votre logo et couleurs actuelles', { indent: 20 });
      doc.text('• Chatbot IA personnalisé pour votre industrie', { indent: 20 });
      doc.text('• Voice AI Agent (Vapi) pour appels 24/7', { indent: 20 });
      doc.text('• 6 visuels professionnels pour réseaux sociaux', { indent: 20 });
      doc.text('• Séquence de 3 emails automatisés (GHL)', { indent: 20 });
      doc.text('• Automation complète de votre prospection', { indent: 20 });
      doc.text('• Formation équipe (2h en visioconférence)', { indent: 20 });
      doc.text('• Support 30 jours post-lancement', { indent: 20 });
      doc.moveDown(3);
      
      doc.fontSize(48).fillColor('#5bc236').text('7 500 $', { align: 'center' });
      doc.fontSize(14).fillColor('#000000').text('Investissement unique', { align: 'center' });
      doc.moveDown(2);
      
      doc.fontSize(12).fillColor('#666666').text('Options de paiement : 50% à la signature, 50% à la livraison', { align: 'center' });
      doc.moveDown(3);
      
      // Footer
      doc.fontSize(10).fillColor('#666666').text('IntelliAIScale - Transformation Digitale IA', { align: 'center' });
      doc.text('darly@intelliaiscale.com | [Votre numéro]', { align: 'center' });
      doc.text('Cette proposition est valide 14 jours', { align: 'center' });
      
      doc.end();
    } catch (error) {
      reject(error);
    }
  });
}

// ================================
// GÉNÉRATION HTML GHL AMÉLIORÉ
// ================================

function generateHTMLCode(companyName, colors, siteUrl, logoUrl, sections, industry) {
  const primaryColor = colors[0] || '#5bc236';
  const secondaryColor = colors[1] || '#0f204b';
  const accentColor = colors[2] || '#ffffff';
  
  let sectionsHTML = '';
  sections.forEach((section, index) => {
    const bgColor = index % 2 === 0 ? 'bg-white' : 'bg-gray-50';
    sectionsHTML += `
    <section class="py-20 ${bgColor}">
      <div class="container mx-auto px-4">
        <h2 class="text-4xl font-bold mb-8 text-center" style="color: ${primaryColor}">${section.title}</h2>
        <p class="text-lg text-gray-700 max-w-3xl mx-auto text-center">${section.content.substring(0, 200)}...</p>
        ${section.hasButton ? `<div class="text-center mt-8"><a href="#contact" class="btn-primary px-8 py-4 rounded-full text-white font-semibold">En savoir plus</a></div>` : ''}
      </div>
    </section>
    `;
  });
  
  return `<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${companyName} - ${industry}</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css">
    <style>
        :root {
            --primary-color: ${primaryColor};
            --secondary-color: ${secondaryColor};
            --accent-color: ${accentColor};
        }
        
        .btn-primary {
            background: linear-gradient(135deg, var(--primary-color) 0%, var(--secondary-color) 100%);
            transition: transform 0.3s, box-shadow 0.3s;
        }
        
        .btn-primary:hover {
            transform: translateY(-2px);
            box-shadow: 0 10px 25px rgba(0,0,0,0.15);
        }
        
        .gradient-bg {
            background: linear-gradient(135deg, var(--primary-color) 0%, var(--secondary-color) 100%);
        }
    </style>
</head>
<body class="font-sans">
    <!-- GHL ajoutera automatiquement le chat widget et voice agent -->
    
    <!-- Header -->
    <header class="gradient-bg text-white py-6 sticky top-0 z-50 shadow-lg">
        <div class="container mx-auto px-4 flex items-center justify-between">
            ${logoUrl ? `<img src="${logoUrl}" alt="${companyName} Logo" class="h-12 object-contain">` : `<h1 class="text-2xl font-bold">${companyName}</h1>`}
            <nav class="hidden md:flex space-x-6">
                <a href="#accueil" class="hover:opacity-80 transition">Accueil</a>
                <a href="#services" class="hover:opacity-80 transition">Services</a>
                <a href="#apropos" class="hover:opacity-80 transition">À propos</a>
                <a href="#contact" class="hover:opacity-80 transition">Contact</a>
            </nav>
            <button class="md:hidden text-white">
                <i class="fas fa-bars text-2xl"></i>
            </button>
        </div>
    </header>
    
    <!-- Hero Section -->
    <section class="gradient-bg text-white py-32">
        <div class="container mx-auto px-4 text-center">
            <h1 class="text-5xl md:text-6xl font-bold mb-6">Bienvenue chez ${companyName}</h1>
            <p class="text-xl md:text-2xl mb-8 opacity-90">Votre partenaire de confiance en ${industry}</p>
            <a href="#contact" class="btn-primary inline-block px-8 py-4 rounded-full text-white font-semibold text-lg">
                Contactez-nous <i class="fas fa-arrow-right ml-2"></i>
            </a>
        </div>
    </section>
    
    ${sectionsHTML}
    
    <!-- Contact Section -->
    <section id="contact" class="py-20 gradient-bg text-white">
        <div class="container mx-auto px-4">
            <h2 class="text-4xl font-bold mb-12 text-center">Contactez-nous</h2>
            <div class="max-w-2xl mx-auto">
                <form class="space-y-6">
                    <div>
                        <input type="text" placeholder="Votre nom" class="w-full px-6 py-4 rounded-lg text-gray-800" required>
                    </div>
                    <div>
                        <input type="email" placeholder="Votre email" class="w-full px-6 py-4 rounded-lg text-gray-800" required>
                    </div>
                    <div>
                        <input type="tel" placeholder="Votre téléphone" class="w-full px-6 py-4 rounded-lg text-gray-800">
                    </div>
                    <div>
                        <textarea placeholder="Votre message" rows="5" class="w-full px-6 py-4 rounded-lg text-gray-800" required></textarea>
                    </div>
                    <button type="submit" class="w-full bg-white text-primary-color px-8 py-4 rounded-lg font-semibold hover:opacity-90 transition" style="color: var(--primary-color)">
                        Envoyer <i class="fas fa-paper-plane ml-2"></i>
                    </button>
                </form>
            </div>
        </div>
    </section>
    
    <!-- Footer -->
    <footer class="bg-gray-900 text-white py-12">
        <div class="container mx-auto px-4 text-center">
            <p class="text-lg mb-4">&copy; 2024 ${companyName}. Tous droits réservés.</p>
            <p class="text-gray-400">Site modernisé par IntelliAIScale</p>
        </div>
    </footer>
</body>
</html>`;
}

// ================================
// GÉNÉRATION VISUELS GEMINI
// ================================

async function generateSocialVisuals(companyName, industry, colors) {
  try {
    if (!GEMINI_API_KEY) {
      console.log('[GEMINI] Clé API manquante');
      return [];
    }
    
    const model = genAI.getGenerativeModel({ model: 'imagen-3.0-generate-001' });
    
    const visualPrompts = [
      {
        type: 'Instagram Post',
        size: '1080x1080',
        prompt: `Professional Instagram post for ${companyName} in ${industry} industry. Modern design with bold headline "${companyName} - Innovation Digitale". Eye-catching gradient background using ${colors[0]} and ${colors[1]}. Include compelling CTA "Découvrez Notre Plateforme". Clean, premium aesthetic with subtle geometric patterns. High-quality, ready to post.`
      },
      {
        type: 'Facebook Cover',
        size: '1640x624',
        prompt: `Premium Facebook cover photo for ${companyName} (${industry}). Showcase brand identity with logo space on left side. Modern gradient from ${colors[0]} to ${colors[1]}. Tagline "Votre Partenaire Digital de Confiance". Professional, corporate style with subtle tech elements. High-resolution banner.`
      },
      {
        type: 'LinkedIn Banner',
        size: '1584x396',
        prompt: `Corporate LinkedIn banner for ${companyName} in ${industry} sector. Professional design with text "Excellence & Performance". Color scheme ${colors[0]} and ${colors[1]}. Modern, clean layout with abstract business graphics. Premium quality for B2B audience.`
      },
      {
        type: 'Twitter Header',
        size: '1500x500',
        prompt: `Dynamic Twitter header for ${companyName} (${industry}). Engaging design with text "Transformation Numérique". Vibrant gradient ${colors[0]} to ${colors[1]}. Include subtle tech icons and modern patterns. Eye-catching for social media feed.`
      },
      {
        type: 'Instagram Story',
        size: '1080x1920',
        prompt: `Vertical Instagram story template for ${companyName}. Title "Nouveautés 2024". Modern design with ${colors[0]} accent color. Include space for text overlay and CTA button. Trendy, mobile-optimized design with engaging visual elements.`
      },
      {
        type: 'Pinterest Pin',
        size: '1000x1500',
        prompt: `Tall Pinterest pin for ${companyName} services (${industry}). Title "Services Premium". Elegant design with ${colors[0]} and ${colors[1]} color palette. Include benefit points and clear branding. High-quality, click-worthy design for Pinterest feed.`
      }
    ];
    
    const visuals = [];
    
    for (let i = 0; i < visualPrompts.length; i++) {
      console.log(`[GEMINI] Génération visuel ${i + 1}/6: ${visualPrompts[i].type}...`);
      
      try {
        const result = await model.generateImages({
          prompt: visualPrompts[i].prompt,
          number_of_images: 1,
          aspect_ratio: '1:1' // Gemini supporte : '1:1', '16:9', '9:16'
        });
        
        if (result && result.images && result.images[0]) {
          visuals.push({
            type: visualPrompts[i].type,
            size: visualPrompts[i].size,
            url: result.images[0].url || result.images[0].image,
            prompt: visualPrompts[i].prompt
          });
        }
        
        // Pause 2 secondes entre requêtes
        await new Promise(resolve => setTimeout(resolve, 2000));
        
      } catch (imgError) {
        console.error(`[GEMINI] Erreur génération ${visualPrompts[i].type}:`, imgError.message);
        // Continue avec les autres images même si une échoue
      }
    }
    
    console.log(`[GEMINI] ✅ ${visuals.length}/6 visuels générés`);
    return visuals;
    
  } catch (error) {
    console.error('[GEMINI] Erreur:', error.message);
    return [];
  }
}

// ================================
// PROSPECTS QUALIFIÉS INTELLIAISCALE
// ================================

async function findProspectsForIntelliAIScale(location = 'Montréal, QC', limit = 10) {
  try {
    // Critères de ciblage pour IntelliAIScale
    const targetCriteria = {
      location: location,
      industries: ['Santé', 'E-commerce', 'Services B2B', 'Immobilier', 'Restauration', 'Services juridiques'],
      targetingReasons: [
        'Site web démodé (design >5 ans)',
        'Pas de chatbot IA visible',
        'Pas de Voice AI Agent',
        'Faible présence réseaux sociaux (<10 posts/mois)',
        'Formulaires de contact basiques',
        'Temps de chargement >3 secondes',
        'Site non-responsive mobile'
      ],
      services: [
        'Stealth Upgrade complet ($7,500)',
        'Chatbot IA personnalisé ($1,500)',
        'Voice AI Agent Vapi ($2,000)',
        'Gestion réseaux sociaux ($800/mois)',
        'Génération posts automatisés ($500/mois)',
        'Automation GHL complète ($3,000)'
      ]
    };
    
    // TODO : Intégration Apify pour scraper Google Maps / LinkedIn
    // const apifyClient = new ApifyClient({ token: process.env.APIFY_API_KEY });
    // const run = await apifyClient.actor('...').call({ location, limit });
    
    // Pour l'instant : retourne structure de données exemple
    const prospects = [];
    for (let i = 0; i < Math.min(limit, 3); i++) {
      prospects.push({
        id: `prospect-${Date.now()}-${i}`,
        companyName: `Example Corp ${i + 1}`,
        websiteUrl: `https://example-corp-${i + 1}.com`,
        location: location,
        industry: targetCriteria.industries[i % targetCriteria.industries.length],
        score: Math.floor(Math.random() * 30) + 70, // Score 70-100
        status: 'pending',
        targetingReasons: targetCriteria.targetingReasons.slice(0, 3),
        recommendedServices: targetCriteria.services.slice(0, 3),
        estimatedValue: '$7,500 - $15,000',
        contactInfo: {
          email: `contact@example-corp-${i + 1}.com`,
          phone: null
        },
        createdAt: new Date().toISOString()
      });
    }
    
    return {
      prospects: prospects,
      totalCount: prospects.length,
      searchCriteria: targetCriteria,
      location: location
    };
    
  } catch (error) {
    console.error('[PROSPECTS] Erreur:', error.message);
    return { prospects: [], totalCount: 0 };
  }
}

// ================================
// ENDPOINTS API
// ================================

app.get('/', (req, res) => {
  res.json({
    status: 'OK',
    version: '4.1',
    features: ['Scraping', 'Gemini Imagen', 'PDF', 'Browserless', 'Prospects']
  });
});

app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    browserless: USE_BROWSERLESS,
    gemini: !!GEMINI_API_KEY
  });
});

app.get('/api/packages', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('packages')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(10);
    
    if (error) {
      console.log('[API] Table packages vide:', error.message);
      return res.json({ success: true, packages: [] });
    }
    
    res.json({ success: true, packages: data || [] });
  } catch (error) {
    console.error('[API] Erreur:', error.message);
    res.json({ success: true, packages: [] });
  }
});

app.get('/api/prospects', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('prospects')
      .select('*')
      .order('score', { ascending: false });
    
    if (error) {
      console.log('[API] Table prospects vide:', error.message);
      return res.json({ success: true, prospects: [] });
    }
    
    res.json({ success: true, prospects: data || [] });
  } catch (error) {
    console.error('[API] Erreur:', error.message);
    res.json({ success: true, prospects: [] });
  }
});

// Nouveau endpoint : Recherche prospects pour IntelliAIScale
app.post('/api/prospects/search', async (req, res) => {
  try {
    const { location, limit } = req.body;
    
    console.log(`[PROSPECTS] Recherche: ${location || 'Montréal'}, limit: ${limit || 10}`);
    
    const result = await findProspectsForIntelliAIScale(location, limit);
    
    // Sauvegarder dans Supabase
    if (result.prospects.length > 0) {
      const { error } = await supabase
        .from('prospects')
        .insert(result.prospects);
      
      if (error) {
        console.error('[PROSPECTS] Erreur sauvegarde:', error.message);
      }
    }
    
    res.json({
      success: true,
      ...result
    });
    
  } catch (error) {
    console.error('[PROSPECTS] Erreur:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// Nouveau endpoint : Mettre à jour statut prospect
app.patch('/api/prospects/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    
    const allowedStatuses = ['pending', 'contacted', 'loom_sent', 'qualified', 'not_qualified'];
    
    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({ error: 'Statut invalide' });
    }
    
    const { data, error } = await supabase
      .from('prospects')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select();
    
    if (error) throw error;
    
    res.json({ success: true, prospect: data[0] });
    
  } catch (error) {
    console.error('[PROSPECTS] Erreur mise à jour:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// Endpoint génération package complet
app.post('/api/generate/package', async (req, res) => {
  const { url, companyName } = req.body;

  if (!url || !companyName) {
    return res.status(400).json({ error: 'URL et nom requis' });
  }

  console.log(`[PACKAGE] 🚀 Génération pour ${url}...`);

  let browser;
  try {
    // ÉTAPE 1: Connexion Browserless
    console.log('[PACKAGE] 📊 Étape 1/7: Connexion navigateur...');
    if (USE_BROWSERLESS) {
      browser = await chromium.connect(BROWSER_WS_ENDPOINT);
    } else {
      browser = await chromium.launch(BROWSER_CONFIG);
    }

    // ÉTAPE 2: Scraping
    console.log('[PACKAGE] 📊 Étape 2/7: Scraping du site...');
    const page = await browser.newPage();
    
    // Bloquer ressources lourdes pour accélérer
    await page.route('**/*', (route) => {
      const resourceType = route.request().resourceType();
      if (['image', 'media', 'font'].includes(resourceType)) {
        route.abort();
      } else {
        route.continue();
      }
    });
    
    await page.goto(url, { 
      waitUntil: 'domcontentloaded',
      timeout: 90000
    });
    
    await page.waitForTimeout(3000); // Attendre JS

    // ÉTAPE 3: Extraction données
    console.log('[PACKAGE] 📊 Étape 3/7: Extraction des données...');
    const title = await page.title();
    const websiteContent = await page.textContent('body');
    const colors = await extractColors(page);
    const logoUrl = await extractLogo(page);
    const sections = await extractSections(page);
    const issues = await analyzeIssues(page);
    const score = Math.max(100 - (issues.length * 10), 50);

    console.log(`[PACKAGE] Couleurs extraites: ${colors.length}`);
    console.log(`[PACKAGE] Logo: ${logoUrl ? 'Trouvé' : 'Non trouvé'}`);
    console.log(`[PACKAGE] Sections: ${sections.length}`);

    await browser.close();

    // ÉTAPE 4: Détection industrie
    console.log('[PACKAGE] 📊 Étape 4/7: Détection industrie...');
    const industry = await detectIndustry(companyName, websiteContent);

    // ÉTAPE 5: Génération contenu IA
    console.log('[PACKAGE] 📊 Étape 5/7: Génération contenu IA...');
    const aiContent = await generateAIContent(companyName, url, colors, issues, industry);

    // ÉTAPE 6: Génération PDF
    console.log('[PACKAGE] 📊 Étape 6/7: Génération PDF...');
    const packageData = {
      company_name: companyName,
      website_url: url,
      audit_score: score,
      audit_issues: issues,
      color_palette: { colors },
      detected_industry: industry
    };
    
    const auditPDF = await generateAuditPDF(packageData);
    const proposalPDF = await generateProposalPDF(packageData);

    // Génération HTML GHL amélioré
    const htmlCode = generateHTMLCode(companyName, colors, url, logoUrl, sections, industry);

    // ÉTAPE 7: Génération visuels Gemini
    console.log('[PACKAGE] 📊 Étape 7/7: Génération visuels Gemini...');
    let socialVisuals = [];
    if (GEMINI_API_KEY) {
      socialVisuals = await generateSocialVisuals(companyName, industry, colors);
    }

    // Sauvegarde Supabase
    const finalPackage = {
      company_name: companyName,
      website_url: url,
      status: 'completed',
      audit_score: score,
      audit_issues: issues,
      audit_opportunities: [
        { title: 'Chatbot IA 24/7', potentialGain: '+35% de leads' },
        { title: 'Voice AI Agent', potentialGain: '+50% de RDV' },
        { title: 'Refonte Design Moderne', potentialGain: '+40% d\'engagement' },
        { title: 'Automation Réseaux Sociaux', potentialGain: '+60% de portée' }
      ],
      color_palette: { colors },
      logo_url: logoUrl,
      sections: sections,
      detected_industry: industry,
      html_code: htmlCode,
      ai_system_prompt: aiContent?.system_prompt,
      brand_kit_prompt: aiContent?.brand_kit_prompt,
      loom_script: aiContent?.loom_script,
      email_templates: aiContent?.email_templates,
      audit_report_pdf: auditPDF,
      proposal_pdf: proposalPDF,
      social_visuals: socialVisuals,
      created_at: new Date().toISOString()
    };

    const { data, error } = await supabase
      .from('packages')
      .insert([finalPackage])
      .select();

    if (error) throw error;

    console.log('[PACKAGE] ✅ Package créé avec succès !');

    // Structure pour dashboard
    const packageForDashboard = {
      ...data[0],
      audit: {
        score: score,
        issues: issues.map(issue => ({ title: issue, description: '' })),
        opportunities: finalPackage.audit_opportunities
      },
      deliverables: {
        audit_report_pdf: data[0].audit_report_pdf,
        proposal_pdf: data[0].proposal_pdf,
        html_code: data[0].html_code,
        ai_system_prompt: data[0].ai_system_prompt,
        brand_kit_prompt: data[0].brand_kit_prompt,
        loom_script: data[0].loom_script,
        email_templates: data[0].email_templates,
        social_visuals: socialVisuals,
        qualified_prospects: { prospects: [], totalCount: 0 }
      }
    };

    res.json({
      success: true,
      package: packageForDashboard,
      score: score,
      industry: industry,
      deliverables: {
        audit_pdf: !!auditPDF,
        proposal_pdf: !!proposalPDF,
        social_visuals_count: socialVisuals.length,
        ai_content: !!aiContent,
        emails_count: aiContent?.email_templates?.length || 0,
        html_code: !!htmlCode,
        logo_found: !!logoUrl,
        sections_count: sections.length
      },
      package_id: data[0].id
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
  console.log(`
  ┌────────────────────────────────────────┐
  │  🚀 IAS BACKEND API v4.1 FINAL        │
  │                                        │
  │  ✅ Serveur démarré sur le port ${PORT} │
  │  ✅ Mode: ${USE_BROWSERLESS ? 'Browserless ✅' : 'Local'}             │
  │  ✅ Gemini: ${GEMINI_API_KEY ? '✅ Configuré' : '❌ Manquant'}        │
  │                                        │
  │  Endpoints:                            │
  │  • GET  /                              │
  │  • GET  /api/health                    │
  │  • GET  /api/packages                  │
  │  • GET  /api/prospects                 │
  │  • POST /api/prospects/search          │
  │  • PATCH /api/prospects/:id/status     │
  │  • POST /api/generate/package          │
  └────────────────────────────────────────┘
  `);
});
