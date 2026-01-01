// ================================
// MODULE IMAGE GENERATOR - Social visuals (v5.0)
// Upgrade: switch from DALL·E 3 to gpt-image-1 (meilleur texte dans l'image)
// - Retourne base64 direct (data:image/png;base64,...) => pas besoin de télécharger un URL
// - Multilingue: textes des visuels dans la langue détectée du site
// - Toujours 6 images, formats optimisés (square + story)
// ================================

const OpenAI = require('openai');

const openai = process.env.OPENAI_API_KEY ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY }) : null;

function t(lang, key, vars = {}) {
  const dict = {
    fr: {
      authority_tagline: `${vars.company} - Excellence digitale`,
      trusted_by: `Approuvé par ${vars.audience}`,
      transform: 'Transformez votre présence digitale',
      proven: `${vars.company} - Résultats prouvés`,
      more_leads: `+150% de leads qualifiés`,
      results_like: `Résultats réels pour des entreprises comme la vôtre`,
      partner_growth: `Votre partenaire de croissance`,
      clarity_growth: `Clarté. Croissance. Résultats.`,
      digital_transformation: `${vars.company} - Transformation digitale`,
      ready_upgrade: `Prêt à upgrader ?`,
      free_audit: `Audit gratuit - ${vars.company}`
    },
    en: {
      authority_tagline: `${vars.company} - Digital Excellence`,
      trusted_by: `Trusted by ${vars.audience}`,
      transform: 'Transform Your Digital Presence',
      proven: `${vars.company} - Proven Results`,
      more_leads: `+150% More Qualified Leads`,
      results_like: `Real results for businesses like yours`,
      partner_growth: `Your Partner in Digital Growth`,
      clarity_growth: `Clarity. Growth. Results.`,
      digital_transformation: `${vars.company} - Digital Transformation`,
      ready_upgrade: `Ready to upgrade?`,
      free_audit: `Get Your Free Audit - ${vars.company}`
    },
    es: {
      authority_tagline: `${vars.company} - Excelencia digital`,
      trusted_by: `Confiado por ${vars.audience}`,
      transform: 'Transforma tu presencia digital',
      proven: `${vars.company} - Resultados comprobados`,
      more_leads: `+150% más leads calificados`,
      results_like: `Resultados reales para negocios como el tuyo`,
      partner_growth: `Tu socio de crecimiento digital`,
      clarity_growth: `Claridad. Crecimiento. Resultados.`,
      digital_transformation: `${vars.company} - Transformación digital`,
      ready_upgrade: `¿Listo para mejorar?`,
      free_audit: `Auditoría gratis - ${vars.company}`
    }
  };
  const pack = dict[lang] || dict.en;
  return pack[key] || dict.en[key];
}

const SYSTEM_INSTRUCTION = `You are a senior creative director specialized in high-conversion social media visuals for real businesses.

Rules:
- Clean, modern, premium, business-oriented.
- Text must be PERFECTLY readable on mobile.
- Use strong hierarchy and generous spacing.
- Do NOT add any extra text beyond what is provided.
- Do NOT change the provided text.
- No random charts with fake labels.
- No watermarks.
- Avoid uncanny faces; prefer simple premium compositions and UI/mockup styles.`;

async function generateSocialVisuals(companyName, colors, industry, scrapedData = {}) {
  console.log('[IMAGES] Génération assets (gpt-image-1)...');

  if (!openai) {
    console.log('[IMAGES] OpenAI non configuré, utilisation de placeholders');
    return generatePlaceholders(companyName, colors);
  }

  const lang = scrapedData.language || 'en';
  const primaryColor = colors?.[0] || '#2D7A8F';
  const secondaryColor = colors?.[1] || '#0f204b';
  const targetAudience = scrapedData.targetAudience || (lang === 'fr' ? 'des entrepreneurs' : lang === 'es' ? 'dueños de negocio' : 'business owners');

  const images = [];

  const imageStrategies = [
    {
      type: 'authority_expertise',
      platform: 'LinkedIn',
      purpose: 'Build trust and establish authority',
      mainText: t(lang, 'authority_tagline', { company: companyName }),
      secondaryText: t(lang, 'trusted_by', { audience: targetAudience }),
      visualStyle: 'Premium corporate background, abstract office light, minimal shapes, no faces required, strong text contrast'
    },
    {
      type: 'transformation_projection',
      platform: 'Instagram',
      purpose: 'Show transformation potential',
      mainText: t(lang, 'transform', { company: companyName }),
      secondaryText: t(lang, 'proven', { company: companyName }),
      visualStyle: 'Before/after implied split, clean UI upgrade vibe, minimal device frame, no tiny text'
    },
    {
      type: 'results_benefits',
      platform: 'Facebook',
      purpose: 'Show measurable outcomes',
      mainText: t(lang, 'more_leads', { company: companyName }),
      secondaryText: t(lang, 'results_like', { company: companyName }),
      visualStyle: 'Big number typography, simple upward line, 1-2 clean bars max, no fake labels'
    },
    {
      type: 'brand_consistency',
      platform: 'Instagram',
      purpose: 'Reinforce brand identity',
      mainText: companyName,
      secondaryText: t(lang, 'partner_growth', { company: companyName }),
      visualStyle: `Brand-forward, minimalist, lots of whitespace, dominant ${primaryColor}, subtle gradients`
    },
    {
      type: 'trust_clarity',
      platform: 'LinkedIn',
      purpose: 'Evoke trust and clarity',
      mainText: t(lang, 'clarity_growth', { company: companyName }),
      secondaryText: t(lang, 'digital_transformation', { company: companyName }),
      visualStyle: 'Clean grid, trust icons (checkmarks), subtle depth, no faces, corporate premium'
    },
    {
      type: 'soft_cta',
      platform: 'Facebook Story',
      purpose: 'Gentle CTA',
      mainText: t(lang, 'ready_upgrade', { company: companyName }),
      secondaryText: t(lang, 'free_audit', { company: companyName }),
      visualStyle: 'Vertical mobile layout, CTA button shape, product-mockup style, high readability'
    }
  ];

  for (let i = 0; i < imageStrategies.length; i++) {
    const strategy = imageStrategies[i];
    console.log(`[IMAGES] ${i + 1}/6: ${strategy.type}...`);

    const prompt = buildPrompt(companyName, industry, strategy, primaryColor, secondaryColor);

    try {
      const response = await openai.images.generate({
        model: "gpt-image-1",
        prompt: `${SYSTEM_INSTRUCTION}\n\n${prompt}`,
        n: 1,
        size: strategy.platform === 'Facebook Story' ? "1024x1536" : "1024x1024"
      });

      const b64 = response.data?.[0]?.b64_json;
      if (!b64) throw new Error('Image generation returned empty b64_json');

      images.push({
        type: strategy.type,
        platform: strategy.platform,
        purpose: strategy.purpose,
        mainText: strategy.mainText,
        secondaryText: strategy.secondaryText,
        prompt,
        url: null,
        base64: `data:image/png;base64,${b64}`
      });

      // small delay to be gentle
      if (i < imageStrategies.length - 1) await new Promise(r => setTimeout(r, 600));
    } catch (err) {
      console.error(`[IMAGES] Erreur image ${i + 1}:`, err.message);
      images.push({
        type: strategy.type,
        platform: strategy.platform,
        purpose: strategy.purpose,
        prompt: strategy.mainText,
        url: `https://placehold.co/1024x1024/${primaryColor.replace('#', '')}/ffffff?text=${encodeURIComponent(companyName)}`,
        base64: null
      });
    }
  }

  console.log(`[IMAGES] ${images.length}/6 images générées`);
  return images.length ? images : generatePlaceholders(companyName, colors);
}

function buildPrompt(companyName, industry, strategy, primaryColor, secondaryColor) {
  return `Create a high-quality social media image for a real business.

Company name: ${companyName}
Industry: ${industry || 'business'}
Platform: ${strategy.platform}

Primary text (exact, do not change):
"${strategy.mainText}"

Secondary text (exact, do not change):
"${strategy.secondaryText}"

Brand colors:
Primary: ${primaryColor}
Secondary: ${secondaryColor}

Visual style:
${strategy.visualStyle}

Design rules:
- Mobile-first readability (headline must be readable at a glance)
- Strong hierarchy (headline > secondary)
- No tiny paragraphs
- No extra text, no watermarks
- Premium, modern, credible for a real business

Return only the image.`;
}

function generatePlaceholders(companyName, colors) {
  const primaryColor = colors?.[0]?.replace('#', '') || '2D7A8F';
  return [
    { type: 'authority_expertise', platform: 'LinkedIn', purpose: 'Authority', prompt: 'Authority visual', url: `https://placehold.co/1024x1024/${primaryColor}/ffffff?text=${encodeURIComponent(companyName + ' - Authority')}`, base64: null },
    { type: 'transformation_projection', platform: 'Instagram', purpose: 'Transformation', prompt: 'Transformation visual', url: `https://placehold.co/1024x1024/${primaryColor}/ffffff?text=${encodeURIComponent(companyName + ' - Transform')}`, base64: null },
    { type: 'results_benefits', platform: 'Facebook', purpose: 'Results', prompt: 'Results visual', url: `https://placehold.co/1024x1024/${primaryColor}/ffffff?text=${encodeURIComponent(companyName + ' - Results')}`, base64: null },
    { type: 'brand_consistency', platform: 'Instagram', purpose: 'Branding', prompt: 'Branding visual', url: `https://placehold.co/1024x1024/${primaryColor}/ffffff?text=${encodeURIComponent(companyName + ' - Brand')}`, base64: null },
    { type: 'trust_clarity', platform: 'LinkedIn', purpose: 'Trust', prompt: 'Trust visual', url: `https://placehold.co/1024x1024/${primaryColor}/ffffff?text=${encodeURIComponent(companyName + ' - Trust')}`, base64: null },
    { type: 'soft_cta', platform: 'Facebook Story', purpose: 'CTA', prompt: 'CTA visual', url: `https://placehold.co/1024x1792/${primaryColor}/ffffff?text=${encodeURIComponent(companyName + ' - CTA')}`, base64: null }
  ];
}

module.exports = { generateSocialVisuals };
