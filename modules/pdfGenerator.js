// ================================
// MODULE PDF GENERATOR (v5.0)
// - Audit PDF premium + multilingue (EN/FR/ES)
// - Intègre logo (si URL disponible) + couleurs
// - Retourne base64 (compat dashboard existant)
// ================================

const PDFDocument = require('pdfkit');
const https = require('https');

function langStrings(lang) {
  const s = {
    fr: {
      audit_title: "Rapport d'Audit",
      executive_summary: "Résumé exécutif",
      score: "Score global",
      issues: "Opportunités / Problèmes détectés",
      recommendations: "Recommandations prioritaires (30 jours)",
      generated_on: "Généré le",
      goal: "Objectif: atteindre 95+ en 30 jours",
      next_steps: "Prochaines étapes",
      disclaimer: "Ce rapport est une analyse automatisée. Les recommandations seront validées lors d'un appel de 15 minutes."
    },
    en: {
      audit_title: "Website Audit Report",
      executive_summary: "Executive summary",
      score: "Overall score",
      issues: "Key issues & opportunities",
      recommendations: "Top recommendations (30 days)",
      generated_on: "Generated on",
      goal: "Goal: reach 95+ in 30 days",
      next_steps: "Next steps",
      disclaimer: "This is an automated analysis. We validate recommendations during a 15‑minute call."
    },
    es: {
      audit_title: "Informe de Auditoría Web",
      executive_summary: "Resumen ejecutivo",
      score: "Puntuación general",
      issues: "Principales problemas y oportunidades",
      recommendations: "Recomendaciones (30 días)",
      generated_on: "Generado el",
      goal: "Objetivo: alcanzar 95+ en 30 días",
      next_steps: "Próximos pasos",
      disclaimer: "Este informe es un análisis automatizado. Validamos las recomendaciones en una llamada de 15 minutos."
    }
  };
  return s[lang] || s.en;
}

async function fetchImageBuffer(url) {
  if (!url || url.startsWith('data:')) return null;
  return new Promise((resolve) => {
    try {
      https.get(url, (res) => {
        const data = [];
        res.on('data', (c) => data.push(c));
        res.on('end', () => resolve(Buffer.concat(data)));
      }).on('error', () => resolve(null));
    } catch {
      resolve(null);
    }
  });
}

async function generateAuditPDF(companyName, url, scrapedData, aiContent) {
  const lang = scrapedData.language || 'en';
  const L = langStrings(lang);

  return new Promise(async (resolve, reject) => {
    try {
      const doc = new PDFDocument({ size: 'A4', margins: { top: 50, bottom: 50, left: 50, right: 50 } });
      const chunks = [];
      doc.on('data', c => chunks.push(c));
      doc.on('end', () => resolve(Buffer.concat(chunks).toString('base64')));
      doc.on('error', reject);

      const primary = scrapedData.colors?.[0] || '#2D7A8F';
      const accent = scrapedData.colors?.[2] || '#5bc236';
      const dark = '#0f204b';

      const dateStr = new Date().toLocaleDateString(lang === 'fr' ? 'fr-FR' : lang === 'es' ? 'es-ES' : 'en-US', { year:'numeric', month:'long', day:'numeric' });

      const logoBuf = await fetchImageBuffer(scrapedData.logoUrl);

      // Cover
      doc.rect(0,0,595,842).fill('#ffffff');
      doc.rect(0,0,595,240).fill(primary);

      if (logoBuf) {
        try { doc.image(logoBuf, 50, 40, { fit:[120,60], align:'left' }); } catch {}
      }

      doc.fillColor('#ffffff').font('Helvetica-Bold').fontSize(28).text(L.audit_title, 50, 120);
      doc.fontSize(20).text(companyName, 50, 160);
      doc.font('Helvetica').fontSize(11).fillColor('#EAF2F7').text(url, 50, 195, { width: 495 });
      doc.fillColor('#EAF2F7').fontSize(10).text(`${L.generated_on} ${dateStr}`, 50, 215);

      // Summary page
      doc.addPage();
      doc.fillColor(dark).font('Helvetica-Bold').fontSize(22).text(L.executive_summary, 50, 50);
      doc.moveTo(50, 82).lineTo(545, 82).strokeColor(accent).lineWidth(2).stroke();

      doc.font('Helvetica').fontSize(12).fillColor('#333333').text(
        `${companyName} — ${url}\n\n` +
        `Industry: ${scrapedData.industry || 'Unknown'}\n` +
        `${L.goal}\n`,
        50, 110, { width: 495, lineGap: 6 }
      );

      // Score block
      const score = scrapedData.score || 0;
      doc.roundedRect(50, 220, 495, 120, 12).fillAndStroke('#F8FAFC', '#E5E7EB');
      doc.fillColor(dark).font('Helvetica-Bold').fontSize(16).text(L.score, 70, 245);
      doc.fillColor(score >= 70 ? accent : '#EF4444').fontSize(52).text(`${score}/100`, 70, 265);

      // Issues page
      doc.addPage();
      doc.fillColor(dark).font('Helvetica-Bold').fontSize(22).text(L.issues, 50, 50);
      doc.moveTo(50, 82).lineTo(545, 82).strokeColor(accent).lineWidth(2).stroke();

      const issues = (scrapedData.issues || []).slice(0, 10);
      let y = 115;
      issues.forEach((it, idx) => {
        doc.fillColor('#111827').font('Helvetica-Bold').fontSize(12).text(`${idx + 1}.`, 50, y);
        doc.fillColor('#374151').font('Helvetica').fontSize(11).text(String(it), 70, y, { width: 475, lineGap: 3 });
        y += 40;
        if (y > 720) { doc.addPage(); y = 50; }
      });

      // Recommendations page
      doc.addPage();
      doc.fillColor(dark).font('Helvetica-Bold').fontSize(22).text(L.recommendations, 50, 50);
      doc.moveTo(50, 82).lineTo(545, 82).strokeColor(accent).lineWidth(2).stroke();

      const recs = buildRecommendations(lang, scrapedData);
      y = 115;
      recs.forEach((r, idx) => {
        doc.roundedRect(50, y, 495, 78, 12).fillAndStroke('#FFFFFF', '#E5E7EB');
        doc.fillColor(primary).font('Helvetica-Bold').fontSize(13).text(`${idx + 1}. ${r.title}`, 70, y + 16);
        doc.fillColor('#374151').font('Helvetica').fontSize(11).text(r.desc, 70, y + 38, { width: 455, lineGap: 4 });
        y += 92;
        if (y > 700) { doc.addPage(); y = 50; }
      });

      // Next steps
      doc.addPage();
      doc.fillColor(dark).font('Helvetica-Bold').fontSize(22).text(L.next_steps, 50, 50);
      doc.moveTo(50, 82).lineTo(545, 82).strokeColor(accent).lineWidth(2).stroke();

      doc.fillColor('#111827').font('Helvetica').fontSize(12).text(
        buildNextSteps(lang),
        50, 120, { width: 495, lineGap: 8 }
      );

      doc.moveDown(2);
      doc.fillColor('#6B7280').fontSize(10).text(L.disclaimer, 50, 740, { width: 495, align: 'center' });

      doc.end();
      console.log('[PDF] Audit premium genere');
    } catch (error) {
      console.error('[PDF] Erreur:', error.message);
      reject(error);
    }
  });
}

function buildRecommendations(lang, scrapedData) {
  const L = {
    fr: [
      { title: "Refonte UI + message de valeur", desc: "Clarifier l'offre en 2 secondes: promesse, bénéfice, preuve, CTA." },
      { title: "CTA visibles + parcours simple", desc: "Ajouter 2-3 CTA forts (hero, section services, footer) + formulaire court." },
      { title: "Performance & SEO", desc: "Optimiser scripts/images, corriger H1/meta description, ajouter sections structurées." },
      { title: "Trust stacking", desc: "Ajouter avis, preuves, résultats, FAQ, badges/garanties (sans inventer)." }
    ],
    en: [
      { title: "UI refresh + clearer value proposition", desc: "Make the offer obvious in 2 seconds: promise, benefit, proof, CTA." },
      { title: "Stronger CTAs + simpler funnel", desc: "Add 2-3 prominent CTAs (hero, services, footer) + short form." },
      { title: "Performance & SEO", desc: "Reduce scripts, optimize images, fix H1/meta description, structure sections." },
      { title: "Trust stacking", desc: "Add reviews, proof, results, FAQ, guarantees (without making claims up)." }
    ],
    es: [
      { title: "Mejor UI + propuesta de valor clara", desc: "Que la oferta sea obvia en 2 segundos: promesa, beneficio, prueba, CTA." },
      { title: "CTAs más visibles + embudo simple", desc: "Agregar 2-3 CTAs fuertes (hero, servicios, footer) + formulario corto." },
      { title: "Rendimiento & SEO", desc: "Optimizar scripts/imágenes, corregir H1/meta, estructurar secciones." },
      { title: "Pruebas de confianza", desc: "Añadir reseñas, pruebas, resultados, FAQ, garantías (sin inventar)." }
    ]
  };
  const arr = L[lang] || L.en;
  // If some issues suggest HTTPS, add
  if ((scrapedData.issues || []).some(i => String(i).toLowerCase().includes('https'))) {
    arr.unshift({ title: (lang==='fr'?'Sécuriser le site (HTTPS)':'Secure the website (HTTPS)'), desc: (lang==='fr'?'Passer en HTTPS + vérifier redirections.':'Enable HTTPS and verify redirects.') });
  }
  return arr.slice(0, 6);
}

function buildNextSteps(lang) {
  const steps = {
    fr: "1) Valider les priorités (appel 15 min)\n2) Déployer le site modernisé (EN/FR si Canada)\n3) Générer 12 visuels/mois + publication automatisée via GHL\n4) Mettre en place l’automatisation (lead capture, booking, follow-up)",
    en: "1) Validate priorities (15-min call)\n2) Deploy the modernized website (EN/FR for Canada)\n3) Generate 12 visuals/month + auto-post via GHL\n4) Set up automation (lead capture, booking, follow-up)",
    es: "1) Validar prioridades (llamada de 15 min)\n2) Publicar el sitio modernizado (EN/ES)\n3) Generar 12 visuales/mes + publicación automática vía GHL\n4) Configurar automatización (captura de leads, reservas, seguimiento)"
  };
  return steps[lang] || steps.en;
}

async function generateProposalPDF(companyName, url, scrapedData, logoUrl = null) {
  // On garde ton PDF proposition actuel (déjà premium) pour éviter de casser.
  // Si tu veux, on le passera en multilingue à l’étape 2.
  const legacy = require('./pdfGenerator_legacy');
  return legacy.generateProposalPDF(companyName, url, scrapedData, logoUrl);
}

module.exports = { generateAuditPDF, generateProposalPDF };