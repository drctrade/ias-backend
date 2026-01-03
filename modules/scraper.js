/**
 * Lightweight scraper (no heavy deps): fetch HTML and extract basic signals.
 * Returns:
 *  - title, description, headings, colors, language, region, industry_guess
 */
function pickFirst(arr) { return Array.isArray(arr) && arr.length ? arr[0] : null; }

function extractMeta(html, name) {
  const re = new RegExp(`<meta[^>]+(?:name|property)=["']${name}["'][^>]+content=["']([^"']+)["'][^>]*>`, 'i');
  const m = html.match(re);
  return m ? m[1].trim() : null;
}

function extractTitle(html) {
  const m = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  return m ? m[1].replace(/\s+/g,' ').trim() : null;
}

function extractHeadings(html) {
  const headings = [];
  const re = /<(h1|h2|h3)[^>]*>([\s\S]*?)<\/\1>/gi;
  let m;
  while ((m = re.exec(html)) !== null && headings.length < 30) {
    const txt = m[2].replace(/<[^>]+>/g,' ').replace(/\s+/g,' ').trim();
    if (txt && txt.length >= 3) headings.push({ level: m[1].toLowerCase(), text: txt });
  }
  return headings;
}

function extractColors(html) {
  // Grab common color formats in inline styles / css blocks: #RRGGBB, #RGB
  const set = new Set();
  const re = /#([0-9a-fA-F]{3,8})\b/g;
  let m;
  while ((m = re.exec(html)) !== null && set.size < 12) {
    const hex = ('#' + m[1]).slice(0, 7).toLowerCase();
    if (hex.length === 7) set.add(hex);
  }
  return Array.from(set);
}

function guessLanguage(html, headers, url) {
  const langAttr = html.match(/<html[^>]+lang=["']([^"']+)["']/i)?.[1];
  const candidate = (langAttr || '').split('-')[0].toLowerCase();
  if (candidate) return candidate;
  // fallback: tld
  if (url && url.endsWith('.fr')) return 'fr';
  return 'en';
}

function guessRegion(url) {
  try {
    const host = new URL(url).hostname.toLowerCase();
    if (host.endsWith('.ca') || host.includes('.ca.')) return 'CA';
    if (host.endsWith('.fr') || host.includes('.fr.')) return 'FR';
    if (host.endsWith('.uk') || host.endsWith('.co.uk')) return 'UK';
  } catch {}
  return 'US';
}

function guessIndustry({ title, description, headings }) {
  const blob = `${title||''} ${description||''} ${(headings||[]).map(h=>h.text).join(' ')}`.toLowerCase();
  const rules = [
    ['laser hair removal', ['laser', 'épilation', 'epilation', 'hair removal', 'clinique', 'aesthetic', 'esthétique']],
    ['dental clinic', ['dent', 'dentaire', 'orthodont', 'implant']],
    ['restaurant', ['menu', 'réservation', 'reservation', 'restaurant', 'cuisine']],
    ['real estate', ['immobilier', 'real estate', 'maison', 'condo', 'courtier']],
    ['law firm', ['avocat', 'law', 'legal', 'cabinet']],
    ['fitness', ['gym', 'fitness', 'coach', 'entrainement', 'entraînement']],
    ['saas', ['platform', 'software', 'saas', 'api', 'pricing']],
  ];
  for (const [industry, keys] of rules) {
    if (keys.some(k => blob.includes(k))) return industry;
  }
  return 'general business';
}

export async function scrapeWebsite(websiteUrl) {
  const res = await fetch(websiteUrl, { redirect: 'follow' });
  const html = await res.text();

  const title = extractTitle(html);
  const description = extractMeta(html, 'description') || extractMeta(html, 'og:description');
  const headings = extractHeadings(html);
  const colors = extractColors(html);
  const language = guessLanguage(html, res.headers, websiteUrl);
  const region = guessRegion(websiteUrl);
  const industry = guessIndustry({ title, description, headings });

  return {
    title: title || null,
    description: description || null,
    headings,
    colors,
    language,
    region,
    industry,
    siteMeta: {
      title,
      description,
      ogTitle: extractMeta(html, 'og:title'),
      ogImage: extractMeta(html, 'og:image'),
    },
  };
}
