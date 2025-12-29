// ================================
// MODULE SCRAPER - Analyse de sites web
// ================================

const puppeteer = require('puppeteer');
const axios = require('axios');

// Configuration Puppeteer pour Render.com
const BROWSER_CONFIG = {
  headless: 'new',
  args: [
    '--no-sandbox',
    '--disable-setuid-sandbox',
    '--disable-dev-shm-usage',
    '--disable-accelerated-2d-canvas',
    '--no-first-run',
    '--no-zygote',
    '--single-process',
    '--disable-gpu',
    '--disable-software-rasterizer',
    '--disable-extensions',
    '--disable-background-networking',
    '--disable-default-apps',
    '--disable-sync',
    '--disable-translate',
    '--hide-scrollbars',
    '--metrics-recording-only',
    '--mute-audio',
    '--no-default-browser-check',
    '--safebrowsing-disable-auto-update'
  ]
};

/**
 * Scrape un site web et extrait les données pertinentes
 */
async function scrapeWebsite(url) {
  let browser = null;
  
  try {
    console.log('[SCRAPER] Lancement du navigateur...');
    browser = await puppeteer.launch(BROWSER_CONFIG);
    
    const page = await browser.newPage();
    
    // Configuration de la page
    await page.setViewport({ width: 1920, height: 1080 });
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
    
    // Bloquer les ressources lourdes pour accélérer
    await page.setRequestInterception(true);
    page.on('request', (req) => {
      const resourceType = req.resourceType();
      if (['image', 'stylesheet', 'font', 'media'].includes(resourceType)) {
        req.abort();
      } else {
        req.continue();
      }
    });

    console.log('[SCRAPER] Navigation vers', url);
    await page.goto(url, { 
      waitUntil: 'domcontentloaded',
      timeout: 60000
    });
    
    // Attendre que le contenu se charge
    await page.waitForTimeout(2000);

    // Extraction des données
    const data = await page.evaluate(() => {
      // Titre
      const title = document.title || '';
      
      // Meta description
      const metaDesc = document.querySelector('meta[name="description"]')?.content || '';
      
      // Couleurs
      const colors = extractColors();
      
      // Polices
      const fonts = extractFonts();
      
      // Problèmes détectés
      const issues = detectIssues();
      
      // Opportunités
      const opportunities = detectOpportunities();
      
      // Contenu textuel
      const textContent = extractTextContent();
      
      // Liens et navigation
      const navigation = extractNavigation();
      
      // Images
      const images = extractImages();
      
      // Contact info
      const contactInfo = extractContactInfo();

      return {
        title,
        metaDesc,
        colors,
        fonts,
        issues,
        opportunities,
        textContent,
        navigation,
        images,
        contactInfo
      };

      // Fonctions d'extraction internes
      function extractColors() {
        const colorSet = new Set();
        const elements = document.querySelectorAll('*');
        
        elements.forEach(el => {
          const styles = window.getComputedStyle(el);
          const bgColor = styles.backgroundColor;
          const color = styles.color;
          
          if (bgColor && bgColor !== 'rgba(0, 0, 0, 0)' && bgColor !== 'transparent') {
            colorSet.add(rgbToHex(bgColor));
          }
          if (color && color !== 'rgba(0, 0, 0, 0)' && color !== 'transparent') {
            colorSet.add(rgbToHex(color));
          }
        });
        
        return Array.from(colorSet).filter(c => c && c !== '#000000' && c !== '#ffffff').slice(0, 6);
      }

      function rgbToHex(rgb) {
        if (!rgb || rgb === 'transparent') return null;
        if (rgb.startsWith('#')) return rgb;
        
        const match = rgb.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
        if (!match) return null;
        
        const r = parseInt(match[1]).toString(16).padStart(2, '0');
        const g = parseInt(match[2]).toString(16).padStart(2, '0');
        const b = parseInt(match[3]).toString(16).padStart(2, '0');
        
        return `#${r}${g}${b}`;
      }

      function extractFonts() {
        const fontSet = new Set();
        const elements = document.querySelectorAll('h1, h2, h3, p, span, a');
        
        elements.forEach(el => {
          const font = window.getComputedStyle(el).fontFamily;
          if (font) {
            const mainFont = font.split(',')[0].replace(/['"]/g, '').trim();
            fontSet.add(mainFont);
          }
        });
        
        return Array.from(fontSet).slice(0, 5);
      }

      function detectIssues() {
        const problems = [];
        
        // Responsive
        if (!document.querySelector('meta[name="viewport"]')) {
          problems.push({
            type: 'critical',
            title: 'Site non-responsive',
            description: 'Pas de meta viewport détecté. Le site ne s\'adapte pas aux mobiles.',
            impact: 'Perte de 60% du trafic mobile'
          });
        }
        
        // Chatbot
        const hasChatbot = document.querySelector('[class*="chat"]') || 
                          document.querySelector('[id*="chat"]') ||
                          document.querySelector('iframe[src*="chat"]') ||
                          document.querySelector('[class*="messenger"]');
        if (!hasChatbot) {
          problems.push({
            type: 'high',
            title: 'Pas de chatbot IA',
            description: 'Aucun système de chat automatisé détecté.',
            impact: 'Perte de leads 24/7'
          });
        }
        
        // CTA
        const ctaButtons = document.querySelectorAll('a[href*="contact"], button[class*="cta"], a[class*="button"], .btn, .button');
        if (ctaButtons.length < 3) {
          problems.push({
            type: 'high',
            title: 'Manque de CTA',
            description: `Seulement ${ctaButtons.length} boutons d'action détectés.`,
            impact: 'Taux de conversion réduit de 40%'
          });
        }
        
        // SSL
        if (window.location.protocol !== 'https:') {
          problems.push({
            type: 'critical',
            title: 'Pas de HTTPS',
            description: 'Le site n\'utilise pas de connexion sécurisée.',
            impact: 'Pénalité SEO et perte de confiance'
          });
        }
        
        // Performance (basique)
        const hasLazyLoading = document.querySelector('img[loading="lazy"]');
        if (!hasLazyLoading) {
          problems.push({
            type: 'medium',
            title: 'Pas de lazy loading',
            description: 'Les images ne sont pas chargées de manière optimisée.',
            impact: 'Temps de chargement augmenté'
          });
        }
        
        // Formulaire de capture
        const hasForms = document.querySelectorAll('form').length;
        if (hasForms < 1) {
          problems.push({
            type: 'high',
            title: 'Pas de formulaire de capture',
            description: 'Aucun formulaire pour capturer les leads.',
            impact: 'Impossible de collecter des prospects'
          });
        }
        
        // Réseaux sociaux
        const hasSocialLinks = document.querySelector('a[href*="facebook"]') ||
                              document.querySelector('a[href*="instagram"]') ||
                              document.querySelector('a[href*="linkedin"]');
        if (!hasSocialLinks) {
          problems.push({
            type: 'low',
            title: 'Pas de liens réseaux sociaux',
            description: 'Aucun lien vers les réseaux sociaux.',
            impact: 'Engagement réduit'
          });
        }

        return problems;
      }

      function detectOpportunities() {
        return [
          {
            title: 'Chatbot IA 24/7',
            description: 'Répondre automatiquement aux visiteurs et qualifier les leads.',
            potentialGain: '+35% de leads qualifiés'
          },
          {
            title: 'Voice AI Agent',
            description: 'Agent vocal pour répondre aux appels et prendre des rendez-vous.',
            potentialGain: '+50% de rendez-vous pris'
          },
          {
            title: 'Automatisation réseaux sociaux',
            description: 'Publication automatique et réponses aux messages.',
            potentialGain: '+200% d\'engagement'
          },
          {
            title: 'Funnel de conversion optimisé',
            description: 'Pages de capture et séquences email automatisées.',
            potentialGain: '+45% de taux de conversion'
          },
          {
            title: 'Intégration CRM',
            description: 'Synchronisation automatique des leads avec GoHighLevel.',
            potentialGain: '10h/semaine économisées'
          }
        ];
      }

      function extractTextContent() {
        const h1 = document.querySelector('h1')?.textContent?.trim() || '';
        const h2s = Array.from(document.querySelectorAll('h2')).map(h => h.textContent?.trim()).slice(0, 5);
        const paragraphs = Array.from(document.querySelectorAll('p')).map(p => p.textContent?.trim()).filter(p => p.length > 50).slice(0, 3);
        
        return { h1, h2s, paragraphs };
      }

      function extractNavigation() {
        const navLinks = Array.from(document.querySelectorAll('nav a, header a')).map(a => ({
          text: a.textContent?.trim(),
          href: a.href
        })).filter(l => l.text).slice(0, 10);
        
        return navLinks;
      }

      function extractImages() {
        return Array.from(document.querySelectorAll('img')).map(img => ({
          src: img.src,
          alt: img.alt
        })).slice(0, 10);
      }

      function extractContactInfo() {
        const text = document.body.innerText;
        
        // Email
        const emailMatch = text.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
        const email = emailMatch ? emailMatch[0] : null;
        
        // Téléphone
        const phoneMatch = text.match(/(\+\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/);
        const phone = phoneMatch ? phoneMatch[0] : null;
        
        // Adresse (simplifiée)
        const addressEl = document.querySelector('[class*="address"], [class*="location"], address');
        const address = addressEl?.textContent?.trim() || null;
        
        return { email, phone, address };
      }
    });

    // Prendre une capture d'écran
    const screenshot = await page.screenshot({ 
      encoding: 'base64',
      fullPage: false,
      type: 'jpeg',
      quality: 70
    });

    await browser.close();

    // Calculer le score
    const score = calculateScore(data.issues);
    
    // Détecter l'industrie
    const industry = detectIndustry(data.textContent, data.title, url);

    // Extraire le nom de l'entreprise
    const companyName = extractCompanyName(data.title, url);

    return {
      url,
      title: data.title,
      description: data.metaDesc,
      companyName,
      industry,
      colors: data.colors.length > 0 ? data.colors : ['#0f204b', '#5bc236', '#ffffff'],
      fonts: data.fonts,
      issues: data.issues,
      opportunities: data.opportunities,
      textContent: data.textContent,
      navigation: data.navigation,
      contactInfo: data.contactInfo,
      screenshot: `data:image/jpeg;base64,${screenshot}`,
      score,
      timestamp: new Date().toISOString()
    };

  } catch (error) {
    if (browser) await browser.close();
    console.error('[SCRAPER] Erreur:', error.message);
    
    // Retourner des données par défaut en cas d'erreur
    return {
      url,
      title: extractDomainName(url),
      description: '',
      companyName: extractDomainName(url),
      industry: 'Services',
      colors: ['#0f204b', '#5bc236', '#ffffff'],
      fonts: ['Inter', 'Arial'],
      issues: [
        { type: 'critical', title: 'Analyse incomplète', description: 'Le site n\'a pas pu être analysé complètement.', impact: 'Données limitées' }
      ],
      opportunities: [
        { title: 'Chatbot IA 24/7', description: 'Répondre automatiquement aux visiteurs.', potentialGain: '+35% de leads' },
        { title: 'Voice AI Agent', description: 'Agent vocal automatisé.', potentialGain: '+50% de RDV' }
      ],
      textContent: { h1: '', h2s: [], paragraphs: [] },
      navigation: [],
      contactInfo: {},
      screenshot: null,
      score: 50,
      timestamp: new Date().toISOString(),
      error: error.message
    };
  }
}

function calculateScore(issues) {
  let score = 100;
  
  issues.forEach(issue => {
    switch (issue.type) {
      case 'critical': score -= 20; break;
      case 'high': score -= 15; break;
      case 'medium': score -= 10; break;
      case 'low': score -= 5; break;
    }
  });
  
  return Math.max(score, 20);
}

function detectIndustry(textContent, title, url) {
  const text = `${title} ${textContent.h1} ${textContent.h2s?.join(' ')} ${url}`.toLowerCase();
  
  const industries = {
    'Restaurant': ['restaurant', 'cuisine', 'menu', 'réservation', 'chef', 'gastronomie', 'pizzeria', 'bistro'],
    'Immobilier': ['immobilier', 'maison', 'appartement', 'vente', 'location', 'agence immobilière', 'courtier'],
    'Santé': ['médecin', 'clinique', 'santé', 'dentiste', 'docteur', 'cabinet', 'soins', 'thérapie'],
    'Beauté': ['salon', 'coiffure', 'beauté', 'esthétique', 'spa', 'massage', 'manucure'],
    'Fitness': ['gym', 'fitness', 'sport', 'musculation', 'yoga', 'entraînement', 'coach'],
    'E-commerce': ['boutique', 'shop', 'achat', 'panier', 'livraison', 'produits'],
    'Juridique': ['avocat', 'juridique', 'droit', 'cabinet', 'notaire', 'legal'],
    'Finance': ['comptable', 'finance', 'banque', 'investissement', 'assurance', 'crédit'],
    'Technologie': ['tech', 'software', 'développement', 'application', 'digital', 'web'],
    'Construction': ['construction', 'rénovation', 'bâtiment', 'entrepreneur', 'travaux'],
    'Automobile': ['auto', 'voiture', 'garage', 'mécanique', 'concessionnaire'],
    'Éducation': ['école', 'formation', 'cours', 'apprentissage', 'tuteur', 'académie']
  };
  
  for (const [industry, keywords] of Object.entries(industries)) {
    if (keywords.some(keyword => text.includes(keyword))) {
      return industry;
    }
  }
  
  return 'Services Professionnels';
}

function extractCompanyName(title, url) {
  // Essayer d'extraire du titre
  if (title) {
    const cleanTitle = title.split('|')[0].split('-')[0].split('–')[0].trim();
    if (cleanTitle.length > 2 && cleanTitle.length < 50) {
      return cleanTitle;
    }
  }
  
  // Sinon, utiliser le domaine
  return extractDomainName(url);
}

function extractDomainName(url) {
  try {
    const domain = new URL(url).hostname.replace('www.', '');
    const name = domain.split('.')[0];
    return name.charAt(0).toUpperCase() + name.slice(1);
  } catch {
    return 'Client';
  }
}

module.exports = {
  scrapeWebsite
};
