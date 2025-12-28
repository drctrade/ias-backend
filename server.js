// ==========================================
// IAS BACKEND SERVER v3.7.1 ULTIMATE
// Robust Connection + Apify + Supabase + Anti-Timeout
// ==========================================

const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const { chromium } = require('playwright');
const { createClient } = require('@supabase/supabase-js');
const { ApifyClient } = require('apify-client');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Configuration des services
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);
const apifyClient = new ApifyClient({ token: process.env.APIFY_TOKEN });

// Middleware
app.use(cors());
app.use(bodyParser.json());

// Helper pour les logs Render (force l'affichage immédiat)
const iasLog = (tag, message) => {
    const timestamp = new Date().toLocaleTimeString();
    console.log(`[${timestamp}] [${tag}] ${message}`);
};

// ==========================================
// MOTEUR PROSPECTION (APIFY)
// ==========================================

async function runApifyScraper(query, city) {
    iasLog('APIFY', `Démarrage de la recherche pour "${query}" à ${city}...`);
    try {
        const run = await apifyClient.actor("apify/google-maps-scraper").call({
            queries: [`${query} in ${city}`],
            maxResults: 20,
            language: "fr",
        });
        const { items } = await apifyClient.dataset(run.defaultDatasetId).listItems();
        iasLog('APIFY', `${items.length} prospects extraits avec succès.`);
        return items.map(item => ({
            company_name: item.title || "Inconnu",
            website_url: item.website || "",
            contact_phone: item.phone || "",
            address: item.address || "",
            status: 'pending',
            score: 0
        }));
    } catch (e) {
        iasLog('APIFY-ERROR', e.message);
        return [];
    }
}

// ==========================================
// ANALYSE DE SITE (BROWSERLESS)
// ==========================================

async function analyzeSite(page) {
    iasLog('PLAYWRIGHT', 'Exécution de l\'analyse DOM approfondie...');
    return await page.evaluate(() => {
        const getColors = () => {
            const colors = new Set();
            try {
                const elements = Array.from(document.querySelectorAll('*')).slice(0, 150);
                elements.forEach(el => {
                    const style = window.getComputedStyle(el);
                    const bg = style.backgroundColor;
                    if (bg && bg !== 'rgba(0, 0, 0, 0)' && bg !== 'transparent') {
                        colors.add(bg);
                    }
                });
            } catch (e) {}
            return Array.from(colors).slice(0, 5);
        };

        const issues = [];
        // Lead Leakage Check
        if (!document.querySelector('iframe[src*="chat"], [class*="chat"], [id*="chat"], [class*="widget"]')) {
            issues.push("Absence d'agent conversationnel IA 24/7 (Perte de conversion)");
        }
        if (!document.querySelector('form, input[type="email"]')) {
            issues.push("Manque de formulaire de capture direct (Lead Leakage)");
        }
        if (!document.querySelector('meta[name="viewport"]')) {
            issues.push("Site non optimisé pour mobile (Pénalité Google)");
        }
        if (document.title.length < 10) {
            issues.push("SEO Faible : Titre de page non optimisé pour les moteurs de recherche");
        }

        return { 
            colors: getColors(), 
            issues: issues.length > 0 ? issues : ["Optimisation mineure de l'engagement requise"], 
            title: document.title 
        };
    });
}

// ==========================================
// ROUTES API
// ==========================================

app.get('/', (req, res) => res.send('IAS PRO v3.7.1 ULTIMATE ONLINE'));

// 1. PROSPECTION (APIFY)
app.post('/api/scrape/launch', async (req, res) => {
    const { query, city } = req.body;
    iasLog('API', `Requête de prospection reçue: ${query}`);
    
    res.json({ success: true, message: "Le moteur Apify a démarré la prospection." });

    try {
        const prospects = await runApifyScraper(query, city);
        for (const p of prospects) {
            await supabase.from('prospects').upsert([p], { onConflict: 'company_name' });
        }
        iasLog('DATABASE', 'Prospects mis à jour dans Supabase.');
    } catch (err) {
        iasLog('ERROR', err.message);
    }
});

// 2. UPGRADE (BROWSERLESS)
app.post('/api/generate/package', async (req, res) => {
    const { url, companyName } = req.body;
    iasLog('UPGRADE', `Lancement de l'upgrade pour ${companyName} (${url})`);

    let browser;
    let retryCount = 0;
    const maxRetries = 2;
    const wsEndpoint = `wss://chrome.browserless.io?token=${process.env.BROWSERLESS_TOKEN}`;

    const connectWithRetry = async () => {
        try {
            iasLog('UPGRADE', `Tentative de connexion #${retryCount + 1} à Browserless...`);
            return await chromium.connect(wsEndpoint, { timeout: 60000 }); 
        } catch (err) {
            if (retryCount < maxRetries) {
                retryCount++;
                iasLog('UPGRADE', `Échec connexion. Nouvelle tentative dans 3s...`);
                await new Promise(r => setTimeout(r, 3000));
                return await connectWithRetry();
            }
            throw err;
        }
    };

    try {
        browser = await connectWithRetry();
        iasLog('UPGRADE', '✅ Connexion établie avec succès.');

        const page = await browser.newPage();
        iasLog('UPGRADE', `Navigation vers ${url}...`);
        
        await page.goto(url, { waitUntil: 'load', timeout: 70000 });
        await page.waitForTimeout(4000); 
        
        iasLog('UPGRADE', 'Page chargée. Démarrage de l\'audit Stealth.');

        const audit = await analyzeSite(page);
        const score = Math.max(100 - (audit.issues.length * 15), 30);

        iasLog('UPGRADE', `Analyse terminée. Score calculé: ${score}/100`);

        const packageData = {
            target_website_url: url,
            company_name: companyName,
            lead_leakages: audit.issues,
            color_palette: audit.colors,
            score: score,
            loom_script: `Hey ${companyName}, j'ai pris la liberté d'analyser votre site web...\n\nPoints critiques identifiés :\n${audit.issues.join('\n')}\n\nJ'ai construit une version optimisée pour vous, incluant un agent IA capable de capturer vos leads 24h/24.`,
            ai_system_prompt: `Tu es l'Expert de Croissance de ${companyName}. Ton but unique est de convertir les visiteurs de ${url} en rendez-vous confirmés. Ton ton est professionnel, premium et direct. Ne laisse jamais un visiteur partir sans avoir collecté son besoin.`,
            status: 'completed'
        };

        const { data, error } = await supabase.from('packages').insert([packageData]).select();
        if (error) throw error;

        await supabase.from('prospects').update({ score: score }).eq('company_name', companyName);

        iasLog('UPGRADE', '✅ Package complet sauvegardé dans Supabase.');
        res.json({ success: true, package: data[0] });

    } catch (err) {
        iasLog('CRITICAL-ERROR', `Échec de l'upgrade: ${err.message}`);
        res.status(500).json({ error: "Erreur lors de la génération du package: " + err.message });
    } finally {
        if (browser) {
            await browser.close();
            iasLog('UPGRADE', 'Session de navigation fermée proprement.');
        }
    }
});

// 3. RECUPÉRATION PROSPECTS
app.get('/api/prospects', async (req, res) => {
    try {
        const { data, error } = await supabase.from('prospects').select('*').order('created_at', { ascending: false });
        if (error) throw error;
        res.json(data || []);
    } catch (err) {
        iasLog('DATABASE-ERROR', err.message);
        res.status(500).json({ error: "Impossible de charger les prospects." });
    }
});

app.listen(PORT, () => {
    iasLog('SYSTEM', `IAS Engine Pro v3.7.1 ULTIMATE démarré sur le port ${PORT}`);
});
