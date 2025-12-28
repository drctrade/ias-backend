// ==========================================
// IAS BACKEND SERVER v3.8.1 - ULTIMATE PRO
// Browserless + Apify + Supabase + Health Check
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

// Services
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);
const apifyClient = new ApifyClient({ token: process.env.APIFY_TOKEN });

app.use(cors());
app.use(bodyParser.json());

// Log forcé pour Render
const iasTaskLog = (task, message) => {
    const time = new Date().toLocaleTimeString();
    console.log(`[${time}] [${task.toUpperCase()}] >>> ${message}`);
};

// ==========================================
// MOTEUR D'UPGRADE (SOP ANALYSIS)
// ==========================================

async function runSopAnalysis(page, companyName, url) {
    iasTaskLog('sop', 'Démarrage de l\'audit de conversion...');
    return await page.evaluate((cName, cUrl) => {
        const issues = [];
        if (!document.querySelector('iframe[src*="chat"], [class*="chat"], [id*="chat"]')) {
            issues.push("Pas d'agent IA 24/7 : Perte de leads qualifiés la nuit et le week-end.");
        }
        if (!document.querySelector('form, input[type="email"]')) {
            issues.push("Lead Leakage : Aucun formulaire de capture direct détecté en page d'accueil.");
        }
        if (!document.querySelector('meta[name="viewport"]')) {
            issues.push("Conformité Mobile : Site non-optimisé (Risque de pénalité Google / Loi 25).");
        }

        const colors = new Set();
        Array.from(document.querySelectorAll('*')).slice(0, 100).forEach(el => {
            const style = window.getComputedStyle(el);
            if (style.backgroundColor && style.backgroundColor !== 'rgba(0, 0, 0, 0)') colors.add(style.backgroundColor);
        });

        return {
            company_name: cName,
            target_website_url: cUrl,
            lead_leakages: issues.length > 0 ? issues : ["Optimisation de l'engagement client recommandée."],
            color_palette: Array.from(colors).slice(0, 5),
            score: Math.max(100 - (issues.length * 20), 40)
        };
    }, companyName, url);
}

// ==========================================
// ROUTES API
// ==========================================

// 1. Health Check
app.get('/api/health', (req, res) => res.json({ status: 'online', version: '3.8.1' }));

// 2. Prospection Apify (Google Maps & LinkedIn)
app.post('/api/scrape/launch', async (req, res) => {
    const { query, city } = req.body;
    iasTaskLog('apify', `COMMANDE : Recherche "${query}" à ${city}`);
    res.json({ success: true, message: "Moteur Apify activé." });

    try {
        const run = await apifyClient.actor("apify/google-maps-scraper").call({
            queries: [`${query} in ${city}`],
            maxResults: 15,
        });
        const { items } = await apifyClient.dataset(run.defaultDatasetId).listItems();
        for (const item of items) {
            await supabase.from('prospects').upsert([{
                company_name: item.title,
                website_url: item.website || "",
                status: 'pending'
            }], { onConflict: 'company_name' });
        }
        iasTaskLog('apify', `${items.length} prospects ajoutés.`);
    } catch (e) {
        iasTaskLog('apify-error', e.message);
    }
});

// 3. Stealth Upgrade (Browserless)
app.post('/api/generate/package', async (req, res) => {
    const { url, companyName } = req.body;
    iasTaskLog('engine', `COMMANDE : Upgrade pour ${companyName}`);

    let browser;
    try {
        const ws = `wss://chrome.browserless.io?token=${process.env.BROWSERLESS_TOKEN}`;
        browser = await chromium.connect(ws, { timeout: 60000 });
        const context = await browser.newContext();
        const page = await context.newPage();
        
        iasTaskLog('navigation', `Accès à ${url}...`);
        await page.goto(url, { waitUntil: 'load', timeout: 60000 });
        
        const result = await runSopAnalysis(page, companyName, url);
        result.loom_script = `Bonjour ${companyName}, j'ai analysé votre site et voici pourquoi vous perdez des clients...`;
        result.ai_system_prompt = `Tu es l'agent IA de ${companyName}. Ton but est de collecter les contacts.`;
        result.status = 'completed';

        const { data, error } = await supabase.from('packages').insert([result]).select();
        if (error) throw error;

        await supabase.from('prospects').upsert([{ 
            company_name: companyName, website_url: url, score: result.score, status: 'upgraded' 
        }], { onConflict: 'company_name' });

        iasTaskLog('engine', 'MISSION TERMINEE.');
        res.json({ success: true, package: data[0] });

    } catch (err) {
        iasTaskLog('error', err.message);
        res.status(500).json({ error: err.message });
    } finally {
        if (browser) await browser.close();
    }
});

// 4. Liste prospects
app.get('/api/prospects', async (req, res) => {
    const { data } = await supabase.from('prospects').select('*').order('created_at', { ascending: false });
    res.json(data || []);
});

app.listen(PORT, () => iasTaskLog('system', `Ready on ${PORT}`));
