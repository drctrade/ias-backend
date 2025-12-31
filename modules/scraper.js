// ================================
// MODULE SCRAPER - Analyse de sites web
// Utilise Browserless pour le scraping
// ================================

const { chromium } = require('playwright');

// Configuration Browserless
const BROWSERLESS_TOKEN = process.env.BROWSERLESS_TOKEN || '';
const BROWSER_WS_ENDPOINT = BROWSERLESS_TOKEN 
  ? `wss://production-sfo.browserless.io/playwright?token=${BROWSERLESS_TOKEN}`
  : null;

/**
 * Scrape un site web et extrait les données pertinentes
 */
async function scrapeWebsite(url) {
  let browser = null;
  
  try {
    console.log('[SCRAPER] Connexion a Browserless...');
    
    if (!BROWSER_WS_ENDPOINT) {
      throw new Error('BROWSERLESS_TOKEN manquant');
    }
    
    console.log('[SCRAPER] WebSocket endpoint:', BROWSER_WS_ENDPOINT);
    
    // Connexion à Browserless via WebSocket avec timeout
    browser = await chromium.connect(BROWSER_WS_ENDPOINT, {
      timeout: 60000
    });
    const page = await browser.newPage();
    
    console.log('[SCRAPER] Navigateur connecte avec succes');
    
    console.log(`[SCRAPER] Navigation vers ${url}...`);
    await page.goto(url, { 
      waitUntil: 'domcontentloaded', 
      timeout: 60000 
    });
    
    console.log('[SCRAPER] Page chargee, extraction des donnees...');

    // Extraire les couleurs
    const colors = await page.evaluate(() => {
      const colorSet = new Set();
      document.querySelectorAll('*').forEach(el => {
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

    // Extraire le logo
    const logoUrl = await page.evaluate(() => {
      const selectors = [
        'img[alt*="logo" i]',
        'img.logo',
        '.logo img',
        'header img:first-of-type'
      ];
      for (const sel of selectors) {
        const img = document.querySelector(sel);
        if (img && img.src) return img.src;
      }
      return null;
    });

    // Extraire les sections
    const sections = await page.evaluate(() => {
      const found = [];
      ['header', 'section', 'main', 'article', 'footer'].forEach(tag => {
        document.querySelectorAll(tag).forEach((el, i) => {
          const heading = el.querySelector('h1, h2, h3');
          const title = heading ? heading.textContent.trim() : `${tag.toUpperCase()} ${i + 1}`;
          found.push({ tag, title });
        });
      });
      return found.slice(0, 8);
    });

    // Analyser les problèmes
    const issues = await page.evaluate(() => {
      const problems = [];
      if (!document.querySelector('meta[name="viewport"]')) {
        problems.push('Site non-responsive');
      }
      if (!document.querySelector('[class*="chat"]') && !document.querySelector('[id*="chat"]')) {
        problems.push('Pas de chatbot IA');
      }
      if (document.querySelectorAll('a[href*="contact"], button[class*="cta"]').length < 2) {
        problems.push('Manque de CTA');
      }
      return problems.length > 0 ? problems : ['Aucun problème majeur'];
    });

    const title = await page.title();
    const score = Math.max(100 - (issues.length * 10), 50);
    
    console.log('[SCRAPER] Donnees extraites:', {
      title,
      score,
      colorsCount: colors.length,
      sectionsCount: sections.length,
      issuesCount: issues.length
    });

    await browser.close();
    browser = null;

    console.log('[SCRAPER] Scraping termine avec Browserless');

    return {
      url,
      title,
      colors: colors.length > 0 ? colors : ['#0f204b', '#5bc236', '#ffffff'],
      logoUrl,
      sections,
      issues,
      score,
      industry: detectIndustry(title, url)
    };

  } catch (error) {
    if (browser) await browser.close();
    console.error('[SCRAPER] Erreur:', error.message);
    throw error;
  }
}

function detectIndustry(title, url) {
  const text = (title + ' ' + url).toLowerCase();
  if (text.includes('clinic') || text.includes('health') || text.includes('medical')) return 'Santé';
  if (text.includes('restaurant') || text.includes('food')) return 'Restauration';
  if (text.includes('tech') || text.includes('software')) return 'Technologie';
  return 'General';
}

module.exports = { scrapeWebsite };
