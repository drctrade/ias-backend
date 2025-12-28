// ==========================================
// IAS BACKEND SERVER v3.8 - MISSION CONTROL
// Système Haute-Visibilité & Tâches Isolées
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

// Configuration
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);
const apifyClient = new ApifyClient({ token: process.env.APIFY_TOKEN });

app.use(cors());
app.use(bodyParser.json());

// Fonction de log forcée (évite le buffering de Render)
const iasTaskLog = (task, message) => {
    const time = new Date().toISOString().split('T')[1].split('.')[0];
    console.log(`[${time}] [${task.toUpperCase()}] >>> ${message}`);
};

// ==========================================
// LOGIQUE D'ANALYSE DÉTAILLÉE (SOP IAS)
// ================================

async function runSopAnalysis(page, companyName, url) {
    iasTaskLog('sop', 'Démarrage de l\'audit structurel...');
    
    return await page.evaluate((cName, cUrl) => {
        // 1. Audit "Lead Leakage"
        const issues = [];
        if (!document.querySelector('iframe[src*="chat"], [class*="chat"]')) issues.push("Perte de leads : Aucun agent de conversion 24/7 détecté.");
        if (!document.querySelector('form')) issues.push("Fuite de revenus : Manque de formulaire de capture direct.");
        if (!document.querySelector('meta[name="viewport"]')) issues.push("Pénalité Mobile : Site non-responsive (Loi 25 / Google).");

        // 2. Extraction Identité (Palette)
        const colors = new Set();
        const elms = Array.from(document.querySelectorAll('*')).slice(0, 100);
        elms.forEach(el => {
            const style = window.getComputedStyle(el);
            if (style.backgroundColor && style.backgroundColor !== 'rgba(0, 0, 0, 0)') colors.add(style.backgroundColor);
        });

        return {
            company_name: cName,
            target_website_url: cUrl,
            lead_leakages: issues.length > 0 ? issues : ["Optimisation de la vitesse requise."],
            color_palette: Array.from(colors).slice(0, 5),
            score: Math.max(100 - (issues.length * 20), 40)
        };
    }, companyName, url);
}

// ==========================================
// ROUTES API
// ==========================================

app.get('/api/health', (req, res) => {
    iasTaskLog('system', 'Health Check reçu.');
    res.json({ status: 'active', version: '3.8', time: new Date() });
});

app.post('/api/generate/package', async (req, res) => {
    const { url, companyName } = req.body;
    iasTaskLog('engine', `COMMANDE REÇUE : Upgrade pour ${companyName}`);

    if (!url || !companyName) return res.status(400).json({ error: "Données incomplètes" });

    let browser;
    try {
        const wsEndpoint = `wss://chrome.browserless.io?token=${process.env.BROWSERLESS_TOKEN}`;
        iasTaskLog('browser', 'Connexion au cluster Browserless...');
        
        browser = await chromium.connect(wsEndpoint, { timeout: 45000 });
        iasTaskLog('browser', '✅ Session établie.');

        const context = await browser.newContext();
        const page = await context.newPage();

        iasTaskLog('navigation', `Cible : ${url}`);
        await page.goto(url, { waitUntil: 'load', timeout: 60000 });
        iasTaskLog('navigation', '✅ Page source chargée.');

        // Exécution du SOP
        const result = await runSopAnalysis(page, companyName, url);
        iasTaskLog('sop', `Analyse terminée. Score: ${result.score}%`);

        // Génération des Livrables IA (Stealth logic)
        result.loom_script = `Hey ${companyName}, j'ai analysé votre site ${url}. J'ai remarqué que vous perdez des opportunités car...`;
        result.ai_system_prompt = `Tu es l'Expert de Croissance pour ${companyName}. Ton rôle est de capturer les leads sur ${url}.`;
        result.status = 'completed';

        iasTaskLog('database', 'Enregistrement du package...');
        const { data, error } = await supabase.from('packages').insert([result]).select();
        if (error) throw error;

        // Sync Dashboard
        await supabase.from('prospects').upsert([{ 
            company_name: companyName, 
            website_url: url, 
            score: result.score,
            status: 'upgraded'
        }], { onConflict: 'company_name' });

        iasTaskLog('engine', '🎯 MISSION ACCOMPLIE.');
        res.json({ success: true, package: data[0] });

    } catch (err) {
        iasTaskLog('error', `ÉCHEC : ${err.message}`);
        res.status(500).json({ error: err.message });
    } finally {
        if (browser) await browser.close();
    }
});

app.get('/api/prospects', async (req, res) => {
    const { data } = await supabase.from('prospects').select('*').order('created_at', { ascending: false });
    res.json(data || []);
});

// Route Prospection Apify
app.post('/api/scrape/launch', async (req, res) => {
    const { query, city } = req.body;
    iasTaskLog('apify', `Lancement Prospection : ${query} @ ${city}`);
    res.json({ success: true, message: "Tâche déléguée à Apify." });
    
    try {
        const run = await apifyClient.actor("apify/google-maps-scraper").call({
            queries: [`${query} in ${city}`],
            maxResults: 10,
        });
        const { items } = await apifyClient.dataset(run.defaultDatasetId).listItems();
        for (const item of items) {
            await supabase.from('prospects').upsert([{
                company_name: item.title,
                website_url: item.website || "",
                status: 'new'
            }], { onConflict: 'company_name' });
        }
        iasTaskLog('apify', `${items.length} prospects importés.`);
    } catch (e) {
        iasTaskLog('apify-error', e.message);
    }
});

app.listen(PORT, () => iasTaskLog('system', `Moteur IAS v3.8 en ligne sur le port ${PORT}`));
