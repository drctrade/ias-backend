// ================================
// MODULE CONTENT GENERATOR - Génération de contenu AI (v5.0)
// Améliorations clés:
// - Multilingue: tous les livrables textuels sortent dans la langue détectée du site (EN/FR/ES)
// - Copie site amélioré: génération bilingue (CA: EN/FR, US/INTL hispano: EN/ES), avec langue par défaut = langue du site
// - Brand kit plus fidèle: s'appuie sur headings/meta/rawText/couleurs/logo + règles strictes "ne pas inventer"
// - Toujours backward compatible: retourne systemPrompt, brandKitPrompt, loomScript, emailTemplates + ajoute websiteCopy
// ================================

const OpenAI = require('openai');

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

function langPack(lang) {
  const map = {
    fr: { name: 'French', locale: 'fr-FR', label: 'Français' },
    en: { name: 'English', locale: 'en-US', label: 'English' },
    es: { name: 'Spanish', locale: 'es-ES', label: 'Español' }
  };
  return map[lang] || map.en;
}

function getBilingualPair(region) {
  if (region === 'CA') return { primary: 'en', secondary: 'fr', toggle: 'EN-FR' };
  // US + pays hispanophones (ou défaut) -> EN/ES
  return { primary: 'en', secondary: 'es', toggle: 'EN-ES' };
}

async function generateAllContent(companyName, url, scrapedData) {
  const lang = scrapedData.language || 'en';
  const region = scrapedData.region || 'INTL';

  console.log(`[CONTENT] Génération multilingue (lang=${lang}, region=${region})...`);

  try {
    const [systemPrompt, brandKitPrompt, loomScript, emailTemplates, websiteCopy] = await Promise.all([
      generateSystemPrompt(companyName, url, scrapedData, lang),
      generateBrandKitPrompt(companyName, url, scrapedData, lang),
      generateLoomScript(companyName, url, scrapedData, lang),
      generateEmailTemplates(companyName, url, scrapedData, lang),
      generateWebsiteCopyBilingual(companyName, url, scrapedData, lang, region)
    ]);

    return { systemPrompt, brandKitPrompt, loomScript, emailTemplates, websiteCopy };
  } catch (error) {
    console.error('[CONTENT] Erreur AI:', error.message);
    throw error;
  }
}

async function generateSystemPrompt(companyName, url, scrapedData, lang) {
  const lp = langPack(lang);
  const issues = (scrapedData.issues || []).slice(0, 8);

  const prompt = `
You are an expert prompt engineer.
Write the full system prompt for a WORLD-CLASS AI voice agent representing "${companyName}" (${url}).

Hard rules:
- Write in ${lp.name}.
- Be practical and production-ready (call handling, booking, qualification, handoff).
- Use Markdown headings.
- Include guardrails, escalation rules, and privacy disclaimers.
- If you don't know a detail, don't invent it.

Context:
- Industry: ${scrapedData.industry || 'Unknown'}
- Website score: ${scrapedData.score || 0}/100
- Issues detected: ${issues.join(' | ') || 'None'}
- Key headings: ${(scrapedData.headings?.h1 || []).slice(0, 2).join(' | ')} / ${(scrapedData.headings?.h2 || []).slice(0, 5).join(' | ')}

Output: ONLY the system prompt in Markdown.
`.trim();

  const response = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.6,
    max_tokens: 2600
  });

  return response.choices[0].message.content.trim();
}

async function generateBrandKitPrompt(companyName, url, scrapedData, lang) {
  const lp = langPack(lang);
  const colors = (scrapedData.colors || []).slice(0, 6);
  const headings = scrapedData.headings || { h1: [], h2: [] };

  const prompt = `
You are a senior brand strategist.
Create a precise brand kit brief for "${companyName}" based ONLY on the evidence provided.

Write in ${lp.name}.

Evidence:
- Website: ${url}
- Meta description: ${scrapedData.meta?.description || 'N/A'}
- OG title: ${scrapedData.meta?.ogTitle || 'N/A'}
- Headings (H1): ${(headings.h1 || []).slice(0, 3).join(' | ') || 'N/A'}
- Headings (H2): ${(headings.h2 || []).slice(0, 10).join(' | ') || 'N/A'}
- Extracted colors (may include noise): ${colors.join(', ') || 'N/A'}
- Logo URL: ${scrapedData.logoUrl || 'N/A'}

Hard rules:
- Do NOT invent services, claims, prices, certifications, or locations.
- If something is unknown, write "Unknown" (or the equivalent in ${lp.name}).
- Make recommendations, but label them as recommendations (not facts).

Deliverables (structured):
1) Brand positioning (1 paragraph)
2) Tone of voice (5 bullets)
3) Visual direction (5 bullets)
4) Color palette: pick 3-5 colors (HEX) from extracted evidence, explain role of each
5) Typography: 2 Google Fonts suggestions + usage
6) Do/Don't guidelines (6 bullets total)
7) Social design rules: spacing, hierarchy, safe areas, contrast, CTA button style
`.trim();

  const response = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.55,
    max_tokens: 900
  });

  return response.choices[0].message.content.trim();
}

async function generateLoomScript(companyName, url, scrapedData, lang) {
  const lp = langPack(lang);
  const issues = (scrapedData.issues || []).slice(0, 6);

  const prompt = `
Write a 2-minute Loom video script to present the "Stealth Upgrade" to ${companyName}.

Write in ${lp.name}.
Tone: consultative, high-trust, direct, premium.
Constraints:
- Mention 2-4 specific issues detected (from list below).
- Explain: upgraded website + automation + 12 social images/month + automated posting in GHL.
- End with a soft CTA to book a 15-min call.
- Provide timestamps.

Site: ${url}
Industry: ${scrapedData.industry || 'Unknown'}
Score: ${scrapedData.score || 0}/100
Issues: ${issues.join(' | ') || 'None'}
`.trim();

  const response = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.7,
    max_tokens: 950
  });

  return response.choices[0].message.content.trim();
}

async function generateEmailTemplates(companyName, url, scrapedData, lang) {
  const lp = langPack(lang);
  const issues = (scrapedData.issues || []).slice(0, 6);
  const score = scrapedData.score || 0;

  const prompt = `
Create 3 cold outreach emails for ${companyName}.
Write in ${lp.name}.
Audience: business owner / decision maker.
Offer: free audit PDF + 6 ready-to-post social images + a modernized website prototype.

Constraints:
- Email #1 includes the lead magnet: "Audit PDF + 6 images"
- Email #2 is a short follow-up
- Email #3 is a respectful closing / open loop
- Use variables: {{first_name}}, {{company}}, {{website}}, {{calendar_link}}
- Keep each email under 180 words.
- Mention 2-3 issues detected (do not invent).

Context:
Website: ${url}
Score: ${score}/100
Issues: ${issues.join(' | ') || 'None'}
Industry: ${scrapedData.industry || 'Unknown'}

Return JSON with exactly:
{
  "emails": [
    {"subject":"...", "body":"..."},
    {"subject":"...", "body":"..."},
    {"subject":"...", "body":"..."}
  ]
}
`.trim();

  const response = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.75,
    max_tokens: 1200,
    response_format: { type: 'json_object' }
  });

  const result = JSON.parse(response.choices[0].message.content);
  return result.emails || [];
}

// Bilingual copy for the upgraded website
async function generateWebsiteCopyBilingual(companyName, url, scrapedData, detectedLang, region) {
  const pair = getBilingualPair(region);

  // default language = detected site language if it matches the bilingual pair, else fallback to pair.primary
  const defaultLang = ([pair.primary, pair.secondary].includes(detectedLang)) ? detectedLang : pair.primary;
  const secondaryLang = (defaultLang === pair.primary) ? pair.secondary : pair.primary;

  const headings = scrapedData.headings || { h1: [], h2: [] };
  const services = (scrapedData.sections || []).map(s => s.title).slice(0, 8);

  const prompt = `
You are a website conversion copywriter.
Create bilingual copy for a modern one-page website for "${companyName}".

Languages:
- default_lang: ${defaultLang}
- secondary_lang: ${secondaryLang}

Hard rules:
- Don't invent facts (locations, pricing, certifications).
- If unknown, keep generic but professional.
- Make it high-conversion: clear value, trust, CTA.
- Keep it concise.

Input evidence:
- Website: ${url}
- Meta description: ${scrapedData.meta?.description || 'N/A'}
- Headings H1: ${(headings.h1 || []).slice(0, 2).join(' | ') || 'N/A'}
- Headings H2: ${(headings.h2 || []).slice(0, 8).join(' | ') || 'N/A'}
- Service-like section titles: ${services.join(' | ') || 'N/A'}
- Industry: ${scrapedData.industry || 'Unknown'}

Return JSON:
{
  "default_lang":"${defaultLang}",
  "secondary_lang":"${secondaryLang}",
  "nav": {"home":"", "services":"", "about":"", "contact":"", "cta_button":""},
  "hero": {"headline":"", "subheadline":"", "primary_cta":"", "secondary_cta":""},
  "services": [{"title":"", "desc":""}, ... up to 6],
  "about": {"title":"", "body":""},
  "trust": {"title":"", "bullets":["","", ""]},
  "contact": {"title":"", "body":"", "cta":"", "note":""},
  "toggle_label":"${pair.toggle}"
}
Provide both languages by nesting:
{
  "copy": {
    "${defaultLang}": { ... },
    "${secondaryLang}": { ... }
  }
}
`.trim();

  const response = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.55,
    max_tokens: 1700,
    response_format: { type: 'json_object' }
  });

  const json = JSON.parse(response.choices[0].message.content);

  // Minimal sanity fallback
  if (!json.default_lang) json.default_lang = defaultLang;
  if (!json.secondary_lang) json.secondary_lang = secondaryLang;
  return json;
}

module.exports = { generateAllContent };