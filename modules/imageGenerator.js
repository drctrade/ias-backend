// ================================
// MODULE IMAGE GENERATOR - Génération Assets (B2C/B2B)
// Patch: compatibilité generateVisuals + tailles gpt-image-1
// ================================

const OpenAI = require('openai');
const https = require('https');

const openai = process.env.OPENAI_API_KEY ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY }) : null;

// ============================================================
// SYSTEM INSTRUCTION GLOBALE (CREATIVE DIRECTOR)
// ============================================================
const SYSTEM_INSTRUCTION = `You are a senior creative director specialized in high-conversion social media visuals.
Your role is to generate professional, clean, modern, and brand-consistent images that a REAL BUSINESS can post immediately.

Rules:
- Use the provided text EXACTLY as written. Do not add or change text.
- Make text readable on mobile (strong contrast, clear hierarchy).
- No watermarks. No extra logos unless explicitly requested.
- Avoid exaggerated claims or fake statistics unless explicitly provided.
- Prefer real-world, credible visuals for the business industry.`;

// ============================================================
// MAIN GENERATOR (kept name for backward compatibility)
// ============================================================
async function generateSocialVisuals(companyName, colors, industry, scrapedData = {}) {
  console.log('[IMAGES] Génération assets sociaux...');

  if (!openai) {
    console.log('[IMAGES] OpenAI non configuré, utilisation de placeholders');
    return generatePlaceholders(companyName, colors);
  }

  const primaryColor = (Array.isArray(colors) && colors[0]) ? colors[0] : (colors?.primary || '#5bc236');
  const secondaryColor = (Array.isArray(colors) && colors[1]) ? colors[1] : (colors?.secondary || '#0f204b');
  const targetAudience = scrapedData.targetAudience || 'clients';
  const images = [];

  // 6 visuels (format carré + 1 story)
  const imageStrategies = [
    { type: 'offer_service', platform: 'Instagram', purpose: 'Offer', mainText: `${companyName}`, secondaryText: `Services ${industry || ''}`.trim(), visualStyle: 'Premium, clean, modern' },
    { type: 'why_us', platform: 'Facebook', purpose: 'Why choose us', mainText: `Pourquoi ${companyName} ?`, secondaryText: `Résultats. Sécurité. Confiance.`, visualStyle: 'Trust, clinic-quality' },
    { type: 'faq_pain', platform: 'Instagram', purpose: 'FAQ', mainText: `Est-ce que ça fait mal ?`, secondaryText: `Réponse courte + rassurante`, visualStyle: 'Minimal, calm, reassuring' },
    { type: 'before_after', platform: 'Instagram', purpose: 'Benefit', mainText: `Peau plus lisse`, secondaryText: `Résultats durables`, visualStyle: 'Clean before/after vibe (no unrealistic body imagery)' },
    { type: 'limited_offer', platform: 'Facebook', purpose: 'Offer', mainText: `Offre limitée`, secondaryText: `Consultation gratuite`, visualStyle: 'Premium promo layout' },
    { type: 'cta_booking', platform: 'Story', purpose: 'CTA', mainText: `Prendre rendez-vous`, secondaryText: `${companyName}`, visualStyle: 'Vertical story CTA, mobile-first' },
  ];

  try {
    for (let i = 0; i < imageStrategies.length; i++) {
      const strategy = imageStrategies[i];
      console.log(`[IMAGES] Génération ${i + 1}/6: ${strategy.type}...`);

      const dynamicPrompt = buildDynamicPrompt(
        companyName,
        industry || 'service',
        targetAudience,
        strategy,
        primaryColor,
        secondaryColor
      );

      // gpt-image-1 supports: 1024x1024, 1024x1536, 1536x1024, auto
      const size = strategy.platform === 'Story' ? '1024x1536' : '1024x1024';

      const response = await openai.images.generate({
        model: 'gpt-image-1',
        prompt: `${SYSTEM_INSTRUCTION}

${dynamicPrompt}`,
        size,
        n: 1,
      });

      const item = response?.data?.[0];
      // Depending on SDK version, may return url or b64_json. Handle both.
      let base64 = null;
      let url = null;

      if (item?.url) {
        url = item.url;
        base64 = await downloadImageToBase64(url);
      } else if (item?.b64_json) {
        base64 = `data:image/png;base64,${item.b64_json}`;
      }

      images.push({
        type: strategy.type,
        platform: strategy.platform,
        purpose: strategy.purpose,
        mainText: strategy.mainText,
        secondaryText: strategy.secondaryText,
        prompt: dynamicPrompt,
        url,
        base64,
      });

      // small delay (avoid bursts)
      if (i < imageStrategies.length - 1) {
        await new Promise((r) => setTimeout(r, 800));
      }
    }
  } catch (err) {
    console.error('[IMAGES] Erreur globale:', err.message);
  }

  console.log(`[IMAGES] ${images.length}/6 images générées`);
  return images.length ? images : generatePlaceholders(companyName, colors);
}

// ============================================================
// PROMPT BUILDER
// ============================================================
function buildDynamicPrompt(companyName, industry, targetAudience, strategy, primaryColor, secondaryColor) {
  return `Create a premium social media visual for a real ${industry} business.

Business name: ${companyName}
Target audience: ${targetAudience}
Format: ${strategy.platform}

Primary text (exact):
"${strategy.mainText}"

Secondary text (exact):
"${strategy.secondaryText}"

Brand colors:
Primary: ${primaryColor}
Secondary: ${secondaryColor}

Style:
${strategy.visualStyle}

Design constraints:
- Mobile-first readability
- Clean spacing, premium typography
- No clutter, no gimmicks
- No extra text beyond what is provided
- No watermarks`;
}

// ============================================================
// DOWNLOAD HELPERS
// ============================================================
async function downloadImageToBase64(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (response) => {
      const chunks = [];
      response.on('data', (chunk) => chunks.push(chunk));
      response.on('end', () => {
        const buffer = Buffer.concat(chunks);
        resolve(`data:image/png;base64,${buffer.toString('base64')}`);
      });
    }).on('error', reject);
  });
}

// ============================================================
// PLACEHOLDERS (FALLBACK)
// ============================================================
function generatePlaceholders(companyName, colors) {
  const primaryColor = (Array.isArray(colors) && colors[0]) ? colors[0].replace('#', '') : '5bc236';
  return [
    { type: 'offer_service', platform: 'Instagram', purpose: 'Offer', prompt: 'Offer', url: `https://placehold.co/1024x1024/${primaryColor}/ffffff?text=${encodeURIComponent(companyName)}`, base64: null },
    { type: 'why_us', platform: 'Facebook', purpose: 'Trust', prompt: 'Trust', url: `https://placehold.co/1024x1024/${primaryColor}/ffffff?text=${encodeURIComponent(companyName+'+Trust')}`, base64: null },
    { type: 'faq_pain', platform: 'Instagram', purpose: 'FAQ', prompt: 'FAQ', url: `https://placehold.co/1024x1024/${primaryColor}/ffffff?text=${encodeURIComponent(companyName+'+FAQ')}`, base64: null },
    { type: 'before_after', platform: 'Instagram', purpose: 'Benefit', prompt: 'Benefit', url: `https://placehold.co/1024x1024/${primaryColor}/ffffff?text=${encodeURIComponent(companyName+'+Result')}`, base64: null },
    { type: 'limited_offer', platform: 'Facebook', purpose: 'Offer', prompt: 'Offer', url: `https://placehold.co/1024x1024/${primaryColor}/ffffff?text=${encodeURIComponent(companyName+'+Offer')}`, base64: null },
    { type: 'cta_booking', platform: 'Story', purpose: 'CTA', prompt: 'CTA', url: `https://placehold.co/1024x1536/${primaryColor}/ffffff?text=${encodeURIComponent(companyName+'+Book')}`, base64: null },
  ];
}

// ============================================================
// EXPORTS
// - generateSocialVisuals: used by newer code
// - generateVisuals: legacy name expected by server.js logs
// ============================================================
module.exports = {
  generateSocialVisuals,
  generateVisuals: generateSocialVisuals,
};
