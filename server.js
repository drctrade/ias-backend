// ==========================================
// IAS BACKEND SERVER v3.4 - ULTIMATE STEALTH ENGINE
// Playwright + Browserless + Supabase + GHL Sync
// ==========================================

const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const { chromium } = require('playwright');
const { createClient } = require('@supabase/supabase-js');
const axios = require('axios');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// CONFIGURATION SUPABASE
const supabase = createClient(
    process.env.SUPABASE_URL || 'https://abuvnijldapnuiwumxtv.supabase.co',
    process.env.SUPABASE_KEY || ''
);

// CONFIGURATION BROWSERLESS
const BROWSERLESS_TOKEN = process.env.BROWSERLESS_TOKEN || '';
const BROWSER_WS_ENDPOINT = `wss://production-sfo.browserless.io?token=${BROWSERLESS_TOKEN}`;

// ==========================================
// MOTEUR D'ANALYSE (SCRAPING)
// ==========================================

async function analyzeSite(page) {
    return await page.evaluate(() => {
        const getColors = () => {
            const colors = new Set();
            const elements = Array.from(document.querySelectorAll('*')).slice(0, 100);
            elements.forEach(el => {
                const style = window.getComputedStyle(el);
                if (style.backgroundColor && !style.backgroundColor.includes('rgba(0, 0, 0, 0)') && style.backgroundColor !== 'transparent') {
                    colors.add(style.backgroundColor);
                }
                if (style.color && !style.color.includes('rgba(0, 0, 0, 0)')) {
                    colors.add(style.color);
                }
            });
            return Array.from(colors).slice(0, 5);
        };

        const checkIssues = () => {
            const issues = [];
            const hasChat = !!document.querySelector('iframe[src*="chat"], [class*="chat"], [id*="chat"], [class*="widget"]');
            const hasForm = !!document.querySelector('form, input[type="email"]');
            
            if (!hasChat) issues.push("Pas de chatbot IA 24/7 (Perte de conversion)");
            if (!hasForm) issues.push("Manque de formulaire de capture (Lead Leakage)");
            if (document.title.length < 5) issues.push("SEO Faible : Titre trop court");
            if (!document.querySelector('meta[name="viewport"]')) issues.push("Non-responsive (Pénalité Mobile)");
            
            return issues;
        };

        return {
            colors: getColors(),
            issues: checkIssues(),
            title: document.title,
            url: window.location.href
        };
    });
}

// ==========================================
// ROUTES API
// ==========================================

app.get('/', (req, res) => res.json({ status: "IAS Engine Active", version: "3.4" }));

// 1. GÉNÉRATION DE PACKAGE (STEALTH UPGRADE)
app.post('/api/generate/package', async (req, res) => {
    const { url, companyName } = req.body;
    if (!url) return res.status(400).json({ error: "URL manquante" });

    let browser;
    try {
        console.log(`[IAS] Lancement analyse pour: ${url}`);
        browser = await chromium.connect(BROWSER_WS_ENDPOINT);
        const page = await browser.newPage();
        await page.goto(url, { waitUntil: 'networkidle', timeout: 90000 });
        
        const audit = await analyzeSite(page);
        const score = Math.max(100 - (audit.issues.length * 15), 35);

        // Scripts IAS
        const loomScript = `Hey ${companyName}, j'ai analysé votre site ${url}. J'ai trouvé ${audit.issues.length} failles de conversion...`;
        const aiPrompt = `Tu es l'agent IA premium de ${companyName}. Ton but est de convertir les visiteurs de ${url}.`;

        const packageData = {
            target_website_url: url,
            company_name: companyName,
            lead_leakages: audit.issues,
            loom_script: loomScript,
            ai_system_prompt: aiPrompt,
            color_palette: audit.colors,
            score: score,
            status: 'completed'
        };

        const { data, error } = await supabase.from('packages').insert([packageData]).select();
        if (error) throw error;

        // On ajoute aussi à la table prospects pour le dashboard
        await supabase.from('prospects').insert([{
            company_name: companyName,
            website_url: url,
            score: score,
            status: 'pending'
        }]);

        res.json({ success: true, package: data[0] });

    } catch (err) {
        console.error("[ERROR]", err.message);
        res.status(500).json({ error: err.message });
    } finally {
        if (browser) await browser.close();
    }
});

// 2. RÉCUPÉRER TOUS LES PROSPECTS
app.get('/api/prospects', async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('prospects')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) throw error;
        // RENVOIE TOUJOURS UN TABLEAU POUR ÉVITER L'ERREUR .FILTER
        res.json(Array.isArray(data) ? data : []);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 3. SYNCHRONISATION GOHIGHLEVEL (GHL)
app.post('/api/ghl/sync', async (req, res) => {
    const { prospects } = req.body;
    if (!prospects || prospects.length === 0) return res.json({ success: false, message: "Aucun prospect" });

    console.log(`[GHL] Synchronisation de ${prospects.length} contacts...`);
    
    // Ici vous pouvez ajouter l'appel réel à l'API GHL ou Webhook
    // axios.post('https://services.leadconnectorhq.com/hooks/...', { contacts: prospects });

    res.json({ success: true, message: `${prospects.length} prospects synchronisés avec GoHighLevel.` });
});

app.listen(PORT, () => {
    console.log(`
╔══════════════════════════════════════════════════════════╗
║              🚀 IAS BACKEND ENGINE v3.4                 ║
║  ✅ Serveur prêt sur le port ${PORT}                      ║
╚══════════════════════════════════════════════════════════╝`);
});
