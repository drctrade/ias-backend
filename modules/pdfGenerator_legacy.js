// ================================
// MODULE PDF GENERATOR - Génération de rapports PDF
// ================================

const PDFDocument = require('pdfkit');

async function generateAuditPDF(companyName, url, scrapedData, aiContent) {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: 'A4',
        margins: { top: 50, bottom: 50, left: 50, right: 50 }
      });

      const chunks = [];
      doc.on('data', chunk => chunks.push(chunk));
      doc.on('end', () => {
        const pdfBuffer = Buffer.concat(chunks);
        resolve(pdfBuffer.toString('base64'));
      });
      doc.on('error', reject);

      // Page 1: Couverture
      doc.fontSize(32).fillColor('#0f204b').text(`Rapport d'Audit`, 50, 200);
      doc.fontSize(24).fillColor('#5bc236').text(companyName, 50, 250);
      doc.fontSize(14).fillColor('#666').text(url, 50, 290);
      doc.fontSize(12).fillColor('#999').text(`Généré le ${new Date().toLocaleDateString('fr-FR')}`, 50, 320);

      // Page 2: Score
      doc.addPage();
      doc.fontSize(20).fillColor('#0f204b').text('Score Global', 50, 50);
      doc.fontSize(48).fillColor('#5bc236').text(`${scrapedData.score}/100`, 50, 100);

      // Page 3: Problèmes
      doc.addPage();
      doc.fontSize(20).fillColor('#0f204b').text('Problèmes Détectés', 50, 50);
      const issues = scrapedData.issues || [];
      issues.forEach((issue, i) => {
        doc.fontSize(12).fillColor('#666').text(`${i + 1}. ${issue}`, 50, 100 + (i * 30));
      });

      // Page 4: Recommandations
      doc.addPage();
      doc.fontSize(20).fillColor('#0f204b').text('Recommandations', 50, 50);
      doc.fontSize(12).fillColor('#666').text('• Moderniser le design', 50, 100);
      doc.text('• Ajouter un chatbot IA', 50, 130);
      doc.text('• Optimiser pour mobile', 50, 160);

      doc.end();
      console.log('[PDF] Rapport d audit genere');

    } catch (error) {
      console.error('[PDF] Erreur:', error.message);
      reject(error);
    }
  });
}

const https = require('https');

function getLang(scrapedData = {}) {
  const l = (scrapedData.language || scrapedData.detected_language || 'en').toLowerCase();
  if (l.startsWith('fr')) return 'fr';
  if (l.startsWith('es')) return 'es';
  return 'en';
}

function money(region, amount) {
  const isCA = (region || '').toUpperCase() === 'CA';
  const currency = isCA ? 'CAD' : 'USD';
  // format simple (évite Intl si env minimal)
  return `${amount.toLocaleString('en-US')} ${currency}`;
}

function strings(lang) {
  const s = {
    fr: {
      title: "Proposition Commerciale",
      subtitle: "Stealth Upgrade (Site + Automatisation + Contenu)",
      preparedFor: "Préparé pour",
      preparedBy: "Préparé par",
      website: "Site web",
      date: "Date",
      summaryTitle: "Résumé",
      summaryBody: "Voici une proposition claire et actionnable pour améliorer la conversion du site, automatiser la prise de rendez-vous et publier du contenu 3x/semaine.",
      whatYouGet: "Ce que vous recevez",
      package: "Options de service",
      timeline: "Délais & Process",
      terms: "Conditions",
      cta: "Prochaine étape",
      ctaBody: "Répondez à ce courriel avec “OK” et on planifie un appel de 15 minutes pour démarrer.",
      includes: [
        "Audit complet + rapport PDF",
        "Refonte landing page (GHL) orientée conversion",
        "Brand kit (couleurs, typographies, ton) basé sur votre site actuel",
        "12 visuels/mois (3 par semaine) prêts à poster",
        "Automatisation GHL (formulaires, pipeline, email/SMS de suivi)",
        "Tracking & optimisation (SEO de base + performance)"
      ],
      tiers: {
        starter: "Stealth Upgrade",
        growth: "Growth Engine",
        premium: "Dominance (IA + Automations)"
      },
      tierNotes: {
        starter: "Idéal pour moderniser le site et convertir mieux, rapidement.",
        growth: "Contenu + automatisation + suivi pour générer plus de RDV.",
        premium: "Le pack qui fait tourner la machine presque toute seule."
      },
      timelineSteps: [
        "Jour 1: Audit + extraction marque & contenus",
        "Jour 2-3: Nouveau site GHL (version 1)",
        "Jour 4: Ajustements (1 cycle) + intégrations",
        "Jour 5: Mise en ligne + automatisations + livrables"
      },
      termsBody: "Livrables inclus ci-dessus. 1 cycle d’ajustements inclus. Toute demande hors-scope fera l’objet d’un devis. Paiement à la commande. Les résultats dépendent du marché, de l’offre et de l’exécution."
    },
    en: {
      title: "Service Proposal",
      subtitle: "Stealth Upgrade (Website + Automation + Content)",
      preparedFor: "Prepared for",
      preparedBy: "Prepared by",
      website: "Website",
      date: "Date",
      summaryTitle: "Summary",
      summaryBody: "A clear, actionable plan to improve website conversion, automate appointment capture, and publish content 3x/week.",
      whatYouGet: "What you get",
      package: "Service options",
      timeline: "Timeline & process",
      terms: "Terms",
      cta: "Next step",
      ctaBody: "Reply with “OK” and we’ll schedule a 15‑minute kickoff call.",
      includes: [
        "Full audit + PDF report",
        "Conversion-focused GHL landing page redesign",
        "Brand kit (colors, typography, tone) based on your current site",
        "12 social visuals/month (3 per week) ready to post",
        "GHL automation (forms, pipeline, email/SMS follow-up)",
        "Tracking & optimization (basic SEO + performance)"
      ],
      tiers: {
        starter: "Stealth Upgrade",
        growth: "Growth Engine",
        premium: "Dominance (AI + Automations)"
      },
      tierNotes: {
        starter: "Perfect to modernize your site and convert better—fast.",
        growth: "Content + automation + follow-up to drive more bookings.",
        premium: "The “mostly hands‑off” growth machine."
      },
      timelineSteps: [
        "Day 1: Audit + brand/content extraction",
        "Day 2-3: New GHL site (v1)",
        "Day 4: Adjustments (1 round) + integrations",
        "Day 5: Go live + automations + deliverables"
      ],
      termsBody: "Deliverables included as listed. 1 revision round included. Out‑of‑scope requests are quoted separately. Payment due at start. Results depend on market, offer and execution."
    },
    es: {
      title: "Propuesta de Servicio",
      subtitle: "Stealth Upgrade (Sitio web + Automatización + Contenido)",
      preparedFor: "Preparado para",
      preparedBy: "Preparado por",
      website: "Sitio web",
      date: "Fecha",
      summaryTitle: "Resumen",
      summaryBody: "Un plan claro y accionable para mejorar conversiones, automatizar citas y publicar contenido 3 veces por semana.",
      whatYouGet: "Qué recibes",
      package: "Opciones de servicio",
      timeline: "Cronograma & proceso",
      terms: "Condiciones",
      cta: "Siguiente paso",
      ctaBody: "Responde con “OK” y agendamos una llamada de 15 minutos para iniciar.",
      includes: [
        "Auditoría completa + reporte PDF",
        "Rediseño landing en GHL orientado a conversión",
        "Brand kit (colores, tipografías, tono) basado en tu sitio actual",
        "12 visuales/mes (3 por semana) listos para publicar",
        "Automatización GHL (formularios, pipeline, seguimiento email/SMS)",
        "Tracking y optimización (SEO básico + performance)"
      ],
      tiers: {
        starter: "Stealth Upgrade",
        growth: "Growth Engine",
        premium: "Dominance (IA + Automatizaciones)"
      },
      tierNotes: {
        starter: "Ideal para modernizar tu sitio y convertir mejor—rápido.",
        growth: "Contenido + automatización + seguimiento para más citas.",
        premium: "La máquina de crecimiento casi en piloto automático."
      },
      timelineSteps: [
        "Día 1: Auditoría + extracción de marca/contenidos",
        "Día 2-3: Nuevo sitio en GHL (v1)",
        "Día 4: Ajustes (1 ronda) + integraciones",
        "Día 5: Publicación + automatizaciones + entregables"
      ],
      termsBody: "Entregables incluidos como se listan. 1 ronda de ajustes incluida. Fuera de alcance se cotiza aparte. Pago al inicio. Resultados dependen del mercado, oferta y ejecución."
    }
  };
  return s[lang] || s.en;
}

async function fetchImageBuffer(url) {
  if (!url) return null;

  try {
    // Node 18+ fetch
    if (typeof fetch === 'function') {
      const r = await fetch(url);
      if (!r.ok) return null;
      const ab = await r.arrayBuffer();
      return Buffer.from(ab);
    }
  } catch (_) {}

  // Fallback https
  return new Promise((resolve) => {
    try {
      https.get(url, (res) => {
        const chunks = [];
        res.on('data', (d) => chunks.push(d));
        res.on('end', () => resolve(Buffer.concat(chunks)));
      }).on('error', () => resolve(null));
    } catch (e) {
      resolve(null);
    }
  });
}

async function generateProposalPDF(companyName, url, scrapedData, providerLogoUrl = null) {
  return new Promise(async (resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: 'A4',
        margins: { top: 50, bottom: 50, left: 50, right: 50 }
      });

      const chunks = [];
      doc.on('data', chunk => chunks.push(chunk));
      doc.on('end', () => {
        const pdfBuffer = Buffer.concat(chunks);
        resolve(`data:application/pdf;base64,${pdfBuffer.toString('base64')}`);
      });

      const lang = getLang(scrapedData);
      const L = strings(lang);

      const region = scrapedData.region || scrapedData.detected_region || 'US';
      const accent = (scrapedData.colors && scrapedData.colors[0]) ? scrapedData.colors[0] : '#2D7A8F';
      const dark = '#0B1220';

      // Logos (provider + optional client)
      const providerLogo = await fetchImageBuffer(providerLogoUrl);
      const clientLogoUrl = scrapedData.logo || scrapedData.logoUrl || scrapedData.site_logo || null;
      const clientLogo = await fetchImageBuffer(clientLogoUrl);

      // Header bar
      doc.rect(0, 0, 612, 90).fill(dark);

      if (providerLogo) {
        try { doc.image(providerLogo, 50, 20, { height: 50 }); } catch (_) {}
      }

      // Title
      doc.fillColor('white').font('Helvetica-Bold').fontSize(22).text(L.title, 50, 105);
      doc.fillColor('#C7D2FE').font('Helvetica').fontSize(12).text(L.subtitle, 50, 132);

      // Client logo (right)
      if (clientLogo) {
        try { doc.image(clientLogo, 480, 22, { height: 46 }); } catch (_) {}
      }

      // Meta
      const today = new Date().toISOString().slice(0, 10);
      doc.fillColor('#111827').font('Helvetica-Bold').fontSize(11).text(`${L.preparedFor}:`, 50, 170);
      doc.font('Helvetica').text(companyName, 160, 170);

      doc.font('Helvetica-Bold').text(`${L.website}:`, 50, 188);
      doc.font('Helvetica').text(url, 160, 188, { width: 380 });

      doc.font('Helvetica-Bold').text(`${L.date}:`, 50, 206);
      doc.font('Helvetica').text(today, 160, 206);

      // Summary box
      doc.roundedRect(50, 235, 512, 90, 12).fillAndStroke('#F8FAFC', '#E5E7EB');
      doc.fillColor(dark).font('Helvetica-Bold').fontSize(14).text(L.summaryTitle, 70, 255);
      doc.fillColor('#334155').font('Helvetica').fontSize(11).text(L.summaryBody, 70, 277, { width: 470, lineGap: 4 });

      // What you get
      let y = 350;
      doc.fillColor(dark).font('Helvetica-Bold').fontSize(16).text(L.whatYouGet, 50, y);
      y += 18;
      doc.moveTo(50, y).lineTo(562, y).strokeColor(accent).lineWidth(2).stroke();
      y += 18;

      doc.fillColor('#111827').font('Helvetica').fontSize(11);
      L.includes.forEach((item) => {
        doc.text(`• ${item}`, 60, y, { width: 500 });
        y += 16;
      });

      // Packages
      y += 14;
      doc.fillColor(dark).font('Helvetica-Bold').fontSize(16).text(L.package, 50, y);
      y += 18;
      doc.moveTo(50, y).lineTo(562, y).strokeColor(accent).lineWidth(2).stroke();
      y += 18;

      // Pricing (credible, not crazy guarantees)
      const isCA = (region || '').toUpperCase() === 'CA';
      const starterSetup = isCA ? 1497 : 1197;
      const growthSetup = isCA ? 2497 : 1997;
      const premiumSetup = isCA ? 3997 : 3197;

      const growthMonthly = isCA ? 997 : 797;
      const premiumMonthly = isCA ? 1497 : 1197;

      const tiers = [
        {
          name: L.tiers.starter,
          price: `${money(region, starterSetup)} (one-time)`,
          note: L.tierNotes.starter,
          bullets: [
            lang === 'fr' ? "Site GHL (1 page) + optimisation conversion" : lang === 'es' ? "Landing GHL (1 página) + conversión" : "1-page GHL site + conversion optimization",
            lang === 'fr' ? "Brand kit + copywriting de base" : lang === 'es' ? "Brand kit + copywriting base" : "Brand kit + baseline copywriting",
            lang === 'fr' ? "6 visuels (pack démo)" : lang === 'es' ? "6 visuales (pack demo)" : "6 visuals (demo pack)"
          ]
        },
        {
          name: L.tiers.growth,
          price: `${money(region, growthSetup)} setup + ${money(region, growthMonthly)}/mo`,
          note: L.tierNotes.growth,
          bullets: [
            lang === 'fr' ? "12 visuels/mois (3/semaine) + planning" : lang === 'es' ? "12 visuales/mes (3/semana) + planificación" : "12 visuals/month (3/week) + scheduling",
            lang === 'fr' ? "Automatisation GHL (pipeline + follow-up)" : lang === 'es' ? "Automatización GHL (pipeline + seguimiento)" : "GHL automation (pipeline + follow-up)",
            lang === 'fr' ? "Optimisation SEO de base + analytics" : lang === 'es' ? "SEO básico + analíticas" : "Basic SEO + analytics"
          ]
        },
        {
          name: L.tiers.premium,
          price: `${money(region, premiumSetup)} setup + ${money(region, premiumMonthly)}/mo`,
          note: L.tierNotes.premium,
          bullets: [
            lang === 'fr' ? "Agent IA (pré-qualification + RDV)" : lang === 'es' ? "Agente IA (precalificación + citas)" : "AI agent (pre-qualify + bookings)",
            lang === 'fr' ? "Automatisation avis & réputation" : lang === 'es' ? "Automatización reseñas & reputación" : "Reviews & reputation automation",
            lang === 'fr' ? "Priorité support + optimisation continue" : lang === 'es' ? "Soporte prioritario + optimización" : "Priority support + ongoing optimization"
          ]
        }
      ];

      const cardW = 512;
      const cardH = 120;

      tiers.forEach((t, idx) => {
        doc.roundedRect(50, y, cardW, cardH, 12).fillAndStroke('#0B1220', '#111827');
        doc.fillColor('white').font('Helvetica-Bold').fontSize(13).text(t.name, 70, y + 16);
        doc.fillColor('#C7D2FE').font('Helvetica-Bold').fontSize(12).text(t.price, 70, y + 36);

        doc.fillColor('#E5E7EB').font('Helvetica').fontSize(10).text(t.note, 70, y + 54, { width: 470 });

        let by = y + 72;
        doc.fillColor('#E5E7EB').font('Helvetica').fontSize(9);
        t.bullets.forEach(b => {
          doc.text(`• ${b}`, 70, by, { width: 470 });
          by += 12;
        });

        y += cardH + 14;

        if (y > 620 && idx < tiers.length - 1) {
          doc.addPage();
          y = 70;
        }
      });

      // Timeline
      if (y > 610) { doc.addPage(); y = 70; }
      doc.fillColor(dark).font('Helvetica-Bold').fontSize(16).text(L.timeline, 50, y);
      y += 18;
      doc.moveTo(50, y).lineTo(562, y).strokeColor(accent).lineWidth(2).stroke();
      y += 18;

      doc.fillColor('#111827').font('Helvetica').fontSize(11);
      L.timelineSteps.forEach(step => {
        doc.text(`• ${step}`, 60, y, { width: 500 });
        y += 16;
      });

      // Terms
      y += 10;
      doc.fillColor(dark).font('Helvetica-Bold').fontSize(16).text(L.terms, 50, y);
      y += 18;
      doc.moveTo(50, y).lineTo(562, y).strokeColor(accent).lineWidth(2).stroke();
      y += 18;

      doc.fillColor('#334155').font('Helvetica').fontSize(10).text(L.termsBody, 50, y, { width: 512, lineGap: 4 });

      // CTA
      doc.addPage();
      doc.rect(0, 0, 612, 140).fill(dark);
      if (providerLogo) {
        try { doc.image(providerLogo, 50, 40, { height: 56 }); } catch (_) {}
      }
      doc.fillColor('white').font('Helvetica-Bold').fontSize(22).text(L.cta, 50, 170);
      doc.fillColor('#E5E7EB').font('Helvetica').fontSize(12).text(L.ctaBody, 50, 205, { width: 520, lineGap: 4 });

      doc.fillColor('#111827').font('Helvetica-Bold').fontSize(12).text(`${L.preparedBy}: IntelliAIScale`, 50, 260);

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
}

module.exports = { generateAuditPDF, generateProposalPDF };