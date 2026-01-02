// ================================
// MODULE HTML GENERATOR - Génération de code HTML optimisé GHL
// ================================

const OpenAI = require('openai');

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// This module has been called with different function names across versions.
// To keep backward compatibility, we export aliases (generateGHLHtml, generateGHLHTML).

async function generateModernHTML(companyName, url, scrapedData = {}, aiContent = {}) {
  console.log('[HTML] Génération du code HTML modernisé avec GPT-4...');

  const colors = Array.isArray(scrapedData.colors) ? scrapedData.colors : [];
  const primaryColor = colors[0] || '#5bc236';
  const secondaryColor = colors[1] || '#0f204b';
  const logoUrl = scrapedData.logoUrl || '';
  // Normalize sections safely (can be array or object)
  let sections = [];
  if (Array.isArray(scrapedData.sections)) {
    sections = scrapedData.sections;
  } else if (scrapedData.sections && typeof scrapedData.sections === 'object') {
    sections = Object.values(scrapedData.sections);
  }
  sections = sections
    .map((s) => (typeof s === 'string' ? { title: s } : s))
    .filter(Boolean);

  const issuesArr = Array.isArray(scrapedData.issues) ? scrapedData.issues : [];

  const prompt = `Tu es un expert développeur web spécialisé dans GoHighLevel (GHL).

MISSION: Créer un site web moderne, responsive et optimisé pour la conversion pour ${companyName}.

INFORMATIONS DU SITE ACTUEL:
- URL: ${url}
- Industrie: ${scrapedData.industry || 'Non détecté'}
- Score actuel: ${scrapedData.score}/100
- Problèmes détectés: ${issuesArr.join(', ') || 'Aucun problème détecté'}
- Sections existantes: ${sections.map(s => s?.title).filter(Boolean).join(', ') || 'Non détectées'}

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
- Adapté à l'industrie ${scrapedData.industry || 'Non détecté'}
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
    
    
// --- Quality gate: if the model returned a refusal/placeholder or non-HTML, fallback to a safe template ---
const looksLikeHtml = typeof htmlCode === 'string' && /<html[\s\S]*<\/html>/i.test(htmlCode);
const refusalSignals = typeof htmlCode === 'string' && (
  /je\s+suis\s+d[ée]sol[ée]/i.test(htmlCode) ||
  /je\s+ne\s+peux\s+pas/i.test(htmlCode) ||
  /trop\s+complexe/i.test(htmlCode) ||
  /cannot\s+generate/i.test(htmlCode) ||
  /i\s+can't\s+generate/i.test(htmlCode)
);
const tooShort = typeof htmlCode === 'string' && htmlCode.replace(/\s+/g,' ').trim().length < 2500;

if (!looksLikeHtml || refusalSignals || tooShort) {
  console.warn('[HTML] Réponse modèle invalide (refus / trop courte / non-HTML). Fallback template appliqué.');
  htmlCode = buildFallbackGhlHtml({ companyName, websiteUrl, language, region, palette, aiContent, scrapedData });
}

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

// Backward-compatible aliases
async function generateGHLHtml(companyName, url, scrapedData = {}, aiContent = {}) {
  return generateModernHTML(companyName, url, scrapedData, aiContent);
}


/**
 * Fallback: generate a clean, GHL-friendly one-page website without relying on LLM output.
 * This prevents the whole pipeline from failing when the model replies with a refusal or placeholder.
 */
function buildFallbackGhlHtml({ companyName, websiteUrl, language, region, palette, aiContent, scrapedData }) {
  const crypto = require('crypto');
  const lang = (language || 'en').toLowerCase();
  const isFR = lang.startsWith('fr');
  const isES = lang.startsWith('es');
  const primary = palette?.primary || '#0B2A4A';
  const accent  = palette?.accent  || '#D72638';
  const bg      = palette?.background || '#0A1020';
  const card    = palette?.card || '#121C33';
  const text    = palette?.text || '#FFFFFF';

  // Copy blocks if present, otherwise provide safe defaults.
  const headline = aiContent?.hero?.headline || (isFR ? 'Modernisez votre présence en ligne' : isES ? 'Moderniza tu presencia online' : 'Modernize your online presence');
  const subhead  = aiContent?.hero?.subheadline || (isFR ? 'Un site rapide, clair et optimisé pour convertir.' : isES ? 'Un sitio rápido, claro y optimizado para convertir.' : 'A fast, clear website built to convert.');
  const cta      = aiContent?.hero?.cta || (isFR ? 'Réserver une consultation' : isES ? 'Reservar una consulta' : 'Book a consultation');

  const services = Array.isArray(aiContent?.services) ? aiContent.services : [];
  const benefits = Array.isArray(aiContent?.benefits) ? aiContent.benefits : [];
  const faq      = Array.isArray(aiContent?.faq) ? aiContent.faq : [];

  const phone = scrapedData?.phone || aiContent?.contact?.phone || '';
  const email = scrapedData?.email || aiContent?.contact?.email || '';
  const address = scrapedData?.address || aiContent?.contact?.address || '';

  const safe = (s) => String(s || '').replace(/[<>]/g, '');
  const uid = crypto.randomBytes(6).toString('hex');

  const serviceCards = (services.length ? services : [
    { title: isFR ? 'Service principal' : isES ? 'Servicio principal' : 'Main service', description: isFR ? 'Une offre claire, axée sur les résultats.' : isES ? 'Una oferta clara enfocada en resultados.' : 'A clear offer focused on results.' }
  ]).slice(0,6).map(s => `
      <div class="card">
        <h3>${safe(typeof s === 'string' ? s : s?.title)}</h3>
        <p>${safe(typeof s === 'string' ? '' : s?.description)}</p>
      </div>`).join('');

  const benefitLis = (benefits.length ? benefits : [
    isFR ? 'Expérience client améliorée' : isES ? 'Mejor experiencia del cliente' : 'Better customer experience',
    isFR ? 'Plus de demandes qualifiées' : isES ? 'Más solicitudes calificadas' : 'More qualified inquiries',
    isFR ? 'Image de marque plus forte' : isES ? 'Marca más fuerte' : 'Stronger brand'
  ]).slice(0,6).map(b => `<li>${safe(typeof b === 'string' ? b : b?.text || b?.title)}</li>`).join('');

  const faqItems = (faq.length ? faq : [
    { q: isFR ? 'Combien de temps pour voir des résultats ?' : isES ? '¿Cuánto tarda en verse el resultado?' : 'How long to see results?', a: isFR ? 'Cela dépend du service, mais on vise des améliorations rapides et visibles.' : isES ? 'Depende del servicio, pero buscamos mejoras rápidas y visibles.' : 'It depends on the service, but we aim for fast, visible improvements.' },
    { q: isFR ? 'Comment réserver ?' : isES ? '¿Cómo reservar?' : 'How do I book?', a: isFR ? 'Cliquez sur le bouton et choisissez votre plage horaire.' : isES ? 'Haz clic en el botón y elige tu horario.' : 'Click the button and pick your slot.' }
  ]).slice(0,6).map(f => {
    const q = safe(f?.q || f?.question || f?.title);
    const a = safe(f?.a || f?.answer || f?.description);
    return `<details class="faq"><summary>${q}</summary><div>${a}</div></details>`;
  }).join('');

  return `<!doctype html>
<html lang="${safe(lang)}">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${safe(companyName || 'Website')}</title>
  <meta name="description" content="${safe(subhead)}" />
  <style>
    :root{
      --bg:${bg}; --card:${card}; --text:${text}; --primary:${primary}; --accent:${accent};
      --radius:18px;
    }
    *{box-sizing:border-box}
    body{margin:0;font-family:system-ui,-apple-system,Segoe UI,Roboto,Inter,Arial;color:var(--text);background:radial-gradient(1200px 600px at 20% 0%, rgba(255,255,255,.08), transparent 60%), linear-gradient(180deg,#070B16 0%, var(--bg) 60%, #050816 100%);}
    a{color:inherit}
    .wrap{max-width:1100px;margin:0 auto;padding:28px 18px}
    .nav{display:flex;align-items:center;justify-content:space-between;gap:14px}
    .brand{display:flex;align-items:center;gap:10px;font-weight:700}
    .dot{width:38px;height:38px;border-radius:12px;background:linear-gradient(135deg,var(--accent),var(--primary))}
    .pill{display:inline-flex;align-items:center;gap:8px;padding:10px 14px;border-radius:999px;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.08)}
    .btn{display:inline-flex;align-items:center;justify-content:center;padding:14px 18px;border-radius:14px;background:linear-gradient(135deg,var(--accent),#ff5a6b);color:#fff;font-weight:700;text-decoration:none;border:0;cursor:pointer}
    .btn.secondary{background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.10)}
    .hero{margin-top:26px;display:grid;grid-template-columns:1.15fr .85fr;gap:18px;align-items:stretch}
    .panel{background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.10);border-radius:var(--radius);padding:22px;box-shadow:0 20px 60px rgba(0,0,0,.35)}
    h1{margin:0 0 10px;font-size:44px;line-height:1.05;letter-spacing:-.02em}
    p{margin:0;color:rgba(255,255,255,.78);font-size:16px;line-height:1.55}
    .grid{display:grid;grid-template-columns:repeat(3,1fr);gap:14px;margin-top:14px}
    .card{background:rgba(0,0,0,.18);border:1px solid rgba(255,255,255,.10);border-radius:18px;padding:16px}
    .card h3{margin:0 0 8px;font-size:18px}
    .card p{margin:0;font-size:14px}
    .section{margin-top:18px}
    .section h2{margin:0 0 12px;font-size:24px}
    ul{margin:0;padding-left:18px}
    li{margin:8px 0;color:rgba(255,255,255,.85)}
    details{background:rgba(0,0,0,.18);border:1px solid rgba(255,255,255,.10);border-radius:16px;padding:12px 14px}
    summary{cursor:pointer;font-weight:700}
    details > div{margin-top:8px;color:rgba(255,255,255,.82)}
    .footer{margin-top:22px;display:flex;flex-wrap:wrap;gap:12px;align-items:center;justify-content:space-between;color:rgba(255,255,255,.65);font-size:13px}
    .meta{display:flex;flex-wrap:wrap;gap:10px}
    @media (max-width:900px){
      .hero{grid-template-columns:1fr}
      h1{font-size:36px}
      .grid{grid-template-columns:1fr}
    }
  </style>
</head>
<body>
  <div class="wrap">
    <div class="nav">
      <div class="brand"><div class="dot" aria-hidden="true"></div><div>${safe(companyName || 'Company')}</div></div>
      <div class="meta">
        ${phone ? `<div class="pill">📞 ${safe(phone)}</div>` : ``}
        ${email ? `<div class="pill">✉️ ${safe(email)}</div>` : ``}
        <a class="btn secondary" href="#contact">${safe(isFR?'Contact':'Contact')}</a>
      </div>
    </div>

    <div class="hero">
      <div class="panel">
        <div class="pill">${safe(isFR?'Optimisé • Mobile • SEO':'Optimized • Mobile • SEO')}</div>
        <h1>${safe(headline)}</h1>
        <p>${safe(subhead)}</p>
        <div style="display:flex;gap:10px;flex-wrap:wrap;margin-top:14px">
          <a class="btn" href="#contact">${safe(cta)}</a>
          <a class="btn secondary" href="${safe(websiteUrl || '#')}" target="_blank" rel="noreferrer">${safe(isFR?'Voir le site actuel':'View current site')}</a>
        </div>

        <div class="section">
          <h2>${safe(isFR?'Services':'Services')}</h2>
          <div class="grid">${serviceCards}</div>
        </div>
      </div>

      <div class="panel">
        <div class="section">
          <h2>${safe(isFR?'Pourquoi nous choisir ?': isES ? '¿Por qué elegirnos?' : 'Why choose us?')}</h2>
          <ul>${benefitLis}</ul>
        </div>
        <div class="section">
          <h2>${safe(isFR?'FAQ':'FAQ')}</h2>
          ${faqItems}
        </div>
      </div>
    </div>

    <div class="panel section" id="contact">
      <h2>${safe(isFR?'Prendre rendez-vous':'Book an appointment')}</h2>
      <p>${safe(isFR?'Laissez vos informations et on vous rappelle rapidement.':'Leave your details and we’ll get back to you quickly.')}</p>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-top:14px">
        <input id="name-${uid}" placeholder="${safe(isFR?'Votre nom':'Your name')}" style="padding:14px;border-radius:14px;border:1px solid rgba(255,255,255,.12);background:rgba(0,0,0,.22);color:var(--text)" />
        <input id="email-${uid}" placeholder="${safe(isFR?'Votre email':'Your email')}" style="padding:14px;border-radius:14px;border:1px solid rgba(255,255,255,.12);background:rgba(0,0,0,.22);color:var(--text)" />
      </div>
      <div style="margin-top:12px;display:flex;gap:10px;flex-wrap:wrap">
        <button class="btn" type="button" onclick="(function(){alert('${safe(isFR?'Merci! Nous vous contactons sous peu.':'Thanks! We will contact you shortly.')}');})();">${safe(isFR?'Envoyer':'Send')}</button>
        ${phone ? `<a class="btn secondary" href="tel:${safe(phone)}">${safe(isFR?'Appeler':'Call')}</a>` : ``}
      </div>
      ${address ? `<div style="margin-top:10px;color:rgba(255,255,255,.70)">📍 ${safe(address)}</div>` : ``}
    </div>

    <div class="footer">
      <div>© ${new Date().getFullYear()} ${safe(companyName || '')}</div>
      <div>Generated by IAS</div>
    </div>
  </div>
</body>
</html>`;
}

module.exports = {
  generateModernHTML,
  generateGHLHtml,
  // common typo / alternate naming
  generateGHLHTML: generateGHLHtml,
};
