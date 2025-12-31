// ================================
// MODULE CONTENT GENERATOR - Génération de contenu AI
// ================================

const OpenAI = require('openai');

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

async function generateAllContent(companyName, url, scrapedData) {
  console.log('[CONTENT] Génération du contenu AI...');

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
  return `Tu es l'assistant virtuel de ${companyName} (${url}).

Ton rôle:
- Répondre aux questions sur les services
- Qualifier les prospects
- Proposer des rendez-vous

Ton de communication:
- Professionnel et chaleureux
- Français impeccable
- Orienté solution`;
}

async function generateBrandKitPrompt(companyName, scrapedData) {
  const colors = scrapedData.colors || [];
  return `Brand Kit pour ${companyName}

Couleurs principales: ${colors.slice(0, 3).join(', ')}
Style: Moderne et professionnel
Logo: ${scrapedData.logoUrl || 'À définir'}`;
}

async function generateLoomScript(companyName, url, scrapedData) {
  const issues = scrapedData.issues || [];
  return `🎥 SCRIPT LOOM - ${companyName.toUpperCase()}

INTRO (0:00-0:15):
"Bonjour ! J'ai analysé ${url} et identifié ${issues.length} opportunités d'amélioration."

PROBLÈMES (0:15-1:00):
${issues.map((issue, i) => `${i + 1}. ${issue}`).join('\n')}

SOLUTION (1:00-1:45):
✅ Site moderne et responsive
✅ Chatbot IA 24/7
✅ Design optimisé conversion

CLOSING (1:45-2:00):
"Package complet prêt. On en discute cette semaine ?"`;
}

async function generateEmailTemplates(companyName, url, scrapedData) {
  return [
    {
      subject: `IntelliAIScale - Opportunité pour ${companyName}`,
      from: "Darly <darly@intelliaiscale.com>",
      body: `Bonjour,

Je suis Darly d'IntelliAIScale. J'ai analysé ${url} et identifié des opportunités d'amélioration.

J'ai préparé pour vous :
✅ Audit complet
✅ Prototype HTML modernisé
✅ Chatbot IA clé-en-main

Disponible pour un appel de 15 min cette semaine ?

Cordialement,
Darly
IntelliAIScale`
    },
    {
      subject: `[Rappel] Package pour ${companyName}`,
      from: "Darly <darly@intelliaiscale.com>",
      body: `Bonjour,

Je voulais m'assurer que vous aviez reçu mon email concernant ${url}.

Le package inclut un design moderne, chatbot IA et prospection automatisée.

Meilleur moment pour échanger ?

Cordialement,
Darly`
    },
    {
      subject: `Dernier rappel - ${companyName}`,
      from: "Darly <darly@intelliaiscale.com>",
      body: `Bonjour,

Dernier message concernant le package pour ${url}.

Si le timing n'est pas bon, pas de souci !

Excellente journée,
Darly`
    }
  ];
}

module.exports = { generateAllContent };
