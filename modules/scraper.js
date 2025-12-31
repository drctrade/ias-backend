// ================================
// MODULE SCRAPER - Analyse de sites web
// Utilise Firecrawl pour le scraping
// ================================

const Firecrawl = require('@mendable/firecrawl-js').default;

// Configuration Firecrawl
const FIRECRAWL_API_KEY = process.env.FIRECRAWL_API_KEY || '';

/**
 * Scrape un site web et extrait les données pertinentes
 */
async function scrapeWebsite(url) {
  try {
    console.log('[SCRAPER] Connexion a Firecrawl...');
    
    if (!FIRECRAWL_API_KEY) {
      throw new Error('FIRECRAWL_API_KEY manquant');
    }
    
    const app = new Firecrawl({ apiKey: FIRECRAWL_API_KEY });
    
    console.log(`[SCRAPER] Scraping de ${url}...`);
    
    // Scraper le site avec Firecrawl
    const result = await app.scrapeUrl(url, {
      formats: ['html', 'markdown', 'screenshot'],
      waitFor: 2000
    });
    
    console.log('[SCRAPER] Page chargee, extraction des donnees...');
    
    if (!result.success) {
      throw new Error('Firecrawl scraping failed');
    }
    
    const data = result.data;
    const html = data.html || '';
    const metadata = data.metadata || {};
    
    // Extraire les couleurs depuis le HTML
    const colors = extractColorsFromHTML(html);
    
    // Extraire le logo depuis le HTML
    const logoUrl = extractLogoFromHTML(html);
    
    // Extraire les sections depuis le HTML
    const sections = extractSectionsFromHTML(html);
    
    // Analyser les problèmes
    const issues = analyzeIssues(html, metadata);
    
    const title = metadata.title || data.title || 'Sans titre';
    const score = Math.max(100 - (issues.length * 10), 50);
    
    console.log('[SCRAPER] Donnees extraites:', {
      title,
      score,
      colorsCount: colors.length,
      sectionsCount: sections.length,
      issuesCount: issues.length
    });

    console.log('[SCRAPER] Scraping termine avec Firecrawl');

    return {
      url,
      title,
      colors,
      logoUrl,
      sections,
      issues,
      score,
      industry: detectIndustry(title, url)
    };

  } catch (error) {
    console.error('[SCRAPER] Erreur:', error.message);
    throw error;
  }
}

/**
 * Extraire les couleurs depuis le HTML
 */
function extractColorsFromHTML(html) {
  const colors = new Set();
  const colorRegex = /#([0-9A-Fa-f]{3}){1,2}\b|rgb\([^)]+\)|rgba\([^)]+\)/g;
  const matches = html.match(colorRegex);
  
  if (matches) {
    matches.forEach(color => colors.add(color));
  }
  
  const colorArray = Array.from(colors).slice(0, 10);
  return colorArray.length > 0 ? colorArray : ['#0f204b', '#5bc236', '#ffffff'];
}

/**
 * Extraire le logo depuis le HTML
 */
function extractLogoFromHTML(html) {
  const logoPatterns = [
    /src=["']([^"']*logo[^"']*)["']/i,
    /src=["']([^"']*brand[^"']*)["']/i,
    /<img[^>]*class=["'][^"']*logo[^"']*["'][^>]*src=["']([^"']*)["']/i
  ];
  
  for (const pattern of logoPatterns) {
    const match = html.match(pattern);
    if (match && match[1]) {
      return match[1];
    }
  }
  
  return null;
}

/**
 * Extraire les sections depuis le HTML
 */
function extractSectionsFromHTML(html) {
  const sections = [];
  const sectionRegex = /<(header|section|main|article|footer)[^>]*>(.*?)<\/\1>/gis;
  let match;
  let count = 0;
  
  while ((match = sectionRegex.exec(html)) !== null && count < 8) {
    const tag = match[1];
    const content = match[2];
    const headingMatch = content.match(/<h[1-3][^>]*>([^<]+)<\/h[1-3]>/i);
    const title = headingMatch ? headingMatch[1].trim() : `${tag.toUpperCase()} ${count + 1}`;
    
    sections.push({ tag, title });
    count++;
  }
  
  return sections;
}

/**
 * Analyser les problèmes du site
 */
function analyzeIssues(html, metadata) {
  const problems = [];
  
  // Vérifier viewport
  if (!html.includes('name="viewport"') && !html.includes("name='viewport'")) {
    problems.push('Site non-responsive');
  }
  
  // Vérifier chatbot
  if (!html.includes('chat') && !html.includes('Chat')) {
    problems.push('Pas de chatbot IA');
  }
  
  // Vérifier CTA
  const ctaCount = (html.match(/contact|Contact|cta|CTA|button|Button/g) || []).length;
  if (ctaCount < 3) {
    problems.push('Manque de CTA');
  }
  
  return problems.length > 0 ? problems : ['Aucun probleme majeur'];
}

/**
 * Détecter l'industrie
 */
function detectIndustry(title, url) {
  const text = (title + ' ' + url).toLowerCase();
  if (text.includes('clinic') || text.includes('health') || text.includes('medical')) return 'Santé';
  if (text.includes('restaurant') || text.includes('food')) return 'Restauration';
  if (text.includes('tech') || text.includes('software')) return 'Technologie';
  return 'General';
}

module.exports = { scrapeWebsite };
