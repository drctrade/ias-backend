import express from 'express';
import cors from 'cors';
import crypto from 'crypto';

import { scrapeWebsite } from './modules/scraper.js';
import { generatePackageContent } from './modules/contentGenerator.js';
import { generateGHLHtml } from './modules/htmlGenerator.js';
import { generateVisuals } from './modules/imageGenerator.js';
import { generateAndStorePDFs } from './modules/pdfGenerator.js';
import { upsertPackage, updatePackage, getPackageById, listPackages, downloadBuffer, buckets } from './modules/supabase.js';

const app = express();
app.use(cors());
app.use(express.json({ limit: '15mb' })); // enough for JSON payloads; assets stored in Supabase Storage

const PORT = process.env.PORT || 3000;

function uuid() {
  // Node 18 has crypto.randomUUID()
  return crypto.randomUUID ? crypto.randomUUID() : ([1e7]+-1e3+-4e3+-8e3+-1e11).replace(/[018]/g,c=>(c^crypto.randomBytes(1)[0]&15>>c/4).toString(16));
}

function safeString(x, fallback = '') {
  if (x === null || x === undefined) return fallback;
  if (typeof x === 'string') return x;
  return String(x);
}

function safeLower(x) {
  const s = safeString(x, '');
  return s ? s.toLowerCase() : '';
}

app.get('/api/health', async (req, res) => {
  res.json({ ok: true });
});

app.get('/api/packages', async (req, res) => {
  try {
    const data = await listPackages(25);
    res.json({ ok: true, data });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

app.get('/api/packages/:id', async (req, res) => {
  try {
    const data = await getPackageById(req.params.id);
    res.json({ ok: true, data });
  } catch (e) {
    res.status(404).json({ ok: false, error: e.message });
  }
});

// Download PDFs from Supabase Storage (paths stored in audit_report_pdf / proposal_pdf)
app.get('/api/packages/:id/pdf/:kind', async (req, res) => {
  try {
    const pkg = await getPackageById(req.params.id);
    const kind = req.params.kind;
    const path = kind === 'audit' ? pkg.audit_report_pdf : pkg.proposal_pdf;
    if (!path) return res.status(404).send('PDF not found');
    const buf = await downloadBuffer({ bucket: buckets.assets, path });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${kind}.pdf"`);
    res.send(buf);
  } catch (e) {
    res.status(500).send(e.message);
  }
});

app.post('/generate/package', async (req, res) => {
  const websiteUrl = safeString(req.body.websiteUrl || req.body.website_url, '').trim();
  const companyNameInput = req.body.companyName || req.body.company_name;

  if (!websiteUrl) return res.status(400).json({ ok: false, error: 'websiteUrl is required' });

  const id = uuid();

  // Create initial row
  let row = null;
  try {
    row = await upsertPackage({
      id,
      company_name: companyNameInput ? safeString(companyNameInput) : null,
      website_url: websiteUrl,
      status: 'running',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      site_meta: { steps: [], started_at: new Date().toISOString() },
    });
  } catch (e) {
    return res.status(500).json({ ok: false, error: `Supabase insert failed: ${e.message}` });
  }

  const step = async (name, fn) => {
    try {
      await updatePackage(id, { site_meta: { ...(row.site_meta || {}), last_step: name } });
      const result = await fn();
      // refresh row snapshot
      row = await getPackageById(id);
      return result;
    } catch (e) {
      const meta = row.site_meta || {};
      meta.error = { step: name, message: e.message };
      await updatePackage(id, { status: 'error', site_meta: meta });
      throw e;
    }
  };

  try {
    // 1) Scrape
    const scraped = await step('scrape', async () => {
      const data = await scrapeWebsite(websiteUrl);
      const companyName = safeString(companyNameInput || data.title || 'Client');
      return updatePackage(id, {
        company_name: companyName,
        detected_language: data.language,
        detected_region: data.region,
        detected_industry: data.industry,
        color_palette: data.colors,
        site_meta: { ...(row.site_meta || {}), scraped_at: new Date().toISOString() },
        site_headings: data.headings,
      }).then(()=>data);
    });

    // 2) Content (system prompt, brand kit, loom, emails)
    const content = await step('content', async () => {
      const pkg = await getPackageById(id);
      const data = await generatePackageContent({
        companyName: pkg.company_name,
        websiteUrl,
        language: pkg.detected_language,
        region: pkg.detected_region,
        industry: pkg.detected_industry,
        siteMeta: pkg.site_meta,
        headings: pkg.site_headings,
      });
      await updatePackage(id, {
        ai_system_prompt: data.ai_system_prompt,
        brand_kit_prompt: data.brand_kit_prompt,
        loom_script: data.loom_script,
        email_templates: data.email_templates,
      });
      return data;
    });

    // 3) HTML GHL
    const html = await step('html', async () => {
      const pkg = await getPackageById(id);
      const htmlCode = await generateGHLHtml({
        companyName: pkg.company_name,
        websiteUrl,
        language: pkg.detected_language,
        region: pkg.detected_region,
        industry: pkg.detected_industry,
        colors: pkg.color_palette || [],
        headings: pkg.site_headings || [],
        siteMeta: pkg.site_meta || {},
      });
      await updatePackage(id, { html_code: htmlCode });
      return htmlCode;
    });

    // 4) Images
    const visuals = await step('images', async () => {
      const pkg = await getPackageById(id);
      const imgs = await generateVisuals({
        packageId: id,
        companyName: pkg.company_name,
        websiteUrl,
        industry: pkg.detected_industry,
        language: pkg.detected_language,
        region: pkg.detected_region,
        colors: pkg.color_palette || [],
        siteMeta: pkg.site_meta || {},
        headings: pkg.site_headings || [],
      });
      await updatePackage(id, { social_visuals: imgs });
      return imgs;
    });

    // 5) PDFs
    const pdfs = await step('pdfs', async () => {
      const pkg = await getPackageById(id);
      const stored = await generateAndStorePDFs({ packageRow: pkg });
      await updatePackage(id, {
        audit_report_pdf: stored.audit.path,
        proposal_pdf: stored.proposal.path,
      });
      return stored;
    });

    await updatePackage(id, { status: 'done', site_meta: { ...(row.site_meta || {}), finished_at: new Date().toISOString() } });
    const finalRow = await getPackageById(id);
    res.json({ ok: true, data: finalRow });
  } catch (e) {
    // Return partial row; client can still fetch by id
    const partial = await getPackageById(id).catch(()=>row);
    res.status(500).json({ ok: false, error: e.message, data: partial });
  }
});

app.listen(PORT, () => {
  console.log(`[Server] Started on port ${PORT}`);
});
