// ================================
// MODULE IMAGE GENERATOR - Génération de visuels avec Gemini
// ================================

const { GoogleGenerativeAI } = require('@google/generative-ai');

const genAI = process.env.GEMINI_API_KEY ? new GoogleGenerativeAI(process.env.GEMINI_API_KEY) : null;

async function generateSocialVisuals(companyName, colors, industry) {
  console.log('[IMAGES] Génération des visuels Gemini...');

  if (!genAI) {
    console.log('[IMAGES] ⚠️ Gemini non configuré');
    return [];
  }

  const primaryColor = colors?.[0] || '#5bc236';
  const images = [];
  
  const prompts = [
    `Professional Instagram post for ${companyName}, modern design, color ${primaryColor}`,
    `Facebook cover for ${companyName}, professional branding, ${primaryColor}`,
    `LinkedIn graphic for ${companyName}, corporate style, ${primaryColor}`,
    `Social story for ${companyName}, vertical format, trendy`,
    `Service announcement for ${companyName}, clean modern`,
    `Brand promo for ${companyName}, eye-catching, ${primaryColor}`
  ];

  try {
    const model = genAI.getGenerativeModel({ model: "imagen-3.0-generate-001" });
    
    for (let i = 0; i < prompts.length; i++) {
      try {
        const result = await model.generateContent(prompts[i]);
        const imageUrl = result.response?.candidates?.[0]?.content;
        if (imageUrl) {
          images.push({ prompt: prompts[i], url: imageUrl });
        }
      } catch (err) {
        console.error(`[IMAGES] Erreur image ${i + 1}:`, err.message);
      }
    }
  } catch (error) {
    console.error('[IMAGES] Erreur Gemini:', error.message);
  }

  console.log(`[IMAGES] ✅ ${images.length} images générées`);
  return images;
}

module.exports = { generateSocialVisuals };
