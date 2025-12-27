// ==========================================
// IAS BACKEND SERVER v3.6 PRO - STEALTH ENGINE
// Browserless + Apify + Supabase + Ultra-Logging
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
    iasLog('PLAYWRIGHT', 'Exécution de l\'analyse DOM...');
    return await page.evaluate(() => {
        const getColors = () => {
            const colors = new Set();
            const elements = Array.from(document.querySelectorAll('*')).slice(0, 100);
            elements.forEach(el => {
                const style = window.getComputedStyle(el);
                if (style.backgroundColor && !style.backgroundColor.includes('rgba(0, 0, 0, 0)')) colors.add(style.backgroundColor);
            });
            return Array.from(colors).slice(0, 5);
        };
        const issues = [];
        if (!document.querySelector('iframe[src*="chat"], [class*="chat"]')) issues.push("Aucun agent conversationnel détecté.");
        if (!document.querySelector('form')) issues.push("Pas de formulaire de capture direct.");
        return { colors: getColors(), issues, title: document.title };
    });
}

// ==========================================
// ROUTES API
// ==========================================

app.get('/', (req, res) => res.send('IAS PRO v3.6 ONLINE'));

// 1. PROSPECTION (APIFY)
app.post('/api/scrape/launch', async (req, res) => {
    const { query, city } = req.body;
    iasLog('API', `Requête de prospection reçue: ${query}`);
    
    res.json({ success: true, message: "Le moteur Apify est en route." });

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
    try {
        const wsEndpoint = `wss://production-sfo.browserless.io?token=${process.env.BROWSERLESS_TOKEN}`;
        iasLog('UPGRADE', 'Tentative de connexion à Browserless...');
        
        // Timeout de connexion de 30 secondes
        browser = await chromium.connect(wsEndpoint, { timeout: 30000 });
        iasLog('UPGRADE', '✅ Connexion établie avec Browserless.');

        const page = await browser.newPage();
        iasLog('UPGRADE', `Navigation vers ${url}...`);
        
        await page.goto(url, { waitUntil: 'networkidle', timeout: 60000 });
        iasLog('UPGRADE', 'Page chargée. Démarrage de l\'audit.');

        const audit = await analyzeSite(page);
        const score = Math.max(100 - (audit.issues.length * 20), 30);

        iasLog('UPGRADE', `Analyse terminée. Score: ${score}/100`);

        const packageData = {
            target_website_url: url,
            company_name: companyName,
            lead_leakages: audit.issues,
            color_palette: audit.colors,
            score: score,
            loom_script: `Hey ${companyName}, j'ai vu votre site...`,
            ai_system_prompt: `Tu es l'agent expert de ${companyName}.`,
            status: 'completed'
        };

        const { data, error } = await supabase.from('packages').insert([packageData]).select();
        if (error) throw error;

        // Sync score prospect
        await supabase.from('prospects').update({ score: score }).eq('company_name', companyName);

        iasLog('UPGRADE', '✅ Package sauvegardé avec succès.');
        res.json({ success: true, package: data[0] });

    } catch (err) {
        iasLog('CRITICAL-ERROR', err.message);
        res.status(500).json({ error: "Erreur critique : " + err.message });
    } finally {
        if (browser) {
            await browser.close();
            iasLog('UPGRADE', 'Session navigateur fermée.');
        }
    }
});

// 3. RECUPÉRATION PROSPECTS
app.get('/api/prospects', async (req, res) => {
    const { data } = await supabase.from('prospects').select('*').order('created_at', { ascending: false });
    res.json(data || []);
});

app.listen(PORT, () => {
    iasLog('SYSTEM', `IAS Engine Pro v3.6 démarré sur le port ${PORT}`);
});
