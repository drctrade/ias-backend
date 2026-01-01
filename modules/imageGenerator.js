// ================================
// MODULE IMAGE GENERATOR - Génération Assets Commerciaux B2B
// ================================

const OpenAI = require('openai');
const https = require('https');

const openai = process.env.OPENAI_API_KEY ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY }) : null;

// ============================================================
// SYSTEM INSTRUCTION GLOBALE (CREATIVE DIRECTOR)
// ============================================================
// Cette instruction définit le rôle et les contraintes pour TOUTES les images
const SYSTEM_INSTRUCTION = `You are a senior creative director specialized in high-conversion social media visuals for B2B companies.

Your role is to generate professional, clean, modern, and business-oriented images that could realistically be used by a digital marketing agency for client acquisition.

You do NOT create artistic or abstract images.
You DO create clear, credible, brand-consistent visuals designed to build trust and authority.

You always respect the provided text exactly as written.
Text must be readable, well-aligned, properly spaced, and visually dominant when required.

You optimize images for business social media use:
- clarity in less than 2 seconds
- professional design standards
- no visual clutter
- no gimmicks
- no exaggerated or unrealistic elements

Every image should look like it was designed by a professional agency, not generated for fun.

Never add extra text.
Never modify provided text.
Never include watermarks or logos unless explicitly requested.`;

// ============================================================
// STRATÉGIES D'IMAGES (6 VARIANTES BUSINESS)
// ============================================================

async function generateSocialVisuals(companyName, colors, industry, scrapedData = {}) {
  console.log('[IMAGES] Génération assets commerciaux B2B...');

  if (!openai) {
    console.log('[IMAGES] OpenAI non configuré, utilisation de placeholders');
    return generatePlaceholders(companyName, colors);
  }

  const primaryColor = colors?.[0] || '#5bc236';
  const secondaryColor = colors?.[1] || '#0f204b';
  const targetAudience = scrapedData.targetAudience || 'business owners';
  const currentScore = scrapedData.score || 50;
  const images = [];
  
  // ============================================================
  // 6 TYPES D'IMAGES STRATÉGIQUES
  // ============================================================
  // Chaque image a un OBJECTIF BUSINESS précis
  
  const imageStrategies = [
    // 1️⃣ AUTHORITY / EXPERTISE
    {
      type: 'authority_expertise',
      platform: 'LinkedIn',
      purpose: 'Build trust and establish authority',
      mainText: `${companyName} - Digital Excellence`,
      secondaryText: `Trusted by ${targetAudience}`,
      visualStyle: 'Professional executive setting, modern office environment, trust-building imagery'
    },
    
    // 2️⃣ BEFORE-AFTER IMPLICITE
    {
      type: 'transformation_projection',
      platform: 'Instagram',
      purpose: 'Show implicit transformation potential',
      mainText: `Transform Your Digital Presence`,
      secondaryText: `${companyName} - Proven Results`,
      visualStyle: 'Split composition suggesting progress, modern to premium upgrade, professional evolution'
    },
    
    // 3️⃣ RÉSULTAT / BÉNÉFICE
    {
      type: 'results_benefits',
      platform: 'Facebook',
      purpose: 'Showcase measurable business outcomes',
      mainText: `+150% More Qualified Leads`,
      secondaryText: `Real results for ${industry || 'businesses'} like yours`,
      visualStyle: 'Data visualization aesthetic, growth indicators, success metrics, professional dashboard feel'
    },
    
    // 4️⃣ BRANDING / COHÉRENCE
    {
      type: 'brand_consistency',
      platform: 'Instagram',
      purpose: 'Reinforce brand identity and visual coherence',
      mainText: `${companyName}`,
      secondaryText: `Your Partner in Digital Growth`,
      visualStyle: `Minimalist brand-focused design, dominant ${primaryColor} color, clean modern aesthetic, premium feel`
    },
    
    // 5️⃣ ÉMOTION BUSINESS (CONFIANCE, CLARTÉ)
    {
      type: 'trust_clarity',
      platform: 'LinkedIn',
      purpose: 'Evoke trust and business confidence',
      mainText: `Clarity. Growth. Results.`,
      secondaryText: `${companyName} - Digital Transformation`,
      visualStyle: 'Clean professional environment, clarity-focused imagery, business handshake metaphors, trust signals'
    },
    
    // 6️⃣ CALL TO ACTION SOFT
    {
      type: 'soft_cta',
      platform: 'Facebook Story',
      purpose: 'Gentle invitation to engage',
      mainText: `Ready to Upgrade?`,
      secondaryText: `Get Your Free Audit - ${companyName}`,
      visualStyle: 'Approachable yet professional, invitation aesthetic, mobile-optimized vertical format, action-oriented'
    }
  ];

  try {
    for (let i = 0; i < imageStrategies.length; i++) {
      try {
        const strategy = imageStrategies[i];
        console.log(`[IMAGES] Génération ${i + 1}/6: ${strategy.type} (${strategy.platform})...`);
        
        // Construire le prompt dynamique selon la stratégie
        const dynamicPrompt = buildDynamicPrompt(
          companyName,
          industry || 'business',
          targetAudience,
          strategy,
          primaryColor,
          secondaryColor
        );
        
        // Générer l'image avec DALL-E 3
        const response = await openai.images.generate({
          model: "dall-e-3",
          prompt: `${SYSTEM_INSTRUCTION}\n\n${dynamicPrompt}`,
          n: 1,
          size: strategy.platform === 'Facebook Story' ? "1024x1792" : "1024x1024", // Portrait pour Story
          quality: "hd",
          style: "natural" // Natural pour images business (pas vivid = trop saturé)
        });
        
        if (response.data && response.data[0] && response.data[0].url) {
          console.log(`[IMAGES] Téléchargement ${strategy.type}...`);
          const base64 = await downloadImageToBase64(response.data[0].url);
          
          images.push({ 
            type: strategy.type,
            platform: strategy.platform,
            purpose: strategy.purpose,
            mainText: strategy.mainText,
            secondaryText: strategy.secondaryText,
            prompt: dynamicPrompt,
            url: response.data[0].url,
            base64: base64
          });
          console.log(`[IMAGES] ✓ ${strategy.type} générée et téléchargée`);
        }
      } catch (err) {
        console.error(`[IMAGES] Erreur image ${i + 1}:`, err.message);
        // Placeholder en cas d'erreur
        images.push({
          type: imageStrategies[i].type,
          platform: imageStrategies[i].platform,
          purpose: imageStrategies[i].purpose,
          prompt: imageStrategies[i].mainText,
          url: `https://placehold.co/1024x1024/${primaryColor.replace('#', '')}/ffffff?text=${encodeURIComponent(companyName)}`,
          base64: null
        });
      }
      
      // Délai pour éviter rate limit OpenAI
      if (i < imageStrategies.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 2000)); // 2 sec entre chaque image
      }
    }
  } catch (error) {
    console.error('[IMAGES] Erreur globale DALL-E:', error.message);
  }

  console.log(`[IMAGES] ${images.length}/6 assets commerciaux générés`);
  return images.length > 0 ? images : generatePlaceholders(companyName, colors);
}

// ============================================================
// PROMPT DYNAMIQUE PAR IMAGE
// ============================================================
function buildDynamicPrompt(companyName, industry, targetAudience, strategy, primaryColor, secondaryColor) {
  return `Create a high-quality social media image for a business.

Company name: ${companyName}
Industry: ${industry}
Target audience: ${targetAudience}
Platform: ${strategy.platform}

Image purpose: ${strategy.purpose}

Primary text to display (exact text, do not change):
"${strategy.mainText}"

Secondary text to display (exact text, do not change):
"${strategy.secondaryText}"

Brand colors extracted from the website:
Primary: ${primaryColor}
Secondary: ${secondaryColor}

Visual style:
${strategy.visualStyle}

Design rules:
- Text must be perfectly readable on mobile
- Strong visual hierarchy (headline > secondary text)
- Neutral but premium typography
- Use contrast and spacing to enhance clarity
- The image must feel credible for a real business in ${industry}

Composition guidelines:
- Avoid clutter
- Avoid exaggerated effects
- Avoid childish or playful elements
- Focus on clarity, trust, and perceived value

Technical constraints:
- Social media format optimized for ${strategy.platform}
- High resolution
- No watermarks
- No additional text beyond what was specified
- No logos unless explicitly requested

Generate only the image.`;
}

// ============================================================
// TÉLÉCHARGEMENT ET CONVERSION BASE64
// ============================================================
async function downloadImageToBase64(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (response) => {
      const chunks = [];
      
      response.on('data', (chunk) => {
        chunks.push(chunk);
      });
      
      response.on('end', () => {
        const buffer = Buffer.concat(chunks);
        const base64 = buffer.toString('base64');
        resolve(`data:image/png;base64,${base64}`);
      });
    }).on('error', (err) => {
      console.error('[IMAGES] Erreur téléchargement:', err.message);
      reject(err);
    });
  });
}

// ============================================================
// PLACEHOLDERS (FALLBACK)
// ============================================================
function generatePlaceholders(companyName, colors) {
  const primaryColor = colors?.[0]?.replace('#', '') || '5bc236';
  
  return [
    { 
      type: 'authority_expertise',
      platform: 'LinkedIn',
      purpose: 'Authority',
      prompt: 'Authority visual',
      url: `https://placehold.co/1024x1024/${primaryColor}/ffffff?text=${encodeURIComponent(companyName + ' - Authority')}`,
      base64: null
    },
    {
      type: 'transformation_projection',
      platform: 'Instagram',
      purpose: 'Transformation',
      prompt: 'Transformation visual',
      url: `https://placehold.co/1024x1024/${primaryColor}/ffffff?text=${encodeURIComponent(companyName + ' - Transform')}`,
      base64: null
    },
    {
      type: 'results_benefits',
      platform: 'Facebook',
      purpose: 'Results',
      prompt: 'Results visual',
      url: `https://placehold.co/1024x1024/${primaryColor}/ffffff?text=${encodeURIComponent(companyName + ' - Results')}`,
      base64: null
    },
    {
      type: 'brand_consistency',
      platform: 'Instagram',
      purpose: 'Branding',
      prompt: 'Branding visual',
      url: `https://placehold.co/1024x1024/${primaryColor}/ffffff?text=${encodeURIComponent(companyName + ' - Brand')}`,
      base64: null
    },
    {
      type: 'trust_clarity',
      platform: 'LinkedIn',
      purpose: 'Trust',
      prompt: 'Trust visual',
      url: `https://placehold.co/1024x1024/${primaryColor}/ffffff?text=${encodeURIComponent(companyName + ' - Trust')}`,
      base64: null
    },
    {
      type: 'soft_cta',
      platform: 'Facebook Story',
      purpose: 'CTA',
      prompt: 'CTA visual',
      url: `https://placehold.co/1024x1792/${primaryColor}/ffffff?text=${encodeURIComponent(companyName + ' - CTA')}`,
      base64: null
    }
  ];
}

module.exports = { generateSocialVisuals };
