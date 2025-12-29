// ================================
// MODULE PDF GENERATOR - Génération de rapports PDF
// ================================

const PDFDocument = require('pdfkit');

/**
 * Génère le rapport d'audit PDF (10-15 pages)
 */
async function generateAuditPDF(companyName, url, scrapedData, aiContent) {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: 'A4',
        margins: { top: 50, bottom: 50, left: 50, right: 50 },
        info: {
          Title: `Rapport d'Audit - ${companyName}`,
          Author: 'IAS Stealth Upgrade System',
          Subject: 'Audit de Site Web',
          Keywords: 'audit, site web, optimisation, conversion'
        }
      });

      const chunks = [];
      doc.on('data', chunk => chunks.push(chunk));
      doc.on('end', () => {
        const pdfBuffer = Buffer.concat(chunks);
        resolve(pdfBuffer.toString('base64'));
      });
      doc.on('error', reject);

      const primaryColor = scrapedData.colors?.[0] || '#0f204b';
      const secondaryColor = scrapedData.colors?.[1] || '#5bc236';

      // ================================
      // PAGE 1: COUVERTURE
      // ================================
      doc.rect(0, 0, doc.page.width, doc.page.height).fill(primaryColor);
      
      doc.fillColor('#ffffff')
         .fontSize(42)
         .font('Helvetica-Bold')
         .text('RAPPORT D\'AUDIT', 50, 200, { align: 'center' });
      
      doc.fontSize(24)
         .font('Helvetica')
         .text('Site Web & Opportunités Digitales', 50, 260, { align: 'center' });
      
      doc.fontSize(32)
         .font('Helvetica-Bold')
         .text(companyName, 50, 350, { align: 'center' });
      
      doc.fontSize(16)
         .font('Helvetica')
         .text(url, 50, 400, { align: 'center' });
      
      doc.fontSize(14)
         .text(`Date: ${new Date().toLocaleDateString('fr-FR')}`, 50, 500, { align: 'center' });
      
      doc.fontSize(12)
         .text('Généré par IAS Stealth Upgrade System', 50, 700, { align: 'center' });

      // ================================
      // PAGE 2: SOMMAIRE EXÉCUTIF
      // ================================
      doc.addPage();
      addHeader(doc, 'SOMMAIRE EXÉCUTIF', primaryColor);
      
      let y = 120;
      
      // Score global
      doc.fillColor(primaryColor)
         .fontSize(18)
         .font('Helvetica-Bold')
         .text('Score Global du Site', 50, y);
      
      y += 40;
      
      // Cercle de score
      const score = scrapedData.score || 50;
      const scoreColor = score >= 70 ? '#22c55e' : score >= 50 ? '#eab308' : '#ef4444';
      
      doc.circle(150, y + 40, 50)
         .lineWidth(8)
         .strokeColor(scoreColor)
         .stroke();
      
      doc.fillColor(scoreColor)
         .fontSize(36)
         .font('Helvetica-Bold')
         .text(`${score}`, 120, y + 25);
      
      doc.fillColor('#666666')
         .fontSize(14)
         .font('Helvetica')
         .text('/100', 165, y + 35);
      
      // Résumé
      doc.fillColor('#333333')
         .fontSize(12)
         .font('Helvetica')
         .text(`Ce rapport présente une analyse complète du site web de ${companyName}. ` +
               `Notre audit a identifié ${scrapedData.issues?.length || 0} problèmes majeurs et ` +
               `${scrapedData.opportunities?.length || 0} opportunités d'amélioration.`, 
               250, y, { width: 280 });
      
      y += 120;
      
      // Points clés
      doc.fillColor(primaryColor)
         .fontSize(16)
         .font('Helvetica-Bold')
         .text('Points Clés', 50, y);
      
      y += 30;
      
      const keyPoints = [
        `Industrie détectée: ${scrapedData.industry || 'Services'}`,
        `Problèmes critiques: ${scrapedData.issues?.filter(i => i.type === 'critical').length || 0}`,
        `Opportunités de croissance: ${scrapedData.opportunities?.length || 5}`,
        `Potentiel d'amélioration: +${100 - score}%`
      ];
      
      keyPoints.forEach(point => {
        doc.fillColor('#333333')
           .fontSize(12)
           .font('Helvetica')
           .text(`• ${point}`, 60, y);
        y += 25;
      });

      // ================================
      // PAGE 3: ANALYSE DÉTAILLÉE
      // ================================
      doc.addPage();
      addHeader(doc, 'ANALYSE DÉTAILLÉE', primaryColor);
      
      y = 120;
      
      // Informations du site
      doc.fillColor(primaryColor)
         .fontSize(16)
         .font('Helvetica-Bold')
         .text('Informations du Site', 50, y);
      
      y += 30;
      
      const siteInfo = [
        ['URL', url],
        ['Titre', scrapedData.title || 'Non détecté'],
        ['Description', scrapedData.description || 'Non disponible'],
        ['Industrie', scrapedData.industry || 'Services']
      ];
      
      siteInfo.forEach(([label, value]) => {
        doc.fillColor('#666666')
           .fontSize(10)
           .font('Helvetica-Bold')
           .text(label + ':', 60, y);
        doc.fillColor('#333333')
           .fontSize(10)
           .font('Helvetica')
           .text(value.substring(0, 60) + (value.length > 60 ? '...' : ''), 150, y, { width: 380 });
        y += 20;
      });
      
      y += 20;
      
      // Palette de couleurs
      doc.fillColor(primaryColor)
         .fontSize(16)
         .font('Helvetica-Bold')
         .text('Palette de Couleurs Détectée', 50, y);
      
      y += 30;
      
      const colors = scrapedData.colors || ['#0f204b', '#5bc236', '#ffffff'];
      let colorX = 60;
      
      colors.slice(0, 5).forEach(color => {
        doc.rect(colorX, y, 40, 40).fill(color);
        doc.rect(colorX, y, 40, 40).stroke('#cccccc');
        doc.fillColor('#666666')
           .fontSize(8)
           .font('Helvetica')
           .text(color, colorX, y + 45, { width: 40, align: 'center' });
        colorX += 60;
      });
      
      y += 80;
      
      // Polices
      doc.fillColor(primaryColor)
         .fontSize(16)
         .font('Helvetica-Bold')
         .text('Typographie Détectée', 50, y);
      
      y += 30;
      
      const fonts = scrapedData.fonts || ['Arial', 'Helvetica'];
      fonts.slice(0, 3).forEach(font => {
        doc.fillColor('#333333')
           .fontSize(12)
           .font('Helvetica')
           .text(`• ${font}`, 60, y);
        y += 20;
      });

      // ================================
      // PAGE 4: PROBLÈMES IDENTIFIÉS
      // ================================
      doc.addPage();
      addHeader(doc, 'PROBLÈMES IDENTIFIÉS', primaryColor);
      
      y = 120;
      
      const issues = scrapedData.issues || [];
      
      if (issues.length === 0) {
        doc.fillColor('#22c55e')
           .fontSize(14)
           .font('Helvetica')
           .text('Aucun problème majeur détecté.', 50, y);
      } else {
        issues.forEach((issue, index) => {
          if (y > 700) {
            doc.addPage();
            addHeader(doc, 'PROBLÈMES IDENTIFIÉS (suite)', primaryColor);
            y = 120;
          }
          
          const typeColor = issue.type === 'critical' ? '#ef4444' : 
                           issue.type === 'high' ? '#f97316' : 
                           issue.type === 'medium' ? '#eab308' : '#22c55e';
          
          // Badge de type
          doc.rect(50, y, 70, 20).fill(typeColor);
          doc.fillColor('#ffffff')
             .fontSize(10)
             .font('Helvetica-Bold')
             .text(issue.type?.toUpperCase() || 'INFO', 55, y + 5);
          
          // Titre
          doc.fillColor('#333333')
             .fontSize(14)
             .font('Helvetica-Bold')
             .text(`${index + 1}. ${issue.title}`, 130, y);
          
          y += 30;
          
          // Description
          doc.fillColor('#666666')
             .fontSize(11)
             .font('Helvetica')
             .text(issue.description || '', 60, y, { width: 480 });
          
          y += 30;
          
          // Impact
          if (issue.impact) {
            doc.fillColor('#ef4444')
               .fontSize(10)
               .font('Helvetica-Bold')
               .text(`Impact: ${issue.impact}`, 60, y);
            y += 25;
          }
          
          y += 15;
        });
      }

      // ================================
      // PAGE 5: OPPORTUNITÉS
      // ================================
      doc.addPage();
      addHeader(doc, 'OPPORTUNITÉS D\'AMÉLIORATION', primaryColor);
      
      y = 120;
      
      const opportunities = scrapedData.opportunities || [];
      
      opportunities.forEach((opp, index) => {
        if (y > 680) {
          doc.addPage();
          addHeader(doc, 'OPPORTUNITÉS (suite)', primaryColor);
          y = 120;
        }
        
        // Numéro
        doc.circle(65, y + 10, 15).fill(secondaryColor);
        doc.fillColor('#ffffff')
           .fontSize(12)
           .font('Helvetica-Bold')
           .text(`${index + 1}`, 60, y + 5);
        
        // Titre
        doc.fillColor('#333333')
           .fontSize(14)
           .font('Helvetica-Bold')
           .text(opp.title, 90, y);
        
        y += 25;
        
        // Description
        doc.fillColor('#666666')
           .fontSize(11)
           .font('Helvetica')
           .text(opp.description || '', 90, y, { width: 450 });
        
        y += 30;
        
        // Gain potentiel
        if (opp.potentialGain) {
          doc.fillColor(secondaryColor)
             .fontSize(11)
             .font('Helvetica-Bold')
             .text(`💰 Gain potentiel: ${opp.potentialGain}`, 90, y);
          y += 25;
        }
        
        y += 20;
      });

      // ================================
      // PAGE 6: SOLUTIONS PROPOSÉES
      // ================================
      doc.addPage();
      addHeader(doc, 'SOLUTIONS PROPOSÉES', primaryColor);
      
      y = 120;
      
      const solutions = [
        {
          title: 'Site Web Moderne & Responsive',
          description: 'Refonte complète avec design professionnel, optimisé pour mobile et conversion.',
          features: ['Design responsive', 'Optimisation SEO', 'Temps de chargement rapide', 'CTA stratégiques']
        },
        {
          title: 'Chatbot IA 24/7',
          description: 'Agent conversationnel intelligent pour qualifier et convertir les visiteurs.',
          features: ['Réponses instantanées', 'Qualification automatique', 'Prise de RDV', 'Intégration CRM']
        },
        {
          title: 'Voice AI Agent',
          description: 'Agent vocal pour gérer les appels entrants et prendre des rendez-vous.',
          features: ['Disponible 24/7', 'Voix naturelle', 'Transfert intelligent', 'Rappels automatiques']
        },
        {
          title: 'Automatisation Réseaux Sociaux',
          description: 'Gestion automatisée de Facebook et Instagram avec réponses IA.',
          features: ['Réponses automatiques', 'Publication programmée', 'Génération de contenu', 'Analytics']
        }
      ];
      
      solutions.forEach((solution, index) => {
        if (y > 650) {
          doc.addPage();
          addHeader(doc, 'SOLUTIONS PROPOSÉES (suite)', primaryColor);
          y = 120;
        }
        
        // Titre
        doc.fillColor(primaryColor)
           .fontSize(16)
           .font('Helvetica-Bold')
           .text(`${index + 1}. ${solution.title}`, 50, y);
        
        y += 25;
        
        // Description
        doc.fillColor('#333333')
           .fontSize(11)
           .font('Helvetica')
           .text(solution.description, 60, y, { width: 480 });
        
        y += 30;
        
        // Features
        solution.features.forEach(feature => {
          doc.fillColor(secondaryColor)
             .fontSize(10)
             .font('Helvetica')
             .text(`✓ ${feature}`, 70, y);
          y += 18;
        });
        
        y += 20;
      });

      // ================================
      // PAGE 7: PLAN D'ACTION
      // ================================
      doc.addPage();
      addHeader(doc, 'PLAN D\'ACTION RECOMMANDÉ', primaryColor);
      
      y = 120;
      
      const phases = [
        { phase: 'Phase 1', title: 'Audit & Stratégie', duration: 'Semaine 1', tasks: ['Analyse approfondie', 'Définition des objectifs', 'Validation du plan'] },
        { phase: 'Phase 2', title: 'Design & Développement', duration: 'Semaines 2-3', tasks: ['Maquettes', 'Développement', 'Tests'] },
        { phase: 'Phase 3', title: 'Intégration IA', duration: 'Semaine 4', tasks: ['Configuration chatbot', 'Voice AI', 'Tests'] },
        { phase: 'Phase 4', title: 'Lancement & Optimisation', duration: 'Semaine 5+', tasks: ['Mise en ligne', 'Formation', 'Suivi'] }
      ];
      
      phases.forEach(phase => {
        // En-tête de phase
        doc.rect(50, y, 495, 30).fill(primaryColor);
        doc.fillColor('#ffffff')
           .fontSize(12)
           .font('Helvetica-Bold')
           .text(`${phase.phase}: ${phase.title}`, 60, y + 8);
        doc.text(phase.duration, 400, y + 8);
        
        y += 40;
        
        // Tâches
        phase.tasks.forEach(task => {
          doc.fillColor('#333333')
             .fontSize(11)
             .font('Helvetica')
             .text(`• ${task}`, 70, y);
          y += 20;
        });
        
        y += 20;
      });

      // ================================
      // PAGE 8: INVESTISSEMENT
      // ================================
      doc.addPage();
      addHeader(doc, 'INVESTISSEMENT', primaryColor);
      
      y = 120;
      
      doc.fillColor('#333333')
         .fontSize(12)
         .font('Helvetica')
         .text('Nous proposons deux forfaits adaptés à vos besoins:', 50, y);
      
      y += 40;
      
      // Forfait Essentiel
      doc.rect(50, y, 230, 250).stroke(primaryColor);
      doc.fillColor(primaryColor)
         .fontSize(18)
         .font('Helvetica-Bold')
         .text('ESSENTIEL', 60, y + 20);
      
      doc.fillColor('#333333')
         .fontSize(12)
         .font('Helvetica')
         .text('✓ Site web moderne', 60, y + 60)
         .text('✓ Chatbot IA basique', 60, y + 85)
         .text('✓ 3 pages', 60, y + 110)
         .text('✓ Responsive design', 60, y + 135)
         .text('✓ Formation 1h', 60, y + 160);
      
      doc.fillColor(secondaryColor)
         .fontSize(24)
         .font('Helvetica-Bold')
         .text('Sur devis', 60, y + 200);
      
      // Forfait Premium
      doc.rect(265, y, 230, 250).fill(primaryColor);
      doc.fillColor('#ffffff')
         .fontSize(18)
         .font('Helvetica-Bold')
         .text('PREMIUM', 275, y + 20);
      
      doc.fillColor('#ffffff')
         .fontSize(12)
         .font('Helvetica')
         .text('✓ Site web complet', 275, y + 60)
         .text('✓ Chatbot IA avancé', 275, y + 85)
         .text('✓ Voice AI Agent', 275, y + 110)
         .text('✓ Automatisation RS', 275, y + 135)
         .text('✓ Formation complète', 275, y + 160)
         .text('✓ Support 3 mois', 275, y + 185);
      
      doc.fillColor('#ffffff')
         .fontSize(24)
         .font('Helvetica-Bold')
         .text('Sur devis', 275, y + 210);

      // ================================
      // PAGE 9: CONTACT
      // ================================
      doc.addPage();
      addHeader(doc, 'PROCHAINES ÉTAPES', primaryColor);
      
      y = 120;
      
      doc.fillColor('#333333')
         .fontSize(14)
         .font('Helvetica')
         .text('Pour discuter de ce rapport et des solutions proposées, contactez-nous:', 50, y);
      
      y += 50;
      
      doc.fillColor(primaryColor)
         .fontSize(16)
         .font('Helvetica-Bold')
         .text('📞 Réservez un appel découverte gratuit', 50, y);
      
      y += 30;
      
      doc.fillColor('#333333')
         .fontSize(12)
         .font('Helvetica')
         .text('Un appel de 15 minutes pour:', 60, y);
      
      y += 25;
      
      ['Discuter de vos objectifs', 'Répondre à vos questions', 'Définir un plan d\'action personnalisé'].forEach(item => {
        doc.text(`• ${item}`, 70, y);
        y += 20;
      });
      
      y += 40;
      
      // CTA
      doc.rect(50, y, 495, 80).fill(secondaryColor);
      doc.fillColor('#ffffff')
         .fontSize(18)
         .font('Helvetica-Bold')
         .text('Prêt à transformer votre présence digitale ?', 60, y + 15, { align: 'center', width: 475 });
      doc.fontSize(14)
         .font('Helvetica')
         .text('Répondez à cet email ou appelez-nous pour planifier votre appel découverte.', 60, y + 45, { align: 'center', width: 475 });

      // ================================
      // PAGE 10: ANNEXES
      // ================================
      doc.addPage();
      addHeader(doc, 'ANNEXES', primaryColor);
      
      y = 120;
      
      doc.fillColor(primaryColor)
         .fontSize(14)
         .font('Helvetica-Bold')
         .text('A. Méthodologie d\'audit', 50, y);
      
      y += 25;
      
      doc.fillColor('#333333')
         .fontSize(11)
         .font('Helvetica')
         .text('Notre audit utilise une combinaison d\'analyse automatisée et d\'expertise humaine pour évaluer:', 60, y, { width: 480 });
      
      y += 40;
      
      ['Performance technique', 'Expérience utilisateur', 'Optimisation conversion', 'Présence digitale', 'Opportunités IA'].forEach(item => {
        doc.text(`• ${item}`, 70, y);
        y += 20;
      });
      
      y += 30;
      
      doc.fillColor(primaryColor)
         .fontSize(14)
         .font('Helvetica-Bold')
         .text('B. À propos de IAS', 50, y);
      
      y += 25;
      
      doc.fillColor('#333333')
         .fontSize(11)
         .font('Helvetica')
         .text('IAS Stealth Upgrade System est une solution complète de transformation digitale. ' +
               'Nous aidons les entreprises à moderniser leur présence en ligne et à automatiser ' +
               'leur acquisition de clients grâce à l\'intelligence artificielle.', 60, y, { width: 480 });

      // Finaliser le PDF
      doc.end();

    } catch (error) {
      reject(error);
    }
  });
}

/**
 * Génère la proposition de service PDF
 */
async function generateProposalPDF(companyName, url, scrapedData) {
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

      const primaryColor = scrapedData.colors?.[0] || '#0f204b';
      const secondaryColor = scrapedData.colors?.[1] || '#5bc236';

      // PAGE 1: COUVERTURE
      doc.rect(0, 0, doc.page.width, doc.page.height).fill(primaryColor);
      
      doc.fillColor('#ffffff')
         .fontSize(36)
         .font('Helvetica-Bold')
         .text('PROPOSITION DE SERVICE', 50, 200, { align: 'center' });
      
      doc.fontSize(20)
         .font('Helvetica')
         .text('Gestion Réseaux Sociaux', 50, 260, { align: 'center' });
      
      doc.fontSize(28)
         .font('Helvetica-Bold')
         .text(companyName, 50, 350, { align: 'center' });
      
      doc.fontSize(14)
         .text(`Date: ${new Date().toLocaleDateString('fr-FR')}`, 50, 500, { align: 'center' });

      // PAGE 2: FORFAITS
      doc.addPage();
      addHeader(doc, 'NOS FORFAITS RÉSEAUX SOCIAUX', primaryColor);
      
      let y = 120;
      
      // Forfait 1: Essentiel
      doc.rect(50, y, 495, 200).stroke(primaryColor);
      
      doc.fillColor(primaryColor)
         .fontSize(20)
         .font('Helvetica-Bold')
         .text('FORFAIT ESSENTIEL', 60, y + 15);
      
      doc.fillColor('#333333')
         .fontSize(11)
         .font('Helvetica');
      
      const essentialFeatures = [
        '✓ Gestion de 2 réseaux (Facebook + Instagram)',
        '✓ 12 publications par mois',
        '✓ Création de visuels',
        '✓ Réponses aux commentaires',
        '✓ Rapport mensuel',
        '✓ 1 story par semaine'
      ];
      
      let featureY = y + 50;
      essentialFeatures.forEach(feature => {
        doc.text(feature, 70, featureY);
        featureY += 20;
      });
      
      doc.fillColor(secondaryColor)
         .fontSize(24)
         .font('Helvetica-Bold')
         .text('497€/mois', 380, y + 80);
      
      y += 220;
      
      // Forfait 2: Premium
      doc.rect(50, y, 495, 220).fill(primaryColor);
      
      doc.fillColor('#ffffff')
         .fontSize(20)
         .font('Helvetica-Bold')
         .text('FORFAIT PREMIUM', 60, y + 15);
      
      doc.fillColor('#ffffff')
         .fontSize(11)
         .font('Helvetica');
      
      const premiumFeatures = [
        '✓ Gestion de 3 réseaux (FB + IG + LinkedIn)',
        '✓ 20 publications par mois',
        '✓ Création de visuels premium',
        '✓ Réponses aux commentaires et DMs',
        '✓ Rapport hebdomadaire',
        '✓ 3 stories par semaine',
        '✓ 1 Reel/mois',
        '✓ Stratégie de contenu personnalisée'
      ];
      
      featureY = y + 50;
      premiumFeatures.forEach(feature => {
        doc.text(feature, 70, featureY);
        featureY += 18;
      });
      
      doc.fillColor('#ffffff')
         .fontSize(24)
         .font('Helvetica-Bold')
         .text('897€/mois', 380, y + 90);

      // PAGE 3: CONDITIONS
      doc.addPage();
      addHeader(doc, 'CONDITIONS & ENGAGEMENT', primaryColor);
      
      y = 120;
      
      doc.fillColor('#333333')
         .fontSize(12)
         .font('Helvetica')
         .text('Engagement minimum: 3 mois', 50, y)
         .text('Paiement: Mensuel, en début de mois', 50, y + 25)
         .text('Délai de mise en place: 1 semaine', 50, y + 50)
         .text('Résiliation: Préavis de 30 jours', 50, y + 75);
      
      y += 120;
      
      doc.fillColor(primaryColor)
         .fontSize(16)
         .font('Helvetica-Bold')
         .text('Ce qui est inclus:', 50, y);
      
      y += 30;
      
      ['Création de tous les visuels', 'Rédaction des textes', 'Programmation des publications', 
       'Veille et réponses', 'Reporting et analyse', 'Réunion mensuelle de suivi'].forEach(item => {
        doc.fillColor('#333333')
           .fontSize(11)
           .font('Helvetica')
           .text(`✓ ${item}`, 60, y);
        y += 20;
      });
      
      y += 30;
      
      // CTA
      doc.rect(50, y, 495, 80).fill(secondaryColor);
      doc.fillColor('#ffffff')
         .fontSize(16)
         .font('Helvetica-Bold')
         .text('Prêt à booster votre présence sur les réseaux sociaux ?', 60, y + 15, { align: 'center', width: 475 });
      doc.fontSize(12)
         .font('Helvetica')
         .text('Contactez-nous pour démarrer votre accompagnement.', 60, y + 45, { align: 'center', width: 475 });

      doc.end();

    } catch (error) {
      reject(error);
    }
  });
}

/**
 * Ajoute un en-tête de page
 */
function addHeader(doc, title, color) {
  doc.rect(0, 0, doc.page.width, 80).fill(color);
  doc.fillColor('#ffffff')
     .fontSize(24)
     .font('Helvetica-Bold')
     .text(title, 50, 30);
}

module.exports = {
  generateAuditPDF,
  generateProposalPDF
};
