import crypto from 'crypto';
import { uploadBuffer } from './supabase.js';

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const OPENAI_BASE_URL = process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1';
const IMAGE_MODEL = process.env.IMAGE_MODEL || 'gpt-image-1';

function slug(s) {
  return (s || 'client')
    .toString()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 60);
}

function pickPrimaryColor(colors) {
  return Array.isArray(colors) && colors.length ? colors[0] : '#0b3a5a';
}

function industryCreativeBrief({ industry, companyName, language }) {
  const lang = (language || 'en').toLowerCase().startsWith('fr') ? 'fr' : 'en';
  const base = {
    vibe: 'premium, luxury, clean, modern, high-end editorial photography, soft natural light, minimal clutter',
    avoid: 'no stocky corporate vibes, no cheesy gradients, no random business suits, no visible brand logos, no distorted hands, no gibberish text',
  };

  if ((industry || '').includes('laser') || (industry || '').includes('aesthetic')) {
    return {
      ...base,
      setting: lang === 'fr'
        ? `clinique esthétique haut de gamme, ambiance spa médicale, réception élégante, peau lumineuse`
        : `high-end aesthetic clinic, med-spa ambience, elegant reception, glowing skin`,
      audience: lang === 'fr'
        ? `clientèle premium, femmes et hommes 25-55, confiance et discrétion`
        : `premium clients, women & men 25-55, trust & discretion`,
    };
  }

  if ((industry || '').includes('restaurant')) {
    return {
      ...base,
      setting: lang === 'fr'
        ? `restaurant chic, lumière chaude, plats raffinés, expérience`
        : `chic restaurant, warm light, refined plates, experience`,
      audience: lang === 'fr' ? `foodies, couples, événements` : `foodies, couples, events`,
    };
  }

  return {
    ...base,
    setting: lang === 'fr'
      ? `univers premium correspondant à l'activité, textures élégantes, composition soignée`
      : `premium world matching the business, elegant textures, curated composition`,
    audience: lang === 'fr' ? `clients qualifiés` : `qualified customers`,
  };
}

async function generateImage({ prompt, size }) {
  if (!OPENAI_API_KEY) throw new Error('OPENAI_API_KEY is missing');
  const res = await fetch(`${OPENAI_BASE_URL}/images/generations`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${OPENAI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: IMAGE_MODEL,
      prompt,
      size, // "1024x1024" or "1024x1536"
    }),
  });
  if (!res.ok) {
    const txt = await res.text().catch(()=> '');
    throw new Error(`OpenAI image error: ${res.status} ${txt}`);
  }
  const json = await res.json();
  const b64 = json.data?.[0]?.b64_json;
  if (!b64) throw new Error('Image generation returned no base64');
  return Buffer.from(b64, 'base64');
}

function makeVisualPlan({ language, companyName, industry }) {
  const lang = (language || 'en').toLowerCase().startsWith('fr') ? 'fr' : 'en';

  // Universal set of 6 social visuals (works for most industries).
  // Copy is intentionally short and premium.
  return [
    {
      key: 'offer_service',
      format: 'post',
      size: '1024x1024',
      headline: lang === 'fr' ? 'Service phare' : 'Signature Service',
      sub: lang === 'fr' ? 'Une expérience premium, pensée pour vous' : 'A premium experience, built for you',
    },
    {
      key: 'why_us',
      format: 'post',
      size: '1024x1024',
      headline: lang === 'fr' ? 'Pourquoi nous ?' : `Why ${companyName || 'us'}?`,
      sub: lang === 'fr' ? 'Résultats. Sécurité. Confiance.' : 'Results. Safety. Trust.',
    },
    {
      key: 'faq',
      format: 'post',
      size: '1024x1024',
      headline: lang === 'fr' ? 'FAQ' : 'FAQ',
      sub: lang === 'fr' ? 'Réponse courte et rassurante' : 'Short, reassuring answer',
    },
    {
      key: 'before_after',
      format: 'post',
      size: '1024x1024',
      headline: lang === 'fr' ? 'Avant / Après' : 'Before / After',
      sub: lang === 'fr' ? 'Peau plus lisse — résultats durables' : 'Smoother skin — lasting results',
    },
    {
      key: 'limited_offer',
      format: 'story',
      size: '1024x1536',
      headline: lang === 'fr' ? 'Offre limitée' : 'Limited Offer',
      sub: lang === 'fr' ? 'Consultation gratuite' : 'Free consultation',
    },
    {
      key: 'cta_booking',
      format: 'story',
      size: '1024x1536',
      headline: lang === 'fr' ? 'Prendre rendez-vous' : 'Book now',
      sub: lang === 'fr' ? 'Réservez votre consultation' : 'Reserve your consultation',
      button: lang === 'fr' ? 'Réserver' : 'Book',
    },
  ];
}

export async function generateVisuals({
  packageId,
  companyName,
  websiteUrl,
  industry,
  language,
  region,
  colors,
  siteMeta,
  headings,
}) {
  const primary = pickPrimaryColor(colors);
  const brief = industryCreativeBrief({ industry, companyName, language });
  const plan = makeVisualPlan({ language, companyName, industry });

  // If key missing, return empty array so pipeline completes.
  if (!OPENAI_API_KEY) return [];

  const out = [];
  const basePath = `packages/${packageId}/visuals`;
  const brand = {
    companyName: companyName || siteMeta?.title || 'Client',
    websiteUrl,
    primaryColor: primary,
    language: (language || 'en').toLowerCase().startsWith('fr') ? 'fr' : 'en',
    industry: industry || 'general business',
    headings: (headings || []).slice(0, 8).map(h => h.text),
  };

  for (const v of plan) {
    const prompt = `
Create a high-end social media visual for ${brand.companyName}.

Brand context:
- Industry: ${brand.industry}
- Target audience: ${brief.audience}
- Setting style: ${brief.setting}
- Visual vibe: ${brief.vibe}
- Primary color accent: ${brand.primaryColor}

TEXT TO INCLUDE (must be clean, correctly spelled, no placeholders):
- Headline: "${v.headline}"
- Subheadline: "${v.sub}"
${v.button ? `- Button text: "${v.button}"` : ''}

DESIGN RULES:
- Use premium editorial photography style relevant to the industry.
- Use minimal typography. Clear hierarchy. Lots of whitespace.
- Use the primary color only as an accent (button, underline, small block).
- No logos, no watermarks.
- Avoid awkward hands, distorted faces, extra fingers.
- No random extra words beyond the provided text.

Output: a single finished image ready to post.
`.trim();

    const buffer = await generateImage({ prompt, size: v.size });
    const filename = `${v.key}_${crypto.randomBytes(4).toString('hex')}.png`;
    const storagePath = `${basePath}/${filename}`;
    const uploaded = await uploadBuffer({
      path: storagePath,
      buffer,
      contentType: 'image/png',
    });

    out.push({
      key: v.key,
      format: v.format,
      size: v.size,
      headline: v.headline,
      storage_path: uploaded.path,
      public_url: uploaded.publicUrl,
    });
  }

  return out;
}
