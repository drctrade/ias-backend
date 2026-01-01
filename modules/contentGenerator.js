// ================================
// MODULE CONTENT GENERATOR - Génération de contenu AI
// ================================

const OpenAI = require('openai');

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

async function generateAllContent(companyName, url, scrapedData) {
  console.log('[CONTENT] Génération du contenu AI avec GPT-4...');

  try {
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
    throw error;
  }
}

async function generateSystemPrompt(companyName, url, scrapedData) {
  const prompt = `Crée un system prompt professionnel pour un chatbot IA représentant ${companyName} (${url}).

INFORMATIONS DU SITE:
- Industrie: ${scrapedData.industry || 'Non détecté'}
- Score actuel: ${scrapedData.score}/100
- Problèmes détectés: ${scrapedData.issues.join(', ')}

Le chatbot doit:
1. Refléter l'expertise de ${companyName}
2. Qualifier les prospects intelligemment
3. Proposer des rendez-vous de manière naturelle
4. Être professionnel mais chaleureux

Format: Texte direct, sans balises markdown.`;

  const response = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.7,
    max_tokens: 500
  });

  return response.choices[0].message.content.trim();
}

async function generateBrandKitPrompt(companyName, scrapedData) {
  const colors = scrapedData.colors || [];
  const prompt = `Crée un brief de brand kit professionnel pour ${companyName}.

ÉLÉMENTS DÉTECTÉS:
- Couleurs principales: ${colors.slice(0, 3).join(', ') || 'Non détectées'}
- Industrie: ${scrapedData.industry || 'Non détectée'}
- Logo: ${scrapedData.logoUrl || 'Non trouvé'}

Inclus:
1. Palette de couleurs (codes hex)
2. Typographie recommandée
3. Style visuel (moderne/classique/minimaliste)
4. Guidelines d'usage

Format: Texte structuré avec sections claires.`;

  const response = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.7,
    max_tokens: 600
  });

  return response.choices[0].message.content.trim();
}

async function generateLoomScript(companyName, url, scrapedData) {
  const issues = scrapedData.issues || [];
  const prompt = `Crée un script Loom vidéo professionnel (2 minutes) pour présenter un package d'upgrade à ${companyName}.

INFORMATIONS:
- Site: ${url}
- Score actuel: ${scrapedData.score}/100
- Problèmes: ${issues.join(', ')}
- Industrie: ${scrapedData.industry}

STRUCTURE:
1. INTRO (0:00-0:15): Accroche personnalisée
2. PROBLÈMES (0:15-1:00): Détails spécifiques des ${issues.length} problèmes
3. SOLUTION (1:00-1:45): Package complet (design, chatbot, optimisations)
4. CLOSING (1:45-2:00): Call-to-action pour un appel

Ton: Consultative, expert, orienté ROI.
Format: Script avec timestamps.`;

  const response = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.8,
    max_tokens: 800
  });

  return response.choices[0].message.content.trim();
}

async function generateEmailTemplates(companyName, url, scrapedData) {
  const issues = scrapedData.issues || [];
  const score = scrapedData.score || 0;
  
  const prompt = `Crée 3 emails de prospection B2B ultra-personnalisés pour ${companyName}.

CONTEXTE:
- Site: ${url}
- Score audit: ${score}/100
- Problèmes spécifiques: ${issues.join(', ')}
- Industrie: ${scrapedData.industry}

EMAIL 1 (INITIAL):
- Subject line percutant
- Mention de 2-3 problèmes spécifiques détectés
- Proposition de valeur claire (audit + prototype + chatbot)
- CTA: appel 15 min

EMAIL 2 (FOLLOW-UP J+3):
- Subject: rappel subtil
- Ajout d'un insight ou stat pertinente
- Réaffirmation de la valeur
- CTA: disponibilités

EMAIL 3 (CLOSING J+7):
- Subject: dernier rappel non-insistant
- Ton respectueux
- Porte ouverte pour futur
- CTA soft

Format JSON:
[
  {
    "subject": "...",
    "from": "Darly <darly@intelliaiscale.com>",
    "body": "..."
  }
]

Ton: Professionnel, consultatif, personnalisé, orienté ROI.`;

  const response = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.8,
    max_tokens: 1200,
    response_format: { type: "json_object" }
  });

  const result = JSON.parse(response.choices[0].message.content);
  return result.emails || [];
}

module.exports = { generateAllContent };
