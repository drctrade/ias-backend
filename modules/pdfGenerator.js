import { uploadBuffer } from './supabase.js';

async function loadPdfKit() {
  try {
    const mod = await import('pdfkit');
    return mod.default || mod;
  } catch {
    throw new Error('pdfkit dependency missing. Please add "pdfkit" to package.json.');
  }
}

// Helper: create a PDF buffer using pdfkit
async function buildPdf(buildFn) {
  const PDFDocument = await loadPdfKit();
  const doc = new PDFDocument({ size: 'LETTER', margin: 48 });
  const chunks = [];
  doc.on('data', (d) => chunks.push(d));
  const done = new Promise((resolve, reject) => {
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);
  });

  await buildFn(doc);
  doc.end();
  return done;
}

function safeStr(x, fallback='') {
  if (x === null || x === undefined) return fallback;
  if (typeof x === 'string') return x;
  try { return JSON.stringify(x); } catch { return fallback; }
}

export async function generateAuditPDF({ packageRow }) {
  const lang = (packageRow.detected_language || packageRow.language || 'en').toLowerCase().startsWith('fr') ? 'fr' : 'en';
  const name = packageRow.company_name || 'Client';
  const score = packageRow.audit_score ?? '';
  const issues = Array.isArray(packageRow.audit_issues) ? packageRow.audit_issues : (packageRow.audit_issues ? [safeStr(packageRow.audit_issues)] : []);
  const opps = Array.isArray(packageRow.audit_opportunities) ? packageRow.audit_opportunities : (packageRow.audit_opportunities ? [safeStr(packageRow.audit_opportunities)] : []);

  return buildPdf(async (doc) => {
    doc.fontSize(22).text(lang==='fr' ? 'Audit de présence en ligne' : 'Online Presence Audit', { align: 'left' });
    doc.moveDown(0.5);
    doc.fontSize(14).text(`${name}`);
    doc.fontSize(11).fillColor('gray').text(packageRow.website_url || '', { link: packageRow.website_url || undefined });
    doc.fillColor('black');
    doc.moveDown(1);

    doc.fontSize(16).text(lang==='fr' ? 'Score' : 'Score');
    doc.fontSize(36).text(String(score), { align: 'left' });
    doc.moveDown(1);

    doc.fontSize(16).text(lang==='fr' ? 'Points à corriger' : 'Key issues');
    doc.moveDown(0.3);
    doc.fontSize(11);
    if (!issues.length) doc.text(lang==='fr' ? 'Aucun point listé.' : 'No issues listed.');
    issues.slice(0, 12).forEach((it) => doc.text(`• ${safeStr(it)}`));
    doc.moveDown(1);

    doc.fontSize(16).text(lang==='fr' ? 'Opportunités' : 'Opportunities');
    doc.moveDown(0.3);
    doc.fontSize(11);
    if (!opps.length) doc.text(lang==='fr' ? 'Aucune opportunité listée.' : 'No opportunities listed.');
    opps.slice(0, 12).forEach((it) => doc.text(`• ${safeStr(it)}`));

    doc.moveDown(1.5);
    doc.fontSize(10).fillColor('gray').text(lang==='fr'
      ? 'Ce document est généré automatiquement à partir de signaux publics et doit être validé manuellement.'
      : 'This document is automatically generated from public signals and should be manually validated.');
  });
}

export async function generateProposalPDF({ packageRow, providerName = 'IntelliAIScale' }) {
  const lang = (packageRow.detected_language || 'en').toLowerCase().startsWith('fr') ? 'fr' : 'en';
  const name = packageRow.company_name || 'Client';

  return buildPdf(async (doc) => {
    doc.fontSize(24).text(lang==='fr' ? 'Proposition commerciale' : 'Commercial Proposal');
    doc.moveDown(0.5);
    doc.fontSize(12).fillColor('gray').text(providerName);
    doc.fillColor('black');
    doc.moveDown(1);

    doc.fontSize(16).text(name);
    doc.fontSize(11).fillColor('gray').text(packageRow.website_url || '');
    doc.fillColor('black');
    doc.moveDown(1);

    doc.fontSize(14).text(lang==='fr' ? 'Objectif' : 'Goal');
    doc.fontSize(11).text(lang==='fr'
      ? "Transformer votre présence en ligne en machine à prises de rendez-vous (sans casser ce qui fonctionne)."
      : "Turn your online presence into a booking machine (without breaking what already works).");
    doc.moveDown(0.8);

    doc.fontSize(14).text(lang==='fr' ? 'Livrables' : 'Deliverables');
    const items = lang==='fr'
      ? ['Landing page optimisée (GHL)', 'Visuels sociaux premium', 'Scripts & séquences emails', 'Audit + plan d’action']
      : ['Optimized landing page (GHL)', 'Premium social visuals', 'Scripts & email sequences', 'Audit + action plan'];
    doc.fontSize(11);
    items.forEach(i => doc.text(`• ${i}`));
    doc.moveDown(0.8);

    doc.fontSize(14).text(lang==='fr' ? 'Cadre & limites' : 'Scope & limits');
    doc.fontSize(11).text(lang==='fr'
      ? "Ce qui est inclus est listé ci-dessus. Tout ajout majeur (pages multiples, refonte complète, SEO long terme) fera l’objet d’un devis séparé."
      : "Included scope is listed above. Major additions (multi-page rebuild, long-term SEO, full rebrand) are quoted separately.");
    doc.moveDown(0.8);

    doc.fontSize(14).text(lang==='fr' ? 'Prochaines étapes' : 'Next steps');
    doc.fontSize(11).text(lang==='fr'
      ? "1) Validation du scope  2) Accès GHL  3) Livraison sous 7-10 jours ouvrables"
      : "1) Scope confirmation  2) GHL access  3) Delivery in 7-10 business days");

    doc.moveDown(1.2);
    doc.fontSize(10).fillColor('gray').text(lang==='fr'
      ? 'Conditions: paiement initial avant démarrage. Aucun résultat n’est garanti (marché, offre, budget pub).'
      : 'Terms: upfront payment required to start. No results guaranteed (market, offer, ad budget).');
  });
}

export async function generateAndStorePDFs({ packageRow }) {
  const auditBuf = await generateAuditPDF({ packageRow });
  const proposalBuf = await generateProposalPDF({
    packageRow,
    providerName: process.env.PROVIDER_NAME || 'IntelliAIScale',
  });

  const basePath = `packages/${packageRow.id}/pdfs`;
  const auditUp = await uploadBuffer({
    path: `${basePath}/audit.pdf`,
    buffer: auditBuf,
    contentType: 'application/pdf',
  });
  const proposalUp = await uploadBuffer({
    path: `${basePath}/proposal.pdf`,
    buffer: proposalBuf,
    contentType: 'application/pdf',
  });

  return { audit: auditUp, proposal: proposalUp };
}
