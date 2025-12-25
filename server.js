// ================================
// IAS BACKEND SERVER V2.0
// Système Complet de Scraping & Automation
// ================================

const express = require('express');
const cors = require('cors');
const puppeteer = require('puppeteer');
const { createClient } = require('@supabase/supabase-js');
const sgMail = require('@sendgrid/mail');
const axios = require('axios');
const cheerio = require('cheerio');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Supabase Client
const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_KEY
);

// SendGrid Configuration
if (process.env.SENDGRID_API_KEY) {
    sgMail.setApiKey(process.env.SENDGRID_API_KEY);
}

// ================================
// PUPPETEER CONFIGURATION
// ================================
const PUPPETEER_CONFIG = {
    headless: true,
    args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--disable-gpu',
        '--disable-blink-features=AutomationControlled'
    ],
    executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || undefined
};

// ================================
// ROUTE DE TEST
// ================================
app.get('/', (req, res) => {
    res.json({
        status: 'OK',
        version: '2.0',
        message: 'IAS Backend API - Système Complet',
        endpoints: {
            health: 'GET /',
            scrapeWebsite: 'POST /api/scrape/website',
            scrapeLinkedIn: 'POST /api/scrape/linkedin',
            scrapeGoogleMaps: 'POST /api/scrape/google-maps',
            generatePackage: 'POST /api/generate/package',
            generatePDF: 'POST /api/generate/pdf',
            sendEmail: 'POST /api/email/send',
            enrichProspect: 'POST /api/enrich/prospect',
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
        
        const browser = await puppeteer.launch(PUPPETEER_CONFIG);
        const page = await browser.newPage();
        
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');
        await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
        
        const data = await page.evaluate(() => {
            const title = document.title;
            const metaDesc = document.querySelector('meta[name="description"]')?.content || '';
            const styles = window.getComputedStyle(document.body);
            const bgColor = styles.backgroundColor;
            const textColor = styles.color;
            const imageCount = document.querySelectorAll('img').length;
            const hasChatbot = !!(document.querySelector('[class*="chat"]') || 
                               document.querySelector('[id*="chat"]') || 
                               document.querySelector('iframe[src*="chat"]'));
            const viewport = document.querySelector('meta[name="viewport"]');
            const isResponsive = viewport && viewport.content.includes('width=device-width');
            
            return {
                title,
                metaDesc,
                colors: { bgColor, textColor },
                imageCount,
                hasChatbot,
                isResponsive
            };
        });
        
        await browser.close();
        
        const issues = [];
        if (!data.isResponsive) issues.push('Site non-responsive');
        if (!data.hasChatbot) issues.push('Pas de chatbot IA');
        if (data.imageCount < 3) issues.push('Peu d\'images');
        if (!data.metaDesc) issues.push('Pas de méta description');
        
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
// ENDPOINT: SCRAPER LINKEDIN
// ================================
app.post('/api/scrape/linkedin', async (req, res) => {
    const { searchQuery, limit = 10 } = req.body;
    
    if (!searchQuery) {
        return res.status(400).json({ error: 'searchQuery manquant' });
    }
    
    if (!process.env.LINKEDIN_EMAIL || !process.env.LINKEDIN_PASSWORD) {
        return res.status(400).json({ 
            error: 'Identifiants LinkedIn manquants',
            message: 'Configurez LINKEDIN_EMAIL et LINKEDIN_PASSWORD dans les variables d\'environnement'
        });
    }
    
    try {
        console.log(`[LINKEDIN] Recherche: ${searchQuery}`);
        
        const browser = await puppeteer.launch(PUPPETEER_CONFIG);
        const page = await browser.newPage();
        
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');
        
        // Connexion LinkedIn
        await page.goto('https://www.linkedin.com/login', { waitUntil: 'networkidle2' });
        await page.type('#username', process.env.LINKEDIN_EMAIL);
        await page.type('#password', process.env.LINKEDIN_PASSWORD);
        await page.click('button[type="submit"]');
        await page.waitForNavigation({ waitUntil: 'networkidle2' });
        
        // Recherche
        const searchUrl = `https://www.linkedin.com/search/results/people/?keywords=${encodeURIComponent(searchQuery)}`;
        await page.goto(searchUrl, { waitUntil: 'networkidle2' });
        
        // Attendre les résultats
        await page.waitForSelector('.entity-result', { timeout: 10000 });
        
        // Extraire les profils
        const profiles = await page.evaluate((maxResults) => {
            const results = Array.from(document.querySelectorAll('.entity-result'));
            return results.slice(0, maxResults).map(el => {
                const nameEl = el.querySelector('.entity-result__title-text a');
                const titleEl = el.querySelector('.entity-result__primary-subtitle');
                const locationEl = el.querySelector('.entity-result__secondary-subtitle');
                const profileUrl = nameEl?.href || '';
                
                return {
                    full_name: nameEl?.innerText.trim() || '',
                    job_title: titleEl?.innerText.trim() || '',
                    city: locationEl?.innerText.trim().split(',')[0] || '',
                    country: locationEl?.innerText.trim().split(',')[1]?.trim() || '',
                    linkedin_url: profileUrl,
                    source: 'linkedin',
                    status: 'new',
                    lead_score: 70
                };
            });
        }, limit);
        
        await browser.close();
        
        // Sauvegarder dans Supabase
        if (profiles.length > 0) {
            const { data, error } = await supabase
                .from('prospects')
                .insert(profiles)
                .select();
            
            if (error) throw error;
            
            console.log(`[LINKEDIN] ${profiles.length} prospects ajoutés`);
            return res.json({ success: true, prospects: data, count: data.length });
        }
        
        res.json({ success: true, prospects: [], count: 0, message: 'Aucun résultat' });
        
    } catch (error) {
        console.error('[LINKEDIN] Erreur:', error);
        res.status(500).json({ 
            error: 'Erreur scraping LinkedIn',
            details: error.message 
        });
    }
});

// ================================
// ENDPOINT: SCRAPER GOOGLE MAPS
// ================================
app.post('/api/scrape/google-maps', async (req, res) => {
    const { searchQuery, location = 'Montreal, QC', limit = 10 } = req.body;
    
    if (!searchQuery) {
        return res.status(400).json({ error: 'searchQuery manquant' });
    }
    
    try {
        console.log(`[GOOGLE MAPS] Recherche: ${searchQuery} in ${location}`);
        
        const browser = await puppeteer.launch(PUPPETEER_CONFIG);
        const page = await browser.newPage();
        
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');
        
        const searchUrl = `https://www.google.com/maps/search/${encodeURIComponent(searchQuery + ' ' + location)}`;
        await page.goto(searchUrl, { waitUntil: 'networkidle2' });
        
        await page.waitForTimeout(3000);
        
        // Scroll pour charger plus de résultats
        await page.evaluate(() => {
            const scrollableDiv = document.querySelector('[role="feed"]');
            if (scrollableDiv) {
                scrollableDiv.scrollTop = scrollableDiv.scrollHeight;
            }
        });
        
        await page.waitForTimeout(2000);
        
        // Extraire les entreprises
        const businesses = await page.evaluate((maxResults) => {
            const results = Array.from(document.querySelectorAll('[role="feed"] > div'));
            return results.slice(0, maxResults).map(el => {
                const nameEl = el.querySelector('[class*="fontHeadlineSmall"]');
                const addressEl = el.querySelector('[class*="fontBodyMedium"]');
                const ratingEl = el.querySelector('[role="img"]');
                
                return {
                    company_name: nameEl?.innerText.trim() || '',
                    full_name: nameEl?.innerText.trim() || '',
                    city: location.split(',')[0].trim(),
                    country: 'Canada',
                    source: 'google_maps',
                    status: 'new',
                    lead_score: 65,
                    notes: addressEl?.innerText.trim() || ''
                };
            }).filter(b => b.company_name);
        }, limit);
        
        await browser.close();
        
        // Sauvegarder dans Supabase
        if (businesses.length > 0) {
            const { data, error } = await supabase
                .from('prospects')
                .insert(businesses)
                .select();
            
            if (error) throw error;
            
            console.log(`[GOOGLE MAPS] ${businesses.length} prospects ajoutés`);
            return res.json({ success: true, prospects: data, count: data.length });
        }
        
        res.json({ success: true, prospects: [], count: 0, message: 'Aucun résultat' });
        
    } catch (error) {
        console.error('[GOOGLE MAPS] Erreur:', error);
        res.status(500).json({ 
            error: 'Erreur scraping Google Maps',
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
        const scrapeResponse = await axios.post(`http://localhost:${PORT}/api/scrape/website`, { url });
        const scrapeData = scrapeResponse.data;
        
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
// ENDPOINT: GÉNÉRER UN PDF
// ================================
app.post('/api/generate/pdf', async (req, res) => {
    const { packageId } = req.body;
    
    if (!packageId) {
        return res.status(400).json({ error: 'packageId manquant' });
    }
    
    try {
        console.log(`[PDF] Génération pour package ${packageId}...`);
        
        // Récupérer le package depuis Supabase
        const { data: packageData, error } = await supabase
            .from('packages')
            .select('*')
            .eq('id', packageId)
            .single();
        
        if (error) throw error;
        
        // Créer le HTML pour le PDF
        const htmlContent = `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <style>
                    body { font-family: Arial, sans-serif; padding: 40px; }
                    h1 { color: #5bc236; }
                    .section { margin: 20px 0; padding: 20px; background: #f5f5f5; }
                </style>
            </head>
            <body>
                <h1>Rapport d'Audit - ${packageData.target_website_url}</h1>
                <div class="section">
                    <h2>Score Global</h2>
                    <p>${packageData.audit_summary}</p>
                </div>
                <div class="section">
                    <h2>Problèmes Identifiés</h2>
                    <ul>
                        ${packageData.lead_leakages.map(issue => `<li>${issue}</li>`).join('')}
                    </ul>
                </div>
                <div class="section">
                    <h2>Recommandations</h2>
                    <p>Voir le package complet pour les solutions détaillées.</p>
                </div>
            </body>
            </html>
        `;
        
        const browser = await puppeteer.launch(PUPPETEER_CONFIG);
        const page = await browser.newPage();
        await page.setContent(htmlContent);
        
        const pdfBuffer = await page.pdf({
            format: 'A4',
            printBackground: true,
            margin: { top: '20px', bottom: '20px', left: '20px', right: '20px' }
        });
        
        await browser.close();
        
        // Retourner le PDF
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename=audit-${packageId}.pdf`);
        res.send(pdfBuffer);
        
        console.log(`[PDF] Généré avec succès`);
        
    } catch (error) {
        console.error('[PDF] Erreur:', error);
        res.status(500).json({ 
            error: 'Erreur génération PDF',
            details: error.message 
        });
    }
});

// ================================
// ENDPOINT: ENVOYER UN EMAIL
// ================================
app.post('/api/email/send', async (req, res) => {
    const { to, subject, html, prospectId } = req.body;
    
    if (!to || !subject || !html) {
        return res.status(400).json({ error: 'Paramètres manquants (to, subject, html)' });
    }
    
    if (!process.env.SENDGRID_API_KEY) {
        return res.status(400).json({ 
            error: 'SendGrid non configuré',
            message: 'Ajoutez SENDGRID_API_KEY dans les variables d\'environnement'
        });
    }
    
    try {
        console.log(`[EMAIL] Envoi à ${to}...`);
        
        const msg = {
            to,
            from: 'hello@iasbranding.com', // Remplacez par votre email vérifié SendGrid
            subject,
            html
        };
        
        await sgMail.send(msg);
        
        // Enregistrer dans Supabase
        if (prospectId) {
            await supabase
                .from('email_campaigns')
                .insert([{
                    prospect_id: prospectId,
                    campaign_name: 'Manuel',
                    subject_line: subject,
                    email_template: html,
                    status: 'sent',
                    sent_at: new Date().toISOString()
                }]);
        }
        
        console.log(`[EMAIL] Envoyé avec succès`);
        res.json({ success: true, message: 'Email envoyé' });
        
    } catch (error) {
        console.error('[EMAIL] Erreur:', error);
        res.status(500).json({ 
            error: 'Erreur envoi email',
            details: error.message 
        });
    }
});

// ================================
// ENDPOINT: ENRICHIR UN PROSPECT (Apollo.io)
// ================================
app.post('/api/enrich/prospect', async (req, res) => {
    const { prospectId, company } = req.body;
    
    if (!prospectId || !company) {
        return res.status(400).json({ error: 'prospectId et company requis' });
    }
    
    if (!process.env.APOLLO_API_KEY) {
        return res.status(400).json({ 
            error: 'Apollo.io non configuré',
            message: 'Ajoutez APOLLO_API_KEY dans les variables d\'environnement'
        });
    }
    
    try {
        console.log(`[APOLLO] Enrichissement pour ${company}...`);
        
        // Appel API Apollo.io pour trouver l'email
        const response = await axios.post('https://api.apollo.io/v1/people/match', {
            organization_name: company
        }, {
            headers: {
                'X-Api-Key': process.env.APOLLO_API_KEY,
                'Content-Type': 'application/json'
            }
        });
        
        const enrichedData = response.data.person;
        
        // Mettre à jour le prospect dans Supabase
        const { data, error } = await supabase
            .from('prospects')
            .update({
                email: enrichedData.email || null,
                phone: enrichedData.phone_numbers?.[0] || null,
                linkedin_url: enrichedData.linkedin_url || null,
                job_title: enrichedData.title || null
            })
            .eq('id', prospectId)
            .select()
            .single();
        
        if (error) throw error;
        
        console.log(`[APOLLO] Enrichi avec succès`);
        res.json({ success: true, prospect: data });
        
    } catch (error) {
        console.error('[APOLLO] Erreur:', error);
        res.status(500).json({ 
            error: 'Erreur enrichissement',
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
║   IAS BACKEND API V2.0                 ║
║   Serveur démarré sur le port ${PORT}   ║
║                                        ║
║   http://localhost:${PORT}             ║
║                                        ║
║   FONCTIONNALITÉS:                     ║
║   ✅ Scraping Web                      ║
║   ✅ Scraping LinkedIn                 ║
║   ✅ Scraping Google Maps              ║
║   ✅ Génération PDF                    ║
║   ✅ Envoi Emails (SendGrid)           ║
║   ✅ Enrichissement (Apollo.io)        ║
╚════════════════════════════════════════╝
    `);
});
