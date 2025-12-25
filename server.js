// ================================
// IAS BACKEND SERVER
// Scraping & Package Generation
// ================================

const express = require('express');
const cors = require('cors');
const puppeteer = require('puppeteer');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Supabase Client
const supabase = createClient(
    process.env.SUPABASE_URL || 'https://abuvnijldapnuiwumxtv.supabase.co',
    process.env.SUPABASE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFidXZuaWpsZGFwbnVpd3VteHR2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY1Njc1NzksImV4cCI6MjA4MjE0MzU3OX0.p_6bCgF1oofxhxNvnDlXpz2dq340XsRPFzOTqwgTN_k'
);

// ================================
// ROUTE DE TEST
// ================================
app.get('/', (req, res) => {
    res.json({
        status: 'OK',
        message: 'IAS Backend API v1.0',
        endpoints: {
            health: 'GET /',
            scrapeWebsite: 'POST /api/scrape/website',
            scrapeLinkedIn: 'POST /api/scrape/linkedin',
            scrapeGoogleMaps: 'POST /api/scrape/google-maps',
            generatePackage: 'POST /api/generate/package',
            getProspects: 'GET /api/prospects'
        }
    });
});

// ================================
// ENDPOINT: SCRAPER UN SITE WEB
// ================================
app.post('/api/scrape/website', async (req, res) => {
    const { url } = req.body;
    
    if (!url) {
        return res.status(400).json({ error: 'URL manquante' });
    }
    
    try {
        console.log(`[SCRAPING] Analyse de ${url}...`);
        
        // Lancer Puppeteer
        const browser = await puppeteer.launch({
            headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });
        
        const page = await browser.newPage();
        await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
        
        // Extraire les données
        const data = await page.evaluate(() => {
            // Titre
            const title = document.title;
            
            // Méta description
            const metaDesc = document.querySelector('meta[name="description"]')?.content || '';
            
            // Couleurs dominantes (simpliste)
            const styles = window.getComputedStyle(document.body);
            const bgColor = styles.backgroundColor;
            const textColor = styles.color;
            
            // Nombre d'images
            const imageCount = document.querySelectorAll('img').length;
            
            // Présence chatbot
            const hasChatbot = document.querySelector('[class*="chat"]') || 
                               document.querySelector('[id*="chat"]') || 
                               document.querySelector('iframe[src*="chat"]');
            
            // Responsive
            const viewport = document.querySelector('meta[name="viewport"]');
            const isResponsive = viewport && viewport.content.includes('width=device-width');
            
            return {
                title,
                metaDesc,
                colors: { bgColor, textColor },
                imageCount,
                hasChatbot: !!hasChatbot,
                isResponsive
            };
        });
        
        await browser.close();
        
        // Identifier les problèmes
        const issues = [];
        if (!data.isResponsive) issues.push('Site non-responsive');
        if (!data.hasChatbot) issues.push('Pas de chatbot IA');
        if (data.imageCount < 3) issues.push('Peu d\'images (faible engagement visuel)');
        if (!data.metaDesc) issues.push('Pas de méta description (mauvais SEO)');
        
        // Calculer un score
        let score = 50;
        if (data.isResponsive) score += 15;
        if (data.hasChatbot) score += 20;
        if (data.imageCount >= 5) score += 10;
        if (data.metaDesc) score += 5;
        
        const result = {
            url,
            ...data,
            issues,
            score,
            scrapedAt: new Date().toISOString()
        };
        
        console.log(`[SCRAPING] Terminé ! Score: ${score}/100`);
        
        res.json(result);
        
    } catch (error) {
        console.error('[SCRAPING] Erreur:', error);
        res.status(500).json({ 
            error: 'Erreur lors du scraping',
            details: error.message 
        });
    }
});

// ================================
// ENDPOINT: GÉNÉRER UN PACKAGE COMPLET
// ================================
app.post('/api/generate/package', async (req, res) => {
    const { url, prospectId } = req.body;
    
    if (!url) {
        return res.status(400).json({ error: 'URL manquante' });
    }
    
    try {
        console.log(`[PACKAGE] Génération pour ${url}...`);
        
        // 1. Scraper le site
        const scrapeData = await fetch(`http://localhost:${PORT}/api/scrape/website`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url })
        }).then(r => r.json());
        
        // 2. Générer les livrables
        const htmlCode = generateHTMLCode(scrapeData);
        const aiPrompt = generateAIPrompt(scrapeData);
        const loomScript = generateLoomScript(scrapeData);
        const emailTemplates = generateEmailTemplates(scrapeData);
        const pomelliBrandKit = generatePomelliBrandKit(scrapeData);
        
        // 3. Créer le package dans Supabase
        const { data: packageData, error } = await supabase
            .from('packages')
            .insert([{
                prospect_id: prospectId || null,
                target_website_url: url,
                status: 'completed',
                html_code: htmlCode,
                ai_system_prompt: aiPrompt,
                loom_script: loomScript,
                email_templates: emailTemplates,
                pomelli_brand_kit: pomelliBrandKit,
                color_palette: scrapeData.colors,
                lead_leakages: scrapeData.issues,
                audit_summary: `Score global: ${scrapeData.score}/100`,
                generation_completed_at: new Date().toISOString()
            }])
            .select()
            .single();
        
        if (error) throw error;
        
        console.log(`[PACKAGE] Créé avec succès ! ID: ${packageData.id}`);
        
        res.json({
            success: true,
            packageId: packageData.id,
            package: packageData
        });
        
    } catch (error) {
        console.error('[PACKAGE] Erreur:', error);
        res.status(500).json({ 
            error: 'Erreur lors de la génération',
            details: error.message 
        });
    }
});

// ================================
// ENDPOINT: RÉCUPÉRER LES PROSPECTS
// ================================
app.get('/api/prospects', async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('prospects')
            .select('*')
            .order('created_at', { ascending: false });
        
        if (error) throw error;
        
        res.json({ prospects: data });
    } catch (error) {
        console.error('[PROSPECTS] Erreur:', error);
        res.status(500).json({ error: error.message });
    }
});

// ================================
// FONCTIONS DE GÉNÉRATION
// ================================

function generateHTMLCode(scrapeData) {
    return `<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${scrapeData.title}</title>
    <script src="https://cdn.tailwindcss.com"></script>
</head>
<body style="background: ${scrapeData.colors.bgColor}; color: ${scrapeData.colors.textColor}">
    <div class="container mx-auto p-8">
        <h1 class="text-4xl font-bold mb-4">${scrapeData.title}</h1>
        <p class="text-lg">${scrapeData.metaDesc}</p>
        
        <!-- Chatbot IA intégré -->
        <div class="fixed bottom-4 right-4">
            <button class="bg-blue-500 text-white px-6 py-3 rounded-full shadow-lg">
                💬 Besoin d'aide ?
            </button>
        </div>
    </div>
</body>
</html>`;
}

function generateAIPrompt(scrapeData) {
    return `Tu es l'assistant virtuel de ${scrapeData.title}.

PERSONNALITÉ:
- Professionnel et chaleureux
- Expert dans le domaine
- Réponse rapide (<3 secondes)

MISSION:
- Qualifier les visiteurs
- Répondre aux questions
- Proposer des rendez-vous

INFOS IMPORTANTES:
- Site web: ${scrapeData.url}
- Description: ${scrapeData.metaDesc}

FLUX DE CONVERSATION:
1. Accueil chaleureux
2. Qualification du besoin
3. Recommandation personnalisée
4. Gestion des objections
5. Prise de rendez-vous`;
}

function generateLoomScript(scrapeData) {
    return `SCRIPT VIDÉO LOOM - ${scrapeData.title}

INTRO (30 secondes):
"Bonjour, j'ai analysé votre site ${scrapeData.url} et j'ai trouvé plusieurs opportunités d'amélioration..."

PROBLÈMES IDENTIFIÉS (1.5 minutes):
${scrapeData.issues.map((issue, i) => `${i+1}. ${issue}`).join('\n')}

Score actuel: ${scrapeData.score}/100

SOLUTION (2 minutes):
"Voici ce que nous proposons pour transformer votre site en machine de conversion..."

CLÔTURE (30 secondes):
"Réservez 15 minutes avec moi pour en discuter: [LIEN CALENDLY]"`;
}

function generateEmailTemplates(scrapeData) {
    return [
        {
            subject: `[PRÉNOM], j'ai analysé ${scrapeData.title}`,
            body: `Bonjour [PRÉNOM],\n\nJ'ai remarqué quelques opportunités sur votre site...\n\nScore actuel: ${scrapeData.score}/100\n\nProblèmes: ${scrapeData.issues.join(', ')}\n\nJe peux vous aider à corriger ça. Intéressé ?\n\nCordialement`
        },
        {
            subject: `📹 Package complet pour ${scrapeData.title}`,
            body: `Bonjour [PRÉNOM],\n\nJ'ai préparé un package complet avec:\n- Audit détaillé\n- Nouveau design\n- Chatbot IA\n\nVidéo: [LIEN LOOM]\n\nQu'en pensez-vous ?`
        },
        {
            subject: `Dernière chance - ${scrapeData.title}`,
            body: `Bonjour [PRÉNOM],\n\nJe n'ai pas eu de retour...\n\nVotre site perd actuellement des leads.\n\nRéponse rapide ?`
        }
    ];
}

function generatePomelliBrandKit(scrapeData) {
    return `Créez un Brand Kit pour ${scrapeData.title}

PALETTE DE COULEURS:
- Primaire: ${scrapeData.colors.bgColor}
- Texte: ${scrapeData.colors.textColor}

ASSETS À CRÉER:
- 5 variations de logo
- 10 templates réseaux sociaux
- Signatures email
- Bannières web

STYLE:
Moderne, professionnel, inspiré de l'identité actuelle mais plus impactant.`;
}

// ================================
// DÉMARRAGE DU SERVEUR
// ================================
app.listen(PORT, () => {
    console.log(`
╔════════════════════════════════════════╗
║   IAS BACKEND API                      ║
║   Serveur démarré sur le port ${PORT}   ║
║                                        ║
║   http://localhost:${PORT}             ║
╚════════════════════════════════════════╝
    `);
});