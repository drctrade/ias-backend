// ================================
// MODULE IMAGE GENERATOR - Génération de visuels avec OpenAI DALL-E 3
// ================================

const OpenAI = require('openai');
const https = require('https');

const openai = process.env.OPENAI_API_KEY ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY }) : null;

async function generateSocialVisuals(companyName, colors, industry) {
  console.log('[IMAGES] Generation des visuels avec DALL-E 3...');

  if (!openai) {
    console.log('[IMAGES] OpenAI non configure, utilisation de placeholders');
    return generatePlaceholders(companyName, colors);
  }

  const primaryColor = colors?.[0] || '#5bc236';
  const images = [];
  
  // Prompts améliorés avec plus de détails
  const prompts = [
    {
      type: 'instagram_post',
      prompt: `Ultra-modern ${industry || 'business'} Instagram post visual for ${companyName}. Professional design with ${primaryColor} as dominant color. Clean, minimalist, high-end aesthetic. No text, just pure visual branding. Premium quality.`
    },
    {
      type: 'facebook_cover',
      prompt: `Professional Facebook cover banner for ${companyName} in ${industry || 'business'} industry. Sophisticated corporate branding with ${primaryColor} color scheme. Wide horizontal format, elegant design, modern style.`
    },
    {
      type: 'linkedin_graphic',
      prompt: `Business-focused LinkedIn promotional graphic for ${companyName}. Professional ${industry || 'corporate'} aesthetic with ${primaryColor} brand color. Trust-building visual, clean layout, high credibility design.`
    },
    {
      type: 'story_template',
      prompt: `Trendy vertical social media story template for ${companyName}. Modern ${industry || 'business'} style with ${primaryColor} accent color. Eye-catching design for mobile viewing, premium quality.`
    },
    {
      type: 'service_poster',
      prompt: `Clean service announcement poster for ${companyName} in ${industry || 'business'} sector. Modern aesthetic with ${primaryColor} highlights. Professional, attention-grabbing, minimalist design.`
    },
    {
      type: 'brand_promo',
      prompt: `Eye-catching brand promotional banner for ${companyName}. Distinctive ${industry || 'business'} visual identity with ${primaryColor} as primary color. Modern, memorable, professional design.`
    }
  ];

  try {
    for (let i = 0; i < prompts.length; i++) {
      try {
        console.log(`[IMAGES] Generation image ${i + 1}/6: ${prompts[i].type}...`);
        
        const response = await openai.images.generate({
          model: "dall-e-3",
          prompt: prompts[i].prompt,
          n: 1,
          size: "1024x1024",
          quality: "hd", // Haute qualité
          style: "natural" // Style naturel
        });
        
        if (response.data && response.data[0] && response.data[0].url) {
          // Télécharger l'image et la convertir en base64
          console.log(`[IMAGES] Téléchargement image ${i + 1}...`);
          const base64 = await downloadImageToBase64(response.data[0].url);
          
          images.push({ 
            type: prompts[i].type,
            prompt: prompts[i].prompt,
            url: response.data[0].url, // URL temporaire (expire dans 1h)
            base64: base64 // Base64 permanent
          });
          console.log(`[IMAGES] Image ${i + 1} generee et telechargee`);
        }
      } catch (err) {
        console.error(`[IMAGES] Erreur image ${i + 1}:`, err.message);
        // Ajouter un placeholder en cas d'erreur
        images.push({
          type: prompts[i].type,
          prompt: prompts[i].prompt,
          url: `https://placehold.co/1024x1024/${primaryColor.replace('#', '')}/ffffff?text=${encodeURIComponent(companyName + ' - ' + prompts[i].type)}`,
          base64: null
        });
      }
    }
  } catch (error) {
    console.error('[IMAGES] Erreur DALL-E:', error.message);
  }

  console.log(`[IMAGES] ${images.length} images generees avec DALL-E 3`);
  return images.length > 0 ? images : generatePlaceholders(companyName, colors);
}

// Télécharger une image depuis une URL et la convertir en base64
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

function generatePlaceholders(companyName, colors) {
  const primaryColor = colors?.[0]?.replace('#', '') || '5bc236';
  
  return [
    { type: 'instagram_post', prompt: `Instagram post for ${companyName}`, url: `https://placehold.co/1080x1080/${primaryColor}/ffffff?text=${encodeURIComponent(companyName + ' - Post')}`, base64: null },
    { type: 'facebook_cover', prompt: `Facebook cover for ${companyName}`, url: `https://placehold.co/1200x630/${primaryColor}/ffffff?text=${encodeURIComponent(companyName + ' - Cover')}`, base64: null },
    { type: 'linkedin_graphic', prompt: `LinkedIn graphic for ${companyName}`, url: `https://placehold.co/1200x627/${primaryColor}/ffffff?text=${encodeURIComponent(companyName + ' - LinkedIn')}`, base64: null },
    { type: 'story_template', prompt: `Social story for ${companyName}`, url: `https://placehold.co/1080x1920/${primaryColor}/ffffff?text=${encodeURIComponent(companyName + ' - Story')}`, base64: null },
    { type: 'service_poster', prompt: `Service announcement for ${companyName}`, url: `https://placehold.co/1080x1080/${primaryColor}/ffffff?text=${encodeURIComponent(companyName + ' - Annonce')}`, base64: null },
    { type: 'brand_promo', prompt: `Brand promo for ${companyName}`, url: `https://placehold.co/1080x1080/${primaryColor}/ffffff?text=${encodeURIComponent(companyName + ' - Promo')}`, base64: null }
  ];
}

module.exports = { generateSocialVisuals };
