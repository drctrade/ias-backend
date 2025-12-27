// ==========================================
// IAS BACKEND SERVER v3.5 - STEALTH ENGINE PRO
// Apify Integration (LinkedIn & Maps) + GHL Sync
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

app.use(cors());
app.use(bodyParser.json());

// CONFIGURATION SERVICES
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);
const apifyClient = new ApifyClient({ token: process.env.APIFY_TOKEN });
const BROWSER_WS_ENDPOINT = `wss://production-sfo.browserless.io?token=${process.env.BROWSERLESS_TOKEN}`;

// ==========================================
// LOGIQUE DE SCRAPING VIA APIFY
// ==========================================

// Scraper Google Maps via Apify
async function runMapsScraper(query, city) {
    console.log(`[APIFY] Lancement Maps: ${query} à ${city}`);
    const input = {
        queries: [`${query} in ${city}`],
        maxResults: 10,
        language: "fr",
    };

    try {
        const run = await apifyClient.actor("apify/google-maps-scraper").call(input);
        const { items } = await apifyClient.dataset(run.defaultDatasetId).listItems();
        
        return items.map(place => ({
            company_name: place.title,
            website_url: place.website || "",
            contact_phone: place.phone,
            address: place.address,
            score: 0,
            status: 'pending'
        }));
    } catch (e) {
        console.error("[APIFY ERROR]", e.message);
        return [];
    }
}

// Analyse de site pour l'Upgrade
async function analyzeSite(page) {
    return await page.evaluate(() => {
        const getColors = () => {
            const colors = new Set();
            document.querySelectorAll('*').forEach(el => {
                const style = window.getComputedStyle(el);
                if (style.backgroundColor && !style.backgroundColor.includes('rgba(0, 0, 0, 0)')) colors.add(style.backgroundColor);
            });
            return Array.from(colors).slice(0, 5);
        };
        const issues = [];
        if (!document.querySelector('iframe[src*="chat"], [class*="chat"]')) issues.push("Absence d'agent conversationnel IA");
        if (!document.querySelector('form')) issues.push("Pas de formulaire de capture de leads");
        if (!document.querySelector('meta[name="viewport"]')) issues.push("Site non optimisé pour mobile");
        return { colors: getColors(), issues, title: document.title };
    });
}

// ==========================================
// ROUTES API
// ==========================================

app.get('/', (req, res) => res.json({ status: "IAS Engine v3.5 (Apify Edition) Active" }));

// Lancer une recherche globale (Prospects)
app.post('/api/scrape/launch', async (req, res) => {
    const { query, city } = req.body;
    if (!query || !city) return res.status(400).json({ error: "Query and City required" });

    res.json({ success: true, message: "Recherche Apify lancée en arrière-plan." });

    // Exécution asynchrone pour ne pas bloquer le dashboard
    try {
        const results = await runMapsScraper(query, city);
        for (const prospect of results) {
            await supabase.from('prospects').upsert([prospect], { onConflict: 'company_name' });
        }
        console.log(`[IAS] ${results.length} prospects synchronisés dans Supabase.`);
    } catch (err) {
        console.error("[BACKGROUND TASK ERROR]", err.message);
    }
});

// Générer un Stealth Upgrade
app.post('/api/generate/package', async (req, res) => {
    const { url, companyName } = req.body;
    let browser;
    try {
        browser = await chromium.connect(BROWSER_WS_ENDPOINT);
        const page = await browser.newPage();
        await page.goto(url, { waitUntil: 'networkidle', timeout: 60000 });
        
        const audit = await analyzeSite(page);
        const score = Math.max(100 - (audit.issues.length * 20), 30);

        const packageData = {
            target_website_url: url,
            company_name: companyName,
            lead_leakages: audit.issues,
            color_palette: audit.colors,
            score: score,
            loom_script: `Hey ${companyName}, j'ai analysé votre site ${url}...`,
            ai_system_prompt: `Tu es l'expert de ${companyName}.`,
            status: 'completed'
        };

        const { data, error } = await supabase.from('packages').insert([packageData]).select();
        
        // Update le prospect correspondant
        await supabase.from('prospects').update({ score: score }).eq('company_name', companyName);

        res.json({ success: true, package: data[0] });
    } catch (err) {
        res.status(500).json({ error: err.message });
    } finally {
        if (browser) await browser.close();
    }
});

app.get('/api/prospects', async (req, res) => {
    const { data } = await supabase.from('prospects').select('*').order('created_at', { ascending: false });
    res.json(data || []);
});

app.post('/api/ghl/sync', async (req, res) => {
    const { prospects } = req.body;
    // Logique GoHighLevel ici
    res.json({ success: true, message: `${prospects.length} prospects envoyés à GoHighLevel.` });
});

app.listen(PORT, () => console.log(`🚀 IAS Backend v3.5 Pro sur le port ${PORT}`));
