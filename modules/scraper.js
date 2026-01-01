// ================================
// MODULE SCRAPER - Analyse de sites web (v5.0)
// Améliorations clés:
// - Détection langue (EN/FR/ES) + région (CA/US/INTL)
// - Extraction logo robuste (incl. og:image, schema.org, liens relatifs -> absolus)
// - Extraction couleurs plus fiable (CSS variables + fréquence, ignore gris/blanc/noir)
// - Extraction contenu (H1/H2, meta description, services) pour un Brand Kit + site amélioré plus précis
// - Audit issues plus crédible (SEO, CTA, mobile, vitesse approximative, accessibilité basique)
//
// IMPORTANT: garde le contrat d'output existant (title, colors, logoUrl, sections, issues, score, industry)
// et ajoute des champs non-breaking: language, region, meta, headings, rawText
// ================================

const Firecrawl = require('@mendable/firecrawl-js').default;
const { URL } = require('url');

const FIRECRAWL_API_KEY = process.env.FIRECRAWL_API_KEY || '';

async function scrapeWebsite(siteUrl) {
  try {
    console.log('[SCRAPER] Connexion a Firecrawl...');

    if (!FIRECRAWL_API_KEY) {
      throw new Error('FIRECRAWL_API_KEY manquant');
    }

    const app = new Firecrawl({ apiKey: FIRECRAWL_API_KEY });

    console.log(`[SCRAPER] Scraping de ${siteUrl}...`);
    const result = await app.scrapeUrl(siteUrl, {
      formats: ['html', 'markdown']
    });

    const html = result.html || result.content || '';
    const markdown = result.markdown || '';
    const metadata = result.metadata || {};

    const title = metadata.title || result.title || extractTitleFromHTML(html) || 'Sans titre';

    // Meta
    const meta = extractMetaFromHTML(html);
    const resolvedBase = safeBaseUrl(siteUrl);

    // Logo
    let logoUrl = extractLogoFromHTML(html, meta);
    logoUrl = absolutizeUrl(logoUrl, resolvedBase);

    // Headings + raw text
    const headings = extractHeadings(html);
    const rawText = extractTextFromHTML(html);

    // Language + Region
    const language = detectLanguage(html, rawText, meta);
    const region = detectRegion(siteUrl, html, rawText);

    // Sections (for site generator)
    const sections = extractSectionsFromHTML(html, headings);

    // Colors
    const colors = extractBrandColors(html);

    // Issues + Score
    const issues = analyzeIssues(html, meta, headings, rawText, siteUrl, language);
    const score = clampScore(100 - (issues.length * 7), 45, 95); // un peu plus nuancé

    const industry = detectIndustry(title, siteUrl, rawText);

    console.log('[SCRAPER] Donnees extraites:', {
      title,
      score,
      language,
      region,
      colorsCount: colors.length,
      sectionsCount: sections.length,
      issuesCount: issues.length,
      logoFound: !!logoUrl
    });

    return {
      url: siteUrl,
      title,
      colors,
      logoUrl,
      sections,
      issues,
      score,
      industry,
      language,
      region,
      meta,
      headings,
      rawText,
      markdown // utile si tu veux plus tard enrichir
    };

  } catch (error) {
    console.error('[SCRAPER] Erreur:', error.message);
    throw error;
  }
}

// ---------------- Helpers ----------------

function safeBaseUrl(siteUrl) {
  try {
    const u = new URL(siteUrl);
    return `${u.protocol}//${u.host}`;
  } catch {
    return siteUrl;
  }
}

function absolutizeUrl(maybeUrl, base) {
  if (!maybeUrl) return null;
  try {
    if (maybeUrl.startsWith('data:')) return maybeUrl;
    return new URL(maybeUrl, base).toString();
  } catch {
    return maybeUrl;
  }
}

function extractTitleFromHTML(html) {
  const m = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  return m ? m[1].trim() : null;
}

function extractMetaFromHTML(html) {
  const get = (name) => {
    const r1 = new RegExp(`<meta[^>]+name=["']${escapeReg(name)}["'][^>]+content=["']([^"']+)["']`, 'i');
    const r2 = new RegExp(`<meta[^>]+property=["']${escapeReg(name)}["'][^>]+content=["']([^"']+)["']`, 'i');
    const m1 = html.match(r1);
    const m2 = html.match(r2);
    return (m1 && m1[1]) || (m2 && m2[1]) || null;
  };

  return {
    description: get('description'),
    ogTitle: get('og:title'),
    ogDescription: get('og:description'),
    ogImage: get('og:image'),
    ogLocale: get('og:locale'),
  };
}

function escapeReg(s) {
  return String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function extractHeadings(html) {
  const headings = { h1: [], h2: [], h3: [] };
  const extract = (tag) => {
    const re = new RegExp(`<${tag}[^>]*>(.*?)<\\/${tag}>`, 'gis');
    const arr = [];
    let m;
    while ((m = re.exec(html)) !== null && arr.length < 25) {
      const t = stripTags(m[1]).trim();
      if (t && t.length < 120) arr.push(t);
    }
    return arr;
  };
  headings.h1 = extract('h1');
  headings.h2 = extract('h2');
  headings.h3 = extract('h3');
  return headings;
}

function extractTextFromHTML(html) {
  const noScript = html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ');
  return stripTags(noScript)
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 12000); // garde un contexte raisonnable
}

function stripTags(s) {
  return String(s).replace(/<[^>]*>/g, ' ');
}

// Logo extraction: og:image, schema.org, img with logo patterns
function extractLogoFromHTML(html, meta = {}) {
  // 1) og:image souvent un bon proxy de brand
  if (meta.ogImage) return meta.ogImage;

  // 2) schema.org (Organization -> logo)
  const schemaLogo = html.match(/"logo"\s*:\s*"([^"]+)"/i);
  if (schemaLogo && schemaLogo[1]) return schemaLogo[1];

  // 3) img tags
  const logoPatterns = [
    /<img[^>]*src=["']([^"']+)["'][^>]*(class|id)=["'][^"']*logo[^"']*["'][^>]*>/i,
    /<img[^>]*(class|id)=["'][^"']*logo[^"']*["'][^>]*src=["']([^"']+)["'][^>]*>/i,
    /src=["']([^"']*logo[^"']*)["']/i,
    /src=["']([^"']*brand[^"']*)["']/i,
  ];

  for (const p of logoPatterns) {
    const m = html.match(p);
    if (m) {
      const candidate = m[2] || m[1];
      if (candidate) return candidate;
    }
  }
  return null;
}

// Sections: prefer headings; fallback to structural tags
function extractSectionsFromHTML(html, headings) {
  const sections = [];

  // Prefer H2 as services-like
  const h2 = (headings && headings.h2) ? headings.h2 : [];
  h2.slice(0, 8).forEach(t => sections.push({ tag: 'section', title: t }));

  if (sections.length >= 4) return sections.slice(0, 8);

  const sectionRegex = /<(header|section|main|article|footer)[^>]*>([\s\S]*?)<\/\1>/gi;
  let match;
  let count = 0;
  while ((match = sectionRegex.exec(html)) !== null && count < 8) {
    const tag = match[1];
    const content = match[2];
    const headingMatch = content.match(/<h[1-3][^>]*>([^<]+)<\/h[1-3]>/i);
    const title = headingMatch ? stripTags(headingMatch[1]).trim() : `${tag.toUpperCase()} ${count + 1}`;
    sections.push({ tag, title });
    count++;
  }
  return sections.slice(0, 8);
}

// Brand colors: CSS vars + hex/rgb frequency; ignore monochromes
function extractBrandColors(html) {
  const candidates = [];

  // CSS variables: --primary, --secondary, --accent, etc.
  const varRegex = /--(?:primary|secondary|accent|brand|main|theme)[-_a-z0-9]*\s*:\s*(#[0-9a-fA-F]{3,8}|rgba?\([^)]+\))/g;
  let m;
  while ((m = varRegex.exec(html)) !== null && candidates.length < 40) candidates.push(m[1]);

  // Hex/rgb occurrences
  const colorRegex = /#(?:[0-9A-Fa-f]{3}){1,2}\b|rgba?\([^)]+\)/g;
  const matches = html.match(colorRegex) || [];
  matches.slice(0, 600).forEach(c => candidates.push(c));

  // Normalize + frequency
  const freq = new Map();
  for (const c of candidates) {
    const n = normalizeColor(c);
    if (!n) continue;
    if (isMonochrome(n)) continue;
    freq.set(n, (freq.get(n) || 0) + 1);
  }

  const sorted = [...freq.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([c]) => c);

  // fallback palette (safe)
  const fallback = ['#0f204b', '#2D7A8F', '#5bc236', '#ffffff'];

  const palette = dedupeNearColors(sorted).slice(0, 6);
  return palette.length ? palette : fallback;
}

function normalizeColor(c) {
  if (!c) return null;
  c = c.trim();
  if (c.startsWith('#')) {
    // #rgb -> #rrggbb
    if (c.length === 4) {
      const r = c[1], g = c[2], b = c[3];
      return `#${r}${r}${g}${g}${b}${b}`.toLowerCase();
    }
    // keep #rrggbb
    if (c.length === 7) return c.toLowerCase();
    // ignore others (#rrggbbaa)
    if (c.length === 9) return c.slice(0, 7).toLowerCase();
    return null;
  }
  const rgb = c.match(/rgba?\(\s*([0-9]{1,3})\s*,\s*([0-9]{1,3})\s*,\s*([0-9]{1,3})/i);
  if (rgb) {
    const r = clampInt(parseInt(rgb[1], 10), 0, 255);
    const g = clampInt(parseInt(rgb[2], 10), 0, 255);
    const b = clampInt(parseInt(rgb[3], 10), 0, 255);
    return rgbToHex(r, g, b);
  }
  return null;
}

function clampInt(n, a, b) { return Math.max(a, Math.min(b, n)); }
function rgbToHex(r, g, b) {
  const h = (x) => x.toString(16).padStart(2, '0');
  return `#${h(r)}${h(g)}${h(b)}`;
}

function isMonochrome(hex) {
  // ignore white/black/near-grays
  const v = hexToRgb(hex);
  if (!v) return true;
  const { r, g, b } = v;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const sat = max - min;
  const lum = (0.2126*r + 0.7152*g + 0.0722*b);
  if (lum > 245 || lum < 15) return true;
  return sat < 18; // near gray
}

function hexToRgb(hex) {
  const m = hex.match(/^#([0-9a-f]{6})$/i);
  if (!m) return null;
  const n = parseInt(m[1], 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

function dedupeNearColors(colors) {
  const out = [];
  for (const c of colors) {
    if (!out.some(o => colorDistance(o, c) < 22)) out.push(c);
  }
  return out;
}

function colorDistance(a, b) {
  const A = hexToRgb(a), B = hexToRgb(b);
  if (!A || !B) return 999;
  return Math.sqrt((A.r-B.r)**2 + (A.g-B.g)**2 + (A.b-B.b)**2);
}

function detectLanguage(html, text, meta) {
  // 1) html lang
  const m = html.match(/<html[^>]*\blang=["']([^"']+)["']/i);
  if (m && m[1]) {
    const l = m[1].toLowerCase();
    if (l.startsWith('fr')) return 'fr';
    if (l.startsWith('en')) return 'en';
    if (l.startsWith('es')) return 'es';
  }

  // 2) og:locale
  const loc = (meta && meta.ogLocale) ? meta.ogLocale.toLowerCase() : '';
  if (loc.startsWith('fr')) return 'fr';
  if (loc.startsWith('en')) return 'en';
  if (loc.startsWith('es')) return 'es';

  // 3) simple stopword scoring
  const t = (text || '').toLowerCase().slice(0, 5000);
  const score = (words) => words.reduce((acc, w) => acc + (t.includes(` ${w} `) ? 1 : 0), 0);
  const fr = score(['le','la','les','des','pour','avec','votre','nous','vous','clinique','services']);
  const en = score(['the','and','your','we','you','services','contact','book','clinic']);
  const es = score(['el','la','los','para','con','tu','usted','servicios','contacto','clinica']);

  const best = Math.max(fr, en, es);
  if (best === 0) return 'en';
  if (best === fr) return 'fr';
  if (best === es) return 'es';
  return 'en';
}

function detectRegion(url, html, text) {
  const u = (url || '').toLowerCase();
  if (u.includes('.ca') || u.includes('canada')) return 'CA';
  if (u.includes('.us')) return 'US';

  const t = (text || '').toLowerCase();
  if (t.includes('québec') || t.includes('montreal') || t.includes('canada')) return 'CA';
  if (t.includes('united states') || t.includes('usa')) return 'US';
  return 'INTL';
}

function analyzeIssues(html, meta, headings, text, url, language) {
  const issues = [];

  // Mobile
  if (!/name=["']viewport["']/i.test(html)) issues.push(issue(language, 'responsive'));

  // SEO basics
  if (!meta.description || meta.description.length < 50) issues.push(issue(language, 'meta_desc'));
  if (!headings || (headings.h1 || []).length === 0) issues.push(issue(language, 'missing_h1'));
  if ((headings.h1 || []).length > 1) issues.push(issue(language, 'multi_h1'));

  // CTA density
  const ctaCount = (html.match(/contact|book|rendez|appointment|call|devis|quote|cta|button/gi) || []).length;
  if (ctaCount < 4) issues.push(issue(language, 'weak_cta'));

  // Trust signals
  const trustCount = (html.match(/avis|reviews|témoign|testimon|google|trust|certif|certified/gi) || []).length;
  if (trustCount < 2) issues.push(issue(language, 'low_trust'));

  // Speed proxy
  const heavyScripts = (html.match(/<script[^>]+src=/gi) || []).length;
  if (heavyScripts > 25) issues.push(issue(language, 'too_many_scripts'));

  // Accessibility proxy
  const imgCount = (html.match(/<img\b/gi) || []).length;
  const altCount = (html.match(/\balt=["'][^"']*["']/gi) || []).length;
  if (imgCount > 8 && altCount / Math.max(imgCount, 1) < 0.5) issues.push(issue(language, 'missing_alt'));

  // Security proxy
  if ((url || '').startsWith('http://')) issues.push(issue(language, 'no_https'));

  return issues.length ? issues : [issue(language, 'no_major')];
}

function issue(lang, key) {
  const map = {
    fr: {
      responsive: 'Site non optimisé mobile (viewport manquant)',
      meta_desc: 'Meta description faible ou absente (SEO)',
      missing_h1: 'H1 principal manquant (structure SEO)',
      multi_h1: 'Plusieurs H1 détectés (structure SEO)',
      weak_cta: 'Appels à l’action insuffisants ou peu visibles',
      low_trust: 'Manque de signaux de confiance (avis, preuves, certifications)',
      too_many_scripts: 'Trop de scripts détectés (risque de lenteur)',
      missing_alt: 'Beaucoup d’images sans texte ALT (accessibilité + SEO)',
      no_https: 'Site non sécurisé (HTTPS manquant)',
      no_major: 'Aucun problème majeur détecté'
    },
    en: {
      responsive: 'Mobile optimization missing (viewport not found)',
      meta_desc: 'Weak or missing meta description (SEO)',
      missing_h1: 'Missing primary H1 (SEO structure)',
      multi_h1: 'Multiple H1 detected (SEO structure)',
      weak_cta: 'Calls-to-action are insufficient or not prominent',
      low_trust: 'Low trust signals (reviews, proof, certifications)',
      too_many_scripts: 'Too many scripts (possible performance issues)',
      missing_alt: 'Many images missing ALT text (accessibility + SEO)',
      no_https: 'Website not secured (missing HTTPS)',
      no_major: 'No major issues detected'
    },
    es: {
      responsive: 'Falta optimización móvil (viewport no encontrado)',
      meta_desc: 'Meta description débil o ausente (SEO)',
      missing_h1: 'Falta H1 principal (estructura SEO)',
      multi_h1: 'Se detectaron múltiples H1 (estructura SEO)',
      weak_cta: 'Llamadas a la acción insuficientes o poco visibles',
      low_trust: 'Pocas señales de confianza (reseñas, pruebas, certificaciones)',
      too_many_scripts: 'Demasiados scripts (posibles problemas de rendimiento)',
      missing_alt: 'Muchas imágenes sin texto ALT (accesibilidad + SEO)',
      no_https: 'Sitio no seguro (falta HTTPS)',
      no_major: 'No se detectaron problemas importantes'
    }
  };
  const dict = map[lang] || map.en;
  return dict[key] || dict.no_major;
}

function detectIndustry(title, url, text) {
  const s = `${title} ${url} ${text}`.toLowerCase();
  if (/(clinic|clinique|health|medical|dent|dermat|spa|esthetic|esthétique)/.test(s)) return 'Santé';
  if (/(restaurant|food|café|bar|pizza)/.test(s)) return 'Restauration';
  if (/(law|avocat|legal|notary|notaire)/.test(s)) return 'Services juridiques';
  if (/(real estate|immobilier|realtor)/.test(s)) return 'Immobilier';
  if (/(gym|fitness|training)/.test(s)) return 'Fitness';
  if (/(software|saas|tech|it|cloud)/.test(s)) return 'Technologie';
  return 'General';
}

function clampScore(v, min, max) { return Math.max(min, Math.min(max, v)); }

module.exports = { scrapeWebsite };