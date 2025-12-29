// ================================
// MODULE IMAGE GENERATOR - Génération de visuels réseaux sociaux
// ================================

const OpenAI = require('openai');

// Configuration OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

/**
 * Génère 6 visuels pour les réseaux sociaux
 */
async function generateSocialVisuals(companyName, colors, industry) {
  console.log('[IMAGES] Génération des visuels réseaux sociaux...');

  const primaryColor = colors?.[0] || '#0f204b';
  const secondaryColor = colors?.[1] || '#5bc236';

  // Définir les 6 types de visuels à générer
  const visualTypes = [
    {
      type: 'hero',
      name: 'Image de couverture',
      description: `Professional hero image for ${companyName}, a ${industry} company. Modern, clean design with brand colors ${primaryColor} and ${secondaryColor}. Corporate style, high quality, 4k.`,
      size: '1200x630'
    },
    {
      type: 'post_promo',
      name: 'Post promotionnel',
      description: `Promotional social media post for ${companyName} in ${industry} sector. Eye-catching design, modern typography, brand colors ${primaryColor} and ${secondaryColor}. Square format, professional.`,
      size: '1080x1080'
    },
    {
      type: 'post_tips',
      name: 'Post conseils',
      description: `Tips and advice social media post for ${companyName}. Clean infographic style, ${industry} theme, colors ${primaryColor} and ${secondaryColor}. Educational content design.`,
      size: '1080x1080'
    },
    {
      type: 'story',
      name: 'Story Instagram',
      description: `Instagram story template for ${companyName}. Vertical format, modern design, ${industry} business, brand colors ${primaryColor} and ${secondaryColor}. Engaging and dynamic.`,
      size: '1080x1920'
    },
    {
      type: 'testimonial',
      name: 'Post témoignage',
      description: `Customer testimonial social media post for ${companyName}. Professional quote design, ${industry} sector, colors ${primaryColor} and ${secondaryColor}. Trust-building visual.`,
      size: '1080x1080'
    },
    {
      type: 'cta',
      name: 'Post Call-to-Action',
      description: `Call-to-action social media post for ${companyName}. Compelling design, ${industry} business, brand colors ${primaryColor} and ${secondaryColor}. Action-oriented visual.`,
      size: '1080x1080'
    }
  ];

  const visuals = [];

  // Essayer de générer les images avec DALL-E
  for (const visual of visualTypes) {
    try {
      if (process.env.OPENAI_API_KEY) {
        console.log(`[IMAGES] Génération: ${visual.name}...`);
        
        const response = await openai.images.generate({
          model: 'dall-e-3',
          prompt: visual.description,
          n: 1,
          size: '1024x1024',
          quality: 'standard',
          response_format: 'b64_json'
        });

        visuals.push({
          type: visual.type,
          name: visual.name,
          size: visual.size,
          prompt: visual.description,
          image: `data:image/png;base64,${response.data[0].b64_json}`,
          generated: true
        });
      } else {
        // Si pas d'API key, générer des placeholders avec instructions
        visuals.push(generatePlaceholderVisual(visual, companyName, colors, industry));
      }
    } catch (error) {
      console.warn(`[IMAGES] Erreur génération ${visual.name}:`, error.message);
      // En cas d'erreur, ajouter un placeholder
      visuals.push(generatePlaceholderVisual(visual, companyName, colors, industry));
    }
  }

  return visuals;
}

/**
 * Génère un placeholder visuel avec instructions détaillées
 */
function generatePlaceholderVisual(visual, companyName, colors, industry) {
  const primaryColor = colors?.[0] || '#0f204b';
  const secondaryColor = colors?.[1] || '#5bc236';

  // Instructions détaillées pour créer le visuel manuellement ou avec Canva/Midjourney
  const instructions = getVisualInstructions(visual.type, companyName, primaryColor, secondaryColor, industry);

  return {
    type: visual.type,
    name: visual.name,
    size: visual.size,
    prompt: visual.description,
    image: null,
    generated: false,
    instructions: instructions,
    canvaTemplate: getCanvaTemplateUrl(visual.type),
    midjourneyPrompt: getMidjourneyPrompt(visual.type, companyName, colors, industry)
  };
}

/**
 * Retourne les instructions détaillées pour créer un visuel
 */
function getVisualInstructions(type, companyName, primaryColor, secondaryColor, industry) {
  const instructions = {
    hero: `
# IMAGE DE COUVERTURE - ${companyName}

## Spécifications
- Dimensions: 1200x630 pixels (format Facebook/LinkedIn)
- Couleur principale: ${primaryColor}
- Couleur secondaire: ${secondaryColor}

## Éléments à inclure
1. Logo ou nom de l'entreprise (grand, centré ou à gauche)
2. Slogan ou proposition de valeur
3. Élément visuel représentant l'industrie ${industry}
4. Dégradé subtil avec les couleurs de marque

## Style
- Professionnel et moderne
- Typographie claire et lisible
- Espace négatif suffisant
- Contraste élevé pour la lisibilité
`,
    post_promo: `
# POST PROMOTIONNEL - ${companyName}

## Spécifications
- Dimensions: 1080x1080 pixels (carré Instagram/Facebook)
- Couleur principale: ${primaryColor}
- Couleur secondaire: ${secondaryColor}

## Éléments à inclure
1. Titre accrocheur (ex: "Offre Spéciale", "Nouveau Service")
2. Visuel attrayant lié à ${industry}
3. Call-to-action clair
4. Logo de l'entreprise

## Style
- Dynamique et engageant
- Couleurs vives et contrastées
- Texte court et impactant
`,
    post_tips: `
# POST CONSEILS - ${companyName}

## Spécifications
- Dimensions: 1080x1080 pixels
- Couleur principale: ${primaryColor}
- Couleur secondaire: ${secondaryColor}

## Éléments à inclure
1. Titre: "X Conseils pour..." ou "Le saviez-vous?"
2. Liste numérotée ou à puces (3-5 points)
3. Icônes ou illustrations
4. Logo discret

## Style
- Éducatif et informatif
- Facile à lire rapidement
- Design épuré type infographie
`,
    story: `
# STORY INSTAGRAM - ${companyName}

## Spécifications
- Dimensions: 1080x1920 pixels (vertical)
- Couleur principale: ${primaryColor}
- Couleur secondaire: ${secondaryColor}

## Éléments à inclure
1. Accroche en haut (question ou statement)
2. Visuel central impactant
3. Call-to-action en bas ("Swipe up", "Voir plus")
4. Éléments interactifs (sondage, quiz)

## Style
- Vertical et immersif
- Animations suggérées
- Texte lisible sur mobile
`,
    testimonial: `
# POST TÉMOIGNAGE - ${companyName}

## Spécifications
- Dimensions: 1080x1080 pixels
- Couleur principale: ${primaryColor}
- Couleur secondaire: ${secondaryColor}

## Éléments à inclure
1. Citation du client entre guillemets
2. Photo ou avatar du client
3. Nom et titre/entreprise du client
4. Étoiles de notation (5/5)
5. Logo de l'entreprise

## Style
- Inspirant confiance
- Design élégant
- Photo de qualité ou illustration
`,
    cta: `
# POST CALL-TO-ACTION - ${companyName}

## Spécifications
- Dimensions: 1080x1080 pixels
- Couleur principale: ${primaryColor}
- Couleur secondaire: ${secondaryColor}

## Éléments à inclure
1. Question engageante ou problème
2. Solution proposée
3. Bouton CTA visible ("Contactez-nous", "Réservez")
4. Urgence ou bénéfice ("Gratuit", "Limité")

## Style
- Action-oriented
- Contraste fort sur le CTA
- Message clair et direct
`
  };

  return instructions[type] || instructions.post_promo;
}

/**
 * Retourne l'URL d'un template Canva suggéré
 */
function getCanvaTemplateUrl(type) {
  const templates = {
    hero: 'https://www.canva.com/templates/?query=facebook%20cover%20business',
    post_promo: 'https://www.canva.com/templates/?query=instagram%20post%20promotion',
    post_tips: 'https://www.canva.com/templates/?query=instagram%20tips%20infographic',
    story: 'https://www.canva.com/templates/?query=instagram%20story%20business',
    testimonial: 'https://www.canva.com/templates/?query=testimonial%20social%20media',
    cta: 'https://www.canva.com/templates/?query=call%20to%20action%20post'
  };

  return templates[type] || templates.post_promo;
}

/**
 * Génère un prompt Midjourney optimisé
 */
function getMidjourneyPrompt(type, companyName, colors, industry) {
  const primaryColor = colors?.[0] || '#0f204b';
  const secondaryColor = colors?.[1] || '#5bc236';

  const prompts = {
    hero: `/imagine prompt: Professional business hero banner for ${industry} company, modern corporate design, gradient background using ${primaryColor} and ${secondaryColor}, clean typography space, abstract geometric elements, high-end marketing material, 4k quality --ar 1200:630 --v 6`,
    
    post_promo: `/imagine prompt: Social media promotional post design for ${industry} business, eye-catching square format, brand colors ${primaryColor} and ${secondaryColor}, modern minimalist style, professional marketing graphic, Instagram ready --ar 1:1 --v 6`,
    
    post_tips: `/imagine prompt: Educational infographic social media post, ${industry} tips and advice theme, clean numbered list design, colors ${primaryColor} and ${secondaryColor}, professional icons, easy to read layout --ar 1:1 --v 6`,
    
    story: `/imagine prompt: Instagram story template for ${industry} business, vertical mobile format, dynamic modern design, brand colors ${primaryColor} and ${secondaryColor}, engaging visual with text space, swipe up ready --ar 9:16 --v 6`,
    
    testimonial: `/imagine prompt: Customer testimonial social media graphic, ${industry} business review design, quote marks, star rating, professional portrait space, colors ${primaryColor} and ${secondaryColor}, trust-building visual --ar 1:1 --v 6`,
    
    cta: `/imagine prompt: Call-to-action social media post for ${industry} company, compelling button design, urgent promotional style, colors ${primaryColor} and ${secondaryColor}, action-oriented marketing graphic --ar 1:1 --v 6`
  };

  return prompts[type] || prompts.post_promo;
}

module.exports = {
  generateSocialVisuals
};
