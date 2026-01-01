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
  const prompt = `Tu es un expert en création de system prompts pour agents vocaux IA de niveau mondial. Crée un system prompt COMPLET et ULTRA-PERFORMANT pour un agent vocal IA représentant ${companyName} (${url}).

CONTEXTE BUSINESS:
- Industrie: ${scrapedData.industry || 'Non détecté'}
- Score site actuel: ${scrapedData.score}/100
- Problèmes détectés: ${scrapedData.issues.join(', ') || 'Aucun'}
- URL: ${url}

OBJECTIFS DE L'AGENT VOCAL:
1. **Qualification de prospects**: Identifier les leads qualifiés avec questions stratégiques
2. **Prise de rendez-vous**: Convertir naturellement vers un appel de consultation
3. **Représentation d'expertise**: Refléter le professionnalisme et l'expertise de ${companyName}
4. **Expérience naturelle**: Sonner comme un humain parfait (pas robotique)
5. **Gestion d'objections**: Répondre aux objections courantes avec confiance et empathie

FRAMEWORK DE PROMPT À SUIVRE (structure experte):

## Identité & Rôle
- Définir clairement qui est l'agent, son rôle, sa mission
- Ton de voix (professionnel mais chaleureux, consultatif)
- Valeurs et personnalité

## Contexte Business
- Expertise de ${companyName}
- Services offerts
- Proposition de valeur unique
- Différenciateurs clés

## Directives Conversationnelles
- Comment démarrer la conversation (salutation personnalisée)
- Questions de qualification (ouvertes, SPIN selling)
- Gestion des différents types de prospects
- Techniques de découverte des besoins
- Stratégies de closing vers rendez-vous

## Gestion des Objections
- "C'est trop cher" → réponse type
- "Je dois réfléchir" → réponse type
- "Je n'ai pas le temps" → réponse type
- Autres objections courantes dans ${scrapedData.industry}

## Guardrails & Limites
- Ce que l'agent PEUT faire
- Ce que l'agent NE PEUT PAS faire
- Comment rediriger si hors contexte
- Gestion des urgences ou demandes sensibles

## Style de Réponse
- Longueur des réponses (concises pour du vocal)
- Utilisation d'exemples concrets
- Empathie et écoute active
- Langage naturel (éviter le jargon excessif)

## Call-to-Action Principal
- Objectif: prendre rendez-vous pour appel de consultation
- Alternatives si prospect pas prêt (newsletter, ressources gratuites)

EXIGENCES CRITIQUES:
✅ Prompt en MARKDOWN complet (avec sections ##, sous-sections ###, bullet points)
✅ Détaillé et actionable (1500-2000 mots minimum)
✅ Exemples concrets de réponses types
✅ Ton consultatif et expert (pas de fluff marketing)
✅ Focus ROI et résultats mesurables
✅ Adapté spécifiquement à l'industrie ${scrapedData.industry}

**Génère maintenant le system prompt complet en Markdown:**`;

  const response = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.8,
    max_tokens: 3000 // Augmenté pour un prompt complet
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
