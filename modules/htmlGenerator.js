// ================================
// MODULE HTML GENERATOR - Génération de code HTML optimisé GHL
// ================================

const OpenAI = require('openai');

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

async function generateModernHTML(companyName, url, scrapedData, aiContent) {
  console.log('[HTML] Génération du code HTML modernisé avec GPT-4...');

  const colors = scrapedData.colors || [];
  const primaryColor = colors[0] || '#5bc236';
  const secondaryColor = colors[1] || '#0f204b';
  const logoUrl = scrapedData.logoUrl || '';
  const sections = scrapedData.sections || [];

  const prompt = `Tu es un expert développeur web spécialisé dans GoHighLevel (GHL).

MISSION: Créer un site web moderne, responsive et optimisé pour la conversion pour ${companyName}.

INFORMATIONS DU SITE ACTUEL:
- URL: ${url}
- Industrie: ${scrapedData.industry || 'Non détecté'}
- Score actuel: ${scrapedData.score}/100
- Problèmes détectés: ${scrapedData.issues.join(', ')}
- Sections existantes: ${sections.map(s => s.title).join(', ')}

COULEURS BRAND:
- Primaire: ${primaryColor}
- Secondaire: ${secondaryColor}

EXIGENCES TECHNIQUES:
1. Code HTML5 sémantique et valide
2. Compatible GoHighLevel (sections GHL-friendly)
3. Tailwind CSS via CDN (pas de build)
4. Responsive mobile-first
5. Performance optimisée
6. SEO-friendly

SECTIONS REQUISES (toutes avec contenu réel):
1. HEADER: Navigation sticky avec logo, liens menu, CTA prominent
2. HERO: Titre accrocheur, sous-titre bénéfice, CTA primaire + secondaire, image/illustration
3. SERVICES: 3-6 services clés avec icônes, titres, descriptions
4. ABOUT: Présentation entreprise, valeurs, équipe (si pertinent)
5. TESTIMONIALS: 3-4 témoignages avec noms, photos, citations
6. STATS/RESULTS: Chiffres clés, résultats, certifications
7. CTA SECTION: Appel à l'action final avec formulaire ou bouton
8. FOOTER: Coordonnées, liens, réseaux sociaux, mentions légales

STYLE:
- Design moderne et professionnel
- Animations subtiles (hover, scroll)
- Typographie hiérarchisée
- Espacement généreux
- Contrastes optimisés

OPTIMISATIONS GHL:
- Sections commentées pour identification facile
- Classes Tailwind uniquement (pas de CSS custom complexe)
- Structure modulaire (sections indépendantes)
- Formulaires avec attributs data-form-ghl
- Boutons CTA avec tracking-ready classes

CONTENU:
- Texte professionnel et engageant
- Adapté à l'industrie ${scrapedData.industry}
- Orienté bénéfices clients
- Call-to-actions clairs

Génère le code HTML COMPLET (pas de placeholder, pas de "à compléter").
Minimum 200 lignes de code.
Qualité production-ready.

Format: Code HTML uniquement, sans markdown ni explications.`;

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.7,
      max_tokens: 4000 // Code HTML complet
    });

    let htmlCode = response.choices[0].message.content.trim();
    
    // Nettoyer le code (enlever les balises markdown si présentes)
    htmlCode = htmlCode.replace(/```html\n?/g, '').replace(/```\n?/g, '');
    
    console.log(`[HTML] Code HTML généré: ${htmlCode.length} caractères`);
    return htmlCode;
    
  } catch (error) {
    console.error('[HTML] Erreur génération:', error.message);
    // Fallback: code HTML basique mais complet
    return generateFallbackHTML(companyName, primaryColor, secondaryColor, logoUrl, sections, url);
  }
}

function generateFallbackHTML(companyName, primaryColor, secondaryColor, logoUrl, sections, siteUrl) {
  const logoHTML = logoUrl ? `<img src="${logoUrl}" alt="${companyName} Logo" class="h-12">` : `<span class="text-2xl font-bold">${companyName}</span>`;
  
  const servicesHTML = sections.slice(0, 6).map((sec, i) => `
        <div class="bg-white p-8 rounded-xl shadow-lg hover:shadow-2xl transition-shadow">
            <div class="w-16 h-16 bg-gradient-to-br from-[${primaryColor}] to-[${secondaryColor}] rounded-lg mb-6 flex items-center justify-center text-white text-2xl font-bold">
                ${i + 1}
            </div>
            <h3 class="text-2xl font-bold mb-4">${sec.title}</h3>
            <p class="text-gray-600">Service professionnel de qualité supérieure adapté à vos besoins.</p>
        </div>
  `).join('\n');

  return `<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${companyName} - Site Modernisé</title>
    <meta name="description" content="Découvrez ${companyName}, votre partenaire de confiance.">
    <script src="https://cdn.tailwindcss.com"></script>
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css">
    <style>
        :root {
            --primary: ${primaryColor};
            --secondary: ${secondaryColor};
        }
        .gradient-bg {
            background: linear-gradient(135deg, ${primaryColor} 0%, ${secondaryColor} 100%);
        }
        .btn-primary {
            background: ${primaryColor};
            color: white;
            padding: 1rem 2rem;
            border-radius: 0.5rem;
            font-weight: 600;
            transition: all 0.3s;
        }
        .btn-primary:hover {
            transform: translateY(-2px);
            box-shadow: 0 10px 20px rgba(0,0,0,0.2);
        }
    </style>
</head>
<body class="font-sans antialiased">

    <!-- Header / Navigation -->
    <nav class="bg-white shadow-md sticky top-0 z-50">
        <div class="container mx-auto px-6 py-4 flex justify-between items-center">
            ${logoHTML}
            <div class="hidden md:flex space-x-8">
                <a href="#accueil" class="text-gray-700 hover:text-[${primaryColor}] transition">Accueil</a>
                <a href="#services" class="text-gray-700 hover:text-[${primaryColor}] transition">Services</a>
                <a href="#apropos" class="text-gray-700 hover:text-[${primaryColor}] transition">À propos</a>
                <a href="#contact" class="text-gray-700 hover:text-[${primaryColor}] transition">Contact</a>
            </div>
            <a href="#contact" class="btn-primary">Nous Contacter</a>
        </div>
    </nav>

    <!-- Hero Section -->
    <section id="accueil" class="gradient-bg text-white py-24">
        <div class="container mx-auto px-6 text-center">
            <h1 class="text-5xl md:text-7xl font-bold mb-6">${companyName}</h1>
            <p class="text-2xl md:text-3xl mb-8 opacity-90">Votre partenaire de confiance pour des solutions de qualité</p>
            <div class="flex flex-col md:flex-row gap-4 justify-center">
                <a href="#services" class="bg-white text-[${primaryColor}] px-8 py-4 rounded-lg font-bold text-lg hover:bg-opacity-90 transition">Découvrir nos services</a>
                <a href="#contact" class="border-2 border-white text-white px-8 py-4 rounded-lg font-bold text-lg hover:bg-white hover:text-[${primaryColor}] transition">Prendre rendez-vous</a>
            </div>
        </div>
    </section>

    <!-- Services Section -->
    <section id="services" class="py-20 bg-gray-50">
        <div class="container mx-auto px-6">
            <h2 class="text-4xl md:text-5xl font-bold text-center mb-4">Nos Services</h2>
            <p class="text-xl text-gray-600 text-center mb-16">Des solutions professionnelles adaptées à vos besoins</p>
            <div class="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                ${servicesHTML}
            </div>
        </div>
    </section>

    <!-- About Section -->
    <section id="apropos" class="py-20 bg-white">
        <div class="container mx-auto px-6">
            <div class="grid md:grid-cols-2 gap-12 items-center">
                <div>
                    <h2 class="text-4xl md:text-5xl font-bold mb-6">À propos de ${companyName}</h2>
                    <p class="text-lg text-gray-700 mb-6">Avec des années d'expérience dans notre domaine, nous sommes fiers d'offrir des services de qualité supérieure à nos clients.</p>
                    <p class="text-lg text-gray-700 mb-8">Notre équipe d'experts s'engage à fournir des résultats exceptionnels et un service client irréprochable.</p>
                    <a href="#contact" class="btn-primary inline-block">En savoir plus</a>
                </div>
                <div class="bg-gradient-to-br from-[${primaryColor}] to-[${secondaryColor}] rounded-2xl h-96"></div>
            </div>
        </div>
    </section>

    <!-- CTA Section -->
    <section id="contact" class="gradient-bg text-white py-20">
        <div class="container mx-auto px-6 text-center">
            <h2 class="text-4xl md:text-5xl font-bold mb-6">Prêt à commencer ?</h2>
            <p class="text-xl mb-8 opacity-90">Contactez-nous dès aujourd'hui pour discuter de votre projet</p>
            <a href="tel:+33123456789" class="bg-white text-[${primaryColor}] px-10 py-5 rounded-lg font-bold text-xl hover:bg-opacity-90 transition inline-block">
                <i class="fas fa-phone mr-2"></i> Appelez-nous maintenant
            </a>
        </div>
    </section>

    <!-- Footer -->
    <footer class="bg-gray-900 text-white py-12">
        <div class="container mx-auto px-6">
            <div class="grid md:grid-cols-3 gap-8">
                <div>
                    <h3 class="text-2xl font-bold mb-4">${companyName}</h3>
                    <p class="text-gray-400">Votre partenaire de confiance depuis des années.</p>
                </div>
                <div>
                    <h4 class="text-xl font-bold mb-4">Liens rapides</h4>
                    <ul class="space-y-2">
                        <li><a href="#accueil" class="text-gray-400 hover:text-white transition">Accueil</a></li>
                        <li><a href="#services" class="text-gray-400 hover:text-white transition">Services</a></li>
                        <li><a href="#apropos" class="text-gray-400 hover:text-white transition">À propos</a></li>
                        <li><a href="#contact" class="text-gray-400 hover:text-white transition">Contact</a></li>
                    </ul>
                </div>
                <div>
                    <h4 class="text-xl font-bold mb-4">Contact</h4>
                    <p class="text-gray-400 mb-2"><i class="fas fa-envelope mr-2"></i> contact@${companyName.toLowerCase().replace(/\s/g, '')}.com</p>
                    <p class="text-gray-400 mb-4"><i class="fas fa-phone mr-2"></i> +33 1 23 45 67 89</p>
                    <div class="flex space-x-4">
                        <a href="#" class="text-gray-400 hover:text-white transition"><i class="fab fa-facebook fa-2x"></i></a>
                        <a href="#" class="text-gray-400 hover:text-white transition"><i class="fab fa-linkedin fa-2x"></i></a>
                        <a href="#" class="text-gray-400 hover:text-white transition"><i class="fab fa-instagram fa-2x"></i></a>
                    </div>
                </div>
            </div>
            <div class="border-t border-gray-800 mt-8 pt-8 text-center text-gray-400">
                <p>&copy; ${new Date().getFullYear()} ${companyName}. Tous droits réservés. | Site original: <a href="${siteUrl}" class="hover:text-white transition">${siteUrl}</a></p>
            </div>
        </div>
    </footer>

</body>
</html>`;
}

// Backward-compatible exports:
// Older backend versions expect htmlGenerator.generateGHLHtml(...)
// We keep generateModernHTML as the main implementation and expose aliases.
module.exports = {
  generateModernHTML,
  generateGHLHtml: generateModernHTML,
  generateGHLHTML: generateModernHTML,
  generateGHL: generateModernHTML,
};
