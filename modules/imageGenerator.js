// ================================
// MODULE IMAGE GENERATOR - Génération de visuels avec OpenAI DALL-E 3
// ================================

const OpenAI = require('openai');

const openai = process.env.OPENAI_API_KEY ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY }) : null;

async function generateSocialVisuals(companyName, colors, industry) {
  console.log('[IMAGES] Generation des visuels avec DALL-E 3...');

  if (!openai) {
    console.log('[IMAGES] OpenAI non configure, utilisation de placeholders');
    return generatePlaceholders(companyName, colors);
  }

  const primaryColor = colors?.[0] || '#5bc236';
  const images = [];
  
  const prompts = [
    `Professional Instagram post design for ${companyName}, modern minimalist style, dominant color ${primaryColor}, high quality, no text`,
    `Facebook cover banner for ${companyName}, corporate professional branding, color scheme ${primaryColor}, clean design`,
    `LinkedIn promotional graphic for ${companyName}, business professional style, featuring ${primaryColor}`,
    `Social media story template for ${companyName}, vertical format, trendy modern design, ${primaryColor} accent`,
    `Service announcement poster for ${companyName}, clean modern aesthetic, ${primaryColor} highlights`,
    `Brand promotional banner for ${companyName}, eye-catching visual, ${primaryColor} dominant color`
  ];

  try {
    for (let i = 0; i < prompts.length; i++) {
      try {
        console.log(`[IMAGES] Generation image ${i + 1}/6...`);
        
        const response = await openai.images.generate({
          model: "dall-e-3",
          prompt: prompts[i],
          n: 1,
          size: "1024x1024",
          quality: "standard"
        });
        
        if (response.data && response.data[0] && response.data[0].url) {
          images.push({ 
            prompt: prompts[i], 
            url: response.data[0].url 
          });
          console.log(`[IMAGES] Image ${i + 1} generee`);
        }
      } catch (err) {
        console.error(`[IMAGES] Erreur image ${i + 1}:`, err.message);
      }
    }
  } catch (error) {
    console.error('[IMAGES] Erreur DALL-E:', error.message);
  }

  console.log(`[IMAGES] ${images.length} images generees avec DALL-E 3`);
  return images.length > 0 ? images : generatePlaceholders(companyName, colors);
}

function generatePlaceholders(companyName, colors) {
  const primaryColor = colors?.[0]?.replace('#', '') || '5bc236';
  
  return [
    { prompt: `Instagram post for ${companyName}`, url: `https://placehold.co/1080x1080/${primaryColor}/ffffff?text=${encodeURIComponent(companyName + ' - Post 1')}` },
    { prompt: `Facebook cover for ${companyName}`, url: `https://placehold.co/1200x630/${primaryColor}/ffffff?text=${encodeURIComponent(companyName + ' - Cover')}` },
    { prompt: `LinkedIn graphic for ${companyName}`, url: `https://placehold.co/1200x627/${primaryColor}/ffffff?text=${encodeURIComponent(companyName + ' - LinkedIn')}` },
    { prompt: `Social story for ${companyName}`, url: `https://placehold.co/1080x1920/${primaryColor}/ffffff?text=${encodeURIComponent(companyName + ' - Story')}` },
    { prompt: `Service announcement for ${companyName}`, url: `https://placehold.co/1080x1080/${primaryColor}/ffffff?text=${encodeURIComponent(companyName + ' - Annonce')}` },
    { prompt: `Brand promo for ${companyName}`, url: `https://placehold.co/1080x1080/${primaryColor}/ffffff?text=${encodeURIComponent(companyName + ' - Promo')}` }
  ];
}

module.exports = { generateSocialVisuals };
