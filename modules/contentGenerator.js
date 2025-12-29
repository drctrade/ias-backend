// ================================
// MODULE CONTENT GENERATOR - Génération de contenu AI
// ================================

const OpenAI = require('openai');

// Configuration OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

/**
 * Génère tout le contenu AI pour le package
 */
async function generateAllContent(companyName, url, scrapedData) {
  console.log('[CONTENT] Génération du contenu AI...');

  try {
    // Générer en parallèle pour optimiser le temps
    const [systemPrompt, brandKitPrompt, loomScript, emailTemplates] = await Promise.all([
      generateSystemPrompt(companyName, url, scrapedData),
      generateBrandKitPrompt(companyName, scrapedData),
      generateLoomScript(companyName, url, scrapedData),
      generateEmailTemplates(companyName, url, scrapedData)
    ]);

    return {
      systemPrompt,
      brandKitPrompt,
      loomScript,
      emailTemplates
    };
  } catch (error) {
    console.error('[CONTENT] Erreur AI:', error.message);
    
    // Retourner du contenu par défaut si l'API échoue
    return {
      systemPrompt: generateDefaultSystemPrompt(companyName, url, scrapedData),
      brandKitPrompt: generateDefaultBrandKitPrompt(companyName, scrapedData),
      loomScript: generateDefaultLoomScript(companyName, url, scrapedData),
      emailTemplates: generateDefaultEmailTemplates(companyName, url)
    };
  }
}

/**
 * Génère le System Prompt pour l'agent AI (Chat + Voice + FB/IG)
 */
async function generateSystemPrompt(companyName, url, scrapedData) {
  const prompt = `Tu es un expert en création de chatbots et agents vocaux IA. Crée un system prompt complet et professionnel pour ${companyName}, une entreprise dans le secteur ${scrapedData.industry}.

Informations sur l'entreprise:
- Nom: ${companyName}
- Site web: ${url}
- Industrie: ${scrapedData.industry}
- Titre du site: ${scrapedData.title}
- Description: ${scrapedData.description || 'Non disponible'}
- Contenu principal: ${scrapedData.textContent?.h1 || ''} ${scrapedData.textContent?.h2s?.join(', ') || ''}

Crée un system prompt détaillé qui inclut:
1. Rôle et personnalité de l'agent
2. Ton de communication (professionnel mais chaleureux)
3. Informations clés sur l'entreprise à connaître
4. Objectifs de qualification des leads
5. Questions à poser pour qualifier
6. Réponses types aux questions fréquentes
7. Processus de prise de rendez-vous
8. Gestion des objections
9. Consignes pour Facebook/Instagram DMs
10. Consignes pour les appels vocaux

Le prompt doit être en français et prêt à être utilisé dans un chatbot GoHighLevel ou Vapi.`;

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4.1-mini',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 2000,
      temperature: 0.7
    });

    return response.choices[0].message.content;
  } catch (error) {
    console.warn('[CONTENT] Erreur génération system prompt:', error.message);
    return generateDefaultSystemPrompt(companyName, url, scrapedData);
  }
}

/**
 * Génère le Pomelli Brand Kit Prompt
 */
async function generateBrandKitPrompt(companyName, scrapedData) {
  const colors = scrapedData.colors || ['#0f204b', '#5bc236'];
  const fonts = scrapedData.fonts || ['Inter'];

  const prompt = `Crée un Brand Kit Prompt détaillé pour ${companyName} (secteur: ${scrapedData.industry}).

Couleurs détectées: ${colors.join(', ')}
Polices détectées: ${fonts.join(', ')}

Génère un guide de marque complet incluant:
1. Palette de couleurs avec codes HEX et utilisation recommandée
2. Typographie recommandée (titres, corps, accents)
3. Style visuel (moderne, classique, minimaliste, etc.)
4. Ton de voix de la marque
5. Éléments graphiques suggérés
6. Exemples d'application (cartes de visite, réseaux sociaux, site web)
7. Prompt Midjourney/DALL-E pour générer des visuels cohérents
8. Do's and Don'ts visuels

Le guide doit être en français et prêt à être utilisé par un designer ou un outil AI.`;

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4.1-mini',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 1500,
      temperature: 0.7
    });

    return response.choices[0].message.content;
  } catch (error) {
    console.warn('[CONTENT] Erreur génération brand kit:', error.message);
    return generateDefaultBrandKitPrompt(companyName, scrapedData);
  }
}

/**
 * Génère le script vidéo Loom
 */
async function generateLoomScript(companyName, url, scrapedData) {
  const issues = scrapedData.issues || [];
  const opportunities = scrapedData.opportunities || [];

  const prompt = `Crée un script vidéo Loom professionnel pour présenter un audit de site web à ${companyName}.

Informations:
- Site analysé: ${url}
- Score: ${scrapedData.score}/100
- Problèmes détectés: ${issues.map(i => i.title).join(', ')}
- Opportunités: ${opportunities.map(o => o.title).join(', ')}
- Industrie: ${scrapedData.industry}

Crée un script de 2-3 minutes avec:
1. INTRO (15 sec) - Accroche personnalisée
2. PROBLÈMES (45 sec) - Présentation des problèmes avec impact business
3. OPPORTUNITÉS (45 sec) - Solutions proposées avec bénéfices chiffrés
4. DÉMONSTRATION (30 sec) - Ce que le nouveau site pourrait faire
5. OFFRE (30 sec) - Proposition de valeur claire
6. CALL-TO-ACTION (15 sec) - Invitation à un appel découverte

Format:
- Structure en bullet points pour faciliter la lecture
- Verbatim exact à dire
- Notes de timing
- Indications visuelles (quand montrer le site, le prototype, etc.)

Le script doit être en français, naturel et persuasif.`;

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4.1-mini',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 1500,
      temperature: 0.7
    });

    return response.choices[0].message.content;
  } catch (error) {
    console.warn('[CONTENT] Erreur génération loom script:', error.message);
    return generateDefaultLoomScript(companyName, url, scrapedData);
  }
}

/**
 * Génère les 3 templates d'emails
 */
async function generateEmailTemplates(companyName, url, scrapedData) {
  const prompt = `Crée 3 templates d'emails de prospection pour ${companyName} (${url}).

Contexte:
- Industrie: ${scrapedData.industry}
- Score du site: ${scrapedData.score}/100
- Problèmes principaux: ${scrapedData.issues?.slice(0, 3).map(i => i.title).join(', ')}

Crée 3 emails avec variables personnalisables [NOM], [ENTREPRISE], [SITE], [PROBLEME_PRINCIPAL]:

EMAIL 1 - Premier contact (Cold email)
- Objet accrocheur
- Corps court et percutant
- CTA clair

EMAIL 2 - Relance (J+3)
- Objet de relance
- Rappel de la valeur
- Nouveau CTA

EMAIL 3 - Dernière chance (J+7)
- Objet d'urgence douce
- Récapitulatif des bénéfices
- Offre limitée dans le temps

Chaque email doit:
- Être en français
- Avoir moins de 150 mots
- Être personnalisable
- Avoir un ton professionnel mais humain
- Inclure une signature type`;

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4.1-mini',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 2000,
      temperature: 0.7
    });

    const content = response.choices[0].message.content;
    
    // Parser les emails
    return parseEmailTemplates(content);
  } catch (error) {
    console.warn('[CONTENT] Erreur génération emails:', error.message);
    return generateDefaultEmailTemplates(companyName, url);
  }
}

function parseEmailTemplates(content) {
  // Retourner le contenu brut structuré
  return [
    {
      name: 'Premier Contact',
      subject: `[ENTREPRISE] - J'ai analysé votre site web`,
      body: content.split('EMAIL 2')[0] || content,
      timing: 'J+0'
    },
    {
      name: 'Relance',
      subject: `[Rappel] Votre audit de site web gratuit`,
      body: content.split('EMAIL 2')[1]?.split('EMAIL 3')[0] || '',
      timing: 'J+3'
    },
    {
      name: 'Dernière Chance',
      subject: `Dernière chance - [ENTREPRISE]`,
      body: content.split('EMAIL 3')[1] || '',
      timing: 'J+7'
    }
  ];
}

/**
 * Génère le code HTML GHL
 */
function generateHTMLCode(companyName, colors, url, scrapedData) {
  const primaryColor = colors[0] || '#5bc236';
  const secondaryColor = colors[1] || '#0f204b';
  const accentColor = colors[2] || '#ffffff';
  const industry = scrapedData?.industry || 'Services';

  return `<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${companyName} - Votre Partenaire ${industry}</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css">
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap" rel="stylesheet">
    <style>
        :root {
            --primary: ${primaryColor};
            --secondary: ${secondaryColor};
            --accent: ${accentColor};
        }
        body { font-family: 'Inter', sans-serif; }
        .gradient-bg { background: linear-gradient(135deg, var(--primary) 0%, var(--secondary) 100%); }
        .btn-primary { 
            background: var(--primary); 
            transition: all 0.3s;
        }
        .btn-primary:hover { 
            transform: translateY(-2px); 
            box-shadow: 0 10px 30px rgba(0,0,0,0.2);
        }
        .glass {
            background: rgba(255, 255, 255, 0.1);
            backdrop-filter: blur(10px);
            border: 1px solid rgba(255, 255, 255, 0.2);
        }
    </style>
</head>
<body class="bg-gray-50">
    <!-- HERO SECTION -->
    <header class="gradient-bg text-white min-h-screen flex items-center relative overflow-hidden">
        <div class="absolute inset-0 opacity-10">
            <div class="absolute top-20 left-20 w-72 h-72 bg-white rounded-full blur-3xl"></div>
            <div class="absolute bottom-20 right-20 w-96 h-96 bg-white rounded-full blur-3xl"></div>
        </div>
        <div class="container mx-auto px-4 py-20 relative z-10">
            <nav class="flex items-center justify-between mb-20">
                <div class="text-3xl font-bold">${companyName}</div>
                <div class="hidden md:flex items-center space-x-8">
                    <a href="#services" class="hover:text-gray-200 transition">Services</a>
                    <a href="#about" class="hover:text-gray-200 transition">À propos</a>
                    <a href="#testimonials" class="hover:text-gray-200 transition">Témoignages</a>
                    <a href="#contact" class="btn-primary px-6 py-3 rounded-full font-bold">
                        <i class="fas fa-phone mr-2"></i>Contactez-nous
                    </a>
                </div>
            </nav>
            <div class="grid md:grid-cols-2 gap-12 items-center">
                <div>
                    <h1 class="text-5xl md:text-7xl font-bold mb-6 leading-tight">
                        Votre Expert<br>
                        <span class="text-yellow-300">${industry}</span>
                    </h1>
                    <p class="text-xl mb-8 opacity-90">
                        ${companyName} vous accompagne avec excellence et professionnalisme. 
                        Découvrez nos services personnalisés et notre engagement qualité.
                    </p>
                    <div class="flex flex-wrap gap-4">
                        <a href="#contact" class="bg-white text-gray-900 px-8 py-4 rounded-full font-bold hover:scale-105 transition-transform">
                            <i class="fas fa-calendar mr-2"></i>Prendre RDV
                        </a>
                        <a href="#services" class="glass px-8 py-4 rounded-full font-bold hover:bg-white/20 transition">
                            <i class="fas fa-arrow-right mr-2"></i>Nos Services
                        </a>
                    </div>
                </div>
                <div class="hidden md:block">
                    <div class="glass rounded-3xl p-8 transform rotate-3 hover:rotate-0 transition-transform">
                        <div class="text-6xl mb-4">🏆</div>
                        <h3 class="text-2xl font-bold mb-2">+1000 Clients Satisfaits</h3>
                        <p class="opacity-80">Rejoignez notre communauté de clients heureux</p>
                    </div>
                </div>
            </div>
        </div>
    </header>

    <!-- SERVICES SECTION -->
    <section id="services" class="py-20 bg-white">
        <div class="container mx-auto px-4">
            <div class="text-center mb-16">
                <h2 class="text-4xl md:text-5xl font-bold mb-4">Nos Services</h2>
                <p class="text-xl text-gray-600">Des solutions adaptées à vos besoins</p>
            </div>
            <div class="grid md:grid-cols-3 gap-8">
                <div class="bg-gray-50 p-8 rounded-2xl hover:shadow-xl transition-shadow">
                    <div class="w-16 h-16 rounded-2xl flex items-center justify-center mb-6" style="background: var(--primary)">
                        <i class="fas fa-star text-white text-2xl"></i>
                    </div>
                    <h3 class="text-2xl font-bold mb-4">Service Premium</h3>
                    <p class="text-gray-600 mb-4">Excellence et qualité garanties pour tous vos projets.</p>
                    <a href="#contact" class="text-sm font-bold hover:underline" style="color: var(--primary)">
                        En savoir plus <i class="fas fa-arrow-right ml-1"></i>
                    </a>
                </div>
                <div class="bg-gray-50 p-8 rounded-2xl hover:shadow-xl transition-shadow">
                    <div class="w-16 h-16 rounded-2xl flex items-center justify-center mb-6" style="background: var(--primary)">
                        <i class="fas fa-bolt text-white text-2xl"></i>
                    </div>
                    <h3 class="text-2xl font-bold mb-4">Rapidité</h3>
                    <p class="text-gray-600 mb-4">Service rapide et efficace, respectant vos délais.</p>
                    <a href="#contact" class="text-sm font-bold hover:underline" style="color: var(--primary)">
                        En savoir plus <i class="fas fa-arrow-right ml-1"></i>
                    </a>
                </div>
                <div class="bg-gray-50 p-8 rounded-2xl hover:shadow-xl transition-shadow">
                    <div class="w-16 h-16 rounded-2xl flex items-center justify-center mb-6" style="background: var(--primary)">
                        <i class="fas fa-shield-alt text-white text-2xl"></i>
                    </div>
                    <h3 class="text-2xl font-bold mb-4">Confiance</h3>
                    <p class="text-gray-600 mb-4">Transparence et fiabilité dans chaque interaction.</p>
                    <a href="#contact" class="text-sm font-bold hover:underline" style="color: var(--primary)">
                        En savoir plus <i class="fas fa-arrow-right ml-1"></i>
                    </a>
                </div>
            </div>
        </div>
    </section>

    <!-- STATS SECTION -->
    <section class="py-20 gradient-bg text-white">
        <div class="container mx-auto px-4">
            <div class="grid md:grid-cols-4 gap-8 text-center">
                <div>
                    <div class="text-5xl font-bold mb-2">1000+</div>
                    <p class="text-xl opacity-80">Clients Satisfaits</p>
                </div>
                <div>
                    <div class="text-5xl font-bold mb-2">15+</div>
                    <p class="text-xl opacity-80">Années d'Expérience</p>
                </div>
                <div>
                    <div class="text-5xl font-bold mb-2">98%</div>
                    <p class="text-xl opacity-80">Taux de Satisfaction</p>
                </div>
                <div>
                    <div class="text-5xl font-bold mb-2">24/7</div>
                    <p class="text-xl opacity-80">Support Disponible</p>
                </div>
            </div>
        </div>
    </section>

    <!-- TESTIMONIALS -->
    <section id="testimonials" class="py-20 bg-gray-50">
        <div class="container mx-auto px-4">
            <div class="text-center mb-16">
                <h2 class="text-4xl md:text-5xl font-bold mb-4">Ce que disent nos clients</h2>
                <p class="text-xl text-gray-600">Découvrez les témoignages de nos clients satisfaits</p>
            </div>
            <div class="grid md:grid-cols-3 gap-8">
                <div class="bg-white p-8 rounded-2xl shadow-lg">
                    <div class="flex items-center mb-4">
                        <div class="text-yellow-400 text-xl">★★★★★</div>
                    </div>
                    <p class="text-gray-600 mb-6">"Service exceptionnel ! L'équipe de ${companyName} a dépassé toutes mes attentes. Je recommande vivement."</p>
                    <div class="flex items-center">
                        <div class="w-12 h-12 bg-gray-200 rounded-full mr-4"></div>
                        <div>
                            <p class="font-bold">Marie D.</p>
                            <p class="text-sm text-gray-500">Cliente depuis 2023</p>
                        </div>
                    </div>
                </div>
                <div class="bg-white p-8 rounded-2xl shadow-lg">
                    <div class="flex items-center mb-4">
                        <div class="text-yellow-400 text-xl">★★★★★</div>
                    </div>
                    <p class="text-gray-600 mb-6">"Professionnalisme et réactivité au rendez-vous. ${companyName} est devenu mon partenaire de confiance."</p>
                    <div class="flex items-center">
                        <div class="w-12 h-12 bg-gray-200 rounded-full mr-4"></div>
                        <div>
                            <p class="font-bold">Jean-Pierre M.</p>
                            <p class="text-sm text-gray-500">Client depuis 2022</p>
                        </div>
                    </div>
                </div>
                <div class="bg-white p-8 rounded-2xl shadow-lg">
                    <div class="flex items-center mb-4">
                        <div class="text-yellow-400 text-xl">★★★★★</div>
                    </div>
                    <p class="text-gray-600 mb-6">"Qualité irréprochable et équipe à l'écoute. Je ne changerais pour rien au monde !"</p>
                    <div class="flex items-center">
                        <div class="w-12 h-12 bg-gray-200 rounded-full mr-4"></div>
                        <div>
                            <p class="font-bold">Sophie L.</p>
                            <p class="text-sm text-gray-500">Cliente depuis 2024</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </section>

    <!-- CTA SECTION -->
    <section id="contact" class="py-20 bg-white">
        <div class="container mx-auto px-4">
            <div class="gradient-bg rounded-3xl p-12 text-white text-center">
                <h2 class="text-4xl md:text-5xl font-bold mb-6">Prêt à commencer ?</h2>
                <p class="text-xl mb-8 opacity-90 max-w-2xl mx-auto">
                    Contactez-nous dès maintenant pour discuter de votre projet et découvrir comment nous pouvons vous aider.
                </p>
                <div class="flex flex-wrap justify-center gap-4">
                    <a href="tel:+1234567890" class="bg-white text-gray-900 px-8 py-4 rounded-full font-bold hover:scale-105 transition-transform">
                        <i class="fas fa-phone mr-2"></i>Appelez-nous
                    </a>
                    <a href="mailto:contact@${companyName.toLowerCase().replace(/\s/g, '')}.com" class="glass px-8 py-4 rounded-full font-bold hover:bg-white/20 transition">
                        <i class="fas fa-envelope mr-2"></i>Envoyez un email
                    </a>
                </div>
            </div>
        </div>
    </section>

    <!-- FOOTER -->
    <footer class="py-12 bg-gray-900 text-white">
        <div class="container mx-auto px-4">
            <div class="grid md:grid-cols-4 gap-8 mb-8">
                <div>
                    <h3 class="text-2xl font-bold mb-4">${companyName}</h3>
                    <p class="text-gray-400">Votre partenaire de confiance pour tous vos besoins en ${industry.toLowerCase()}.</p>
                </div>
                <div>
                    <h4 class="font-bold mb-4">Liens Rapides</h4>
                    <ul class="space-y-2 text-gray-400">
                        <li><a href="#services" class="hover:text-white transition">Services</a></li>
                        <li><a href="#about" class="hover:text-white transition">À propos</a></li>
                        <li><a href="#testimonials" class="hover:text-white transition">Témoignages</a></li>
                        <li><a href="#contact" class="hover:text-white transition">Contact</a></li>
                    </ul>
                </div>
                <div>
                    <h4 class="font-bold mb-4">Contact</h4>
                    <ul class="space-y-2 text-gray-400">
                        <li><i class="fas fa-phone mr-2"></i>+1 (234) 567-890</li>
                        <li><i class="fas fa-envelope mr-2"></i>contact@example.com</li>
                        <li><i class="fas fa-map-marker-alt mr-2"></i>123 Rue Exemple</li>
                    </ul>
                </div>
                <div>
                    <h4 class="font-bold mb-4">Suivez-nous</h4>
                    <div class="flex space-x-4">
                        <a href="#" class="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 transition">
                            <i class="fab fa-facebook-f"></i>
                        </a>
                        <a href="#" class="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 transition">
                            <i class="fab fa-instagram"></i>
                        </a>
                        <a href="#" class="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 transition">
                            <i class="fab fa-linkedin-in"></i>
                        </a>
                    </div>
                </div>
            </div>
            <div class="border-t border-gray-800 pt-8 text-center text-gray-400">
                <p>&copy; ${new Date().getFullYear()} ${companyName}. Tous droits réservés.</p>
                <p class="text-sm mt-2">Site original: <a href="${url}" class="underline hover:text-white">${url}</a></p>
            </div>
        </div>
    </footer>

    <!-- CHATBOT WIDGET (Placeholder) -->
    <div id="chatbot-widget" class="fixed bottom-6 right-6 z-50">
        <button onclick="alert('Chatbot IA - Intégration GoHighLevel')" class="w-16 h-16 rounded-full shadow-2xl flex items-center justify-center text-white text-2xl hover:scale-110 transition-transform" style="background: var(--primary)">
            <i class="fas fa-comments"></i>
        </button>
    </div>
</body>
</html>`;
}

// ================================
// FONCTIONS PAR DÉFAUT (Fallback)
// ================================

function generateDefaultSystemPrompt(companyName, url, scrapedData) {
  return `# SYSTEM PROMPT - Agent IA ${companyName}

## RÔLE
Tu es l'assistant virtuel de ${companyName}, une entreprise spécialisée dans le secteur ${scrapedData?.industry || 'Services'}.
Site web: ${url}

## PERSONNALITÉ
- Professionnel mais chaleureux
- Empathique et à l'écoute
- Orienté solution
- Français impeccable

## OBJECTIFS
1. Accueillir chaleureusement les visiteurs
2. Répondre aux questions sur les services
3. Qualifier les prospects (budget, timing, besoins)
4. Proposer des rendez-vous
5. Collecter les coordonnées

## QUESTIONS DE QUALIFICATION
1. "Quel est votre besoin principal ?"
2. "Avez-vous un projet en cours ?"
3. "Quel est votre délai idéal ?"
4. "Avez-vous un budget défini ?"

## RÉPONSES TYPES

**Question: "Quels sont vos services ?"**
Réponse: "Nous proposons une gamme complète de services adaptés à vos besoins. Puis-je vous poser quelques questions pour vous orienter vers la solution idéale ?"

**Question: "Combien ça coûte ?"**
Réponse: "Nos tarifs sont personnalisés selon vos besoins spécifiques. Puis-je vous poser quelques questions pour vous préparer un devis sur mesure ?"

**Question: "Êtes-vous disponibles ?"**
Réponse: "Absolument ! Nous serions ravis de vous accompagner. Quel serait le meilleur moment pour un appel découverte de 15 minutes ?"

## PRISE DE RDV
"Excellent ! Je peux vous proposer un appel découverte gratuit de 15 minutes. Préférez-vous en début de semaine ou en fin de semaine ?"

## CONSIGNES FACEBOOK/INSTAGRAM
- Réponses courtes et engageantes
- Utiliser des emojis avec modération
- Rediriger vers le site ou un appel

## CONSIGNES APPELS VOCAUX
- Ton naturel et conversationnel
- Pauses pour laisser parler le client
- Reformuler pour confirmer la compréhension
- Proposer un suivi par email

## INTERDICTIONS
❌ Ne jamais dire "Je ne sais pas"
❌ Ne jamais donner de prix exact sans qualification
❌ Ne jamais être négatif ou défensif
❌ Ne jamais partager d'informations confidentielles`;
}

function generateDefaultBrandKitPrompt(companyName, scrapedData) {
  const colors = scrapedData?.colors || ['#0f204b', '#5bc236'];
  
  return `# BRAND KIT - ${companyName}

## PALETTE DE COULEURS

### Couleur Principale
- HEX: ${colors[0] || '#0f204b'}
- Utilisation: Headers, boutons principaux, éléments d'accent

### Couleur Secondaire
- HEX: ${colors[1] || '#5bc236'}
- Utilisation: CTA, liens, éléments interactifs

### Couleurs Neutres
- Blanc: #FFFFFF (fonds, texte sur couleur)
- Gris clair: #F3F4F6 (fonds secondaires)
- Gris foncé: #1F2937 (texte principal)

## TYPOGRAPHIE

### Titres
- Police: Inter Bold
- Tailles: H1: 48px, H2: 36px, H3: 24px

### Corps de texte
- Police: Inter Regular
- Taille: 16px
- Interligne: 1.6

## STYLE VISUEL
- Moderne et épuré
- Coins arrondis (8-16px)
- Ombres douces
- Espaces généreux

## TON DE VOIX
- Professionnel mais accessible
- Confiant sans être arrogant
- Orienté client

## PROMPT MIDJOURNEY/DALL-E
"Professional ${scrapedData?.industry || 'business'} imagery, modern and clean aesthetic, using colors ${colors.join(' and ')}, corporate photography style, high quality, 4k, professional lighting"

## DO'S
✅ Utiliser les couleurs de marque de manière cohérente
✅ Maintenir des espaces blancs généreux
✅ Utiliser des images de haute qualité
✅ Garder un design épuré et moderne

## DON'TS
❌ Surcharger les visuels
❌ Utiliser des polices fantaisistes
❌ Mélanger trop de couleurs
❌ Utiliser des images de mauvaise qualité`;
}

function generateDefaultLoomScript(companyName, url, scrapedData) {
  const issues = scrapedData?.issues || [];
  const score = scrapedData?.score || 50;

  return `# 🎥 SCRIPT VIDÉO LOOM - ${companyName.toUpperCase()}

## DURÉE TOTALE: 2-3 minutes

---

## 📍 INTRO (0:00 - 0:15)

**[Montrer votre visage, sourire]**

"Bonjour ! J'ai pris le temps d'analyser en détail votre site ${url} et j'ai découvert des opportunités vraiment intéressantes pour booster votre business."

---

## 📍 PROBLÈMES IDENTIFIÉS (0:15 - 1:00)

**[Partager l'écran, montrer le site]**

"Votre site a obtenu un score de ${score}/100 dans mon audit. Voici les points d'amélioration que j'ai identifiés :"

${issues.map((issue, i) => `
${i + 1}. **${issue.title}**
   - "${issue.description}"
   - Impact: ${issue.impact}
`).join('\n')}

**[Pause, regarder la caméra]**

"Ces problèmes vous font perdre des clients chaque jour, souvent sans que vous le sachiez."

---

## 📍 SOLUTIONS PROPOSÉES (1:00 - 1:45)

**[Montrer le prototype ou des exemples]**

"Voici ce que je propose pour transformer votre présence en ligne :"

1. **Site Web Moderne**
   - Design responsive et professionnel
   - Optimisé pour la conversion

2. **Chatbot IA 24/7**
   - Répond automatiquement aux visiteurs
   - Qualifie les prospects pendant que vous dormez

3. **Agent Vocal IA**
   - Prend les appels et les rendez-vous
   - Disponible 24h/24

4. **Automatisation Réseaux Sociaux**
   - Réponses automatiques Facebook/Instagram
   - Génération de contenu

---

## 📍 OFFRE (1:45 - 2:15)

**[Regarder la caméra, ton enthousiaste]**

"J'ai préparé un package complet spécialement pour ${companyName} qui inclut :

✅ Audit détaillé de votre site actuel
✅ Prototype HTML de votre nouveau site
✅ Configuration du chatbot IA
✅ Templates d'emails personnalisés
✅ Stratégie de prospection automatisée

Le tout clé en main, prêt à être déployé."

---

## 📍 CALL-TO-ACTION (2:15 - 2:30)

**[Sourire, ton amical]**

"Je serais ravi d'en discuter avec vous lors d'un appel découverte de 15 minutes, sans engagement.

Cliquez sur le lien sous cette vidéo pour réserver votre créneau, ou répondez simplement à cet email.

À très bientôt !"

**[Faire un signe de la main]**

---

## 📝 NOTES TECHNIQUES

- Durée idéale: 2-3 minutes max
- Parler naturellement, pas trop vite
- Sourire et maintenir le contact visuel
- Montrer le site du client pendant l'analyse
- Terminer sur une note positive`;
}

function generateDefaultEmailTemplates(companyName, url) {
  return [
    {
      name: 'Premier Contact',
      subject: `[ENTREPRISE] - J'ai analysé votre site web`,
      body: `Bonjour [NOM],

J'ai pris quelques minutes pour analyser [SITE] et j'ai identifié plusieurs opportunités d'amélioration qui pourraient significativement augmenter vos conversions.

Voici ce que j'ai découvert :
• [PROBLEME_PRINCIPAL]
• Absence de chatbot IA (perte de leads 24/7)
• Opportunités de conversion non exploitées

J'ai préparé un package complet incluant :
✅ Un prototype de site modernisé
✅ Un chatbot IA prêt à l'emploi
✅ Une stratégie de prospection automatisée

Seriez-vous disponible 15 minutes cette semaine pour en discuter ?

Cordialement,
[VOTRE NOM]

P.S. J'ai également préparé une courte vidéo personnalisée qui vous montre exactement ce que je propose.`,
      timing: 'J+0'
    },
    {
      name: 'Relance',
      subject: `[Rappel] Votre audit de site web - [ENTREPRISE]`,
      body: `Bonjour [NOM],

Je voulais m'assurer que vous aviez bien reçu mon email concernant l'analyse de [SITE].

Pour rappel, j'ai identifié des opportunités qui pourraient vous permettre de :
• Augmenter vos leads de 35%
• Automatiser votre service client
• Convertir plus de visiteurs en clients

Le package que j'ai préparé est prêt à être déployé.

Avez-vous 15 minutes cette semaine pour un appel rapide ?

Cordialement,
[VOTRE NOM]`,
      timing: 'J+3'
    },
    {
      name: 'Dernière Chance',
      subject: `Dernière chance - [ENTREPRISE]`,
      body: `Bonjour [NOM],

C'est mon dernier message concernant l'audit de [SITE].

Je comprends que vous êtes occupé(e), mais je voulais vous faire savoir que l'offre que j'ai préparée inclut :

🎁 Audit complet (valeur 500€)
🎁 Prototype HTML personnalisé
🎁 Chatbot IA configuré
🎁 3 templates d'emails

Si le timing n'est pas bon actuellement, pas de souci ! Gardez simplement mon contact pour plus tard.

Excellente journée !

[VOTRE NOM]`,
      timing: 'J+7'
    }
  ];
}

module.exports = {
  generateAllContent,
  generateHTMLCode,
  generateSystemPrompt,
  generateBrandKitPrompt,
  generateLoomScript,
  generateEmailTemplates
};
