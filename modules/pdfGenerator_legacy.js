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

async function generateProposalPDF(companyName, url, scrapedData, logoUrl = null) {
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

      const primaryColor = '#2D7A8F';
      const accentColor = '#5bc236';
      const darkColor = '#0f204b';
      const date = new Date().toLocaleDateString('fr-FR', { year: 'numeric', month: 'long', day: 'numeric' });

      // ============================================================
      // PAGE 1: COUVERTURE PROFESSIONNELLE
      // ============================================================
      
      doc.rect(0, 0, 595, 300).fill(darkColor);
      
      doc.fontSize(36).fillColor('#FFFFFF').font('Helvetica-Bold')
         .text('PROPOSITION', 50, 100, { align: 'center' });
      doc.fontSize(32).fillColor(accentColor)
         .text('COMMERCIALE', 50, 145, { align: 'center' });
      
      doc.fontSize(18).fillColor('#FFFFFF').font('Helvetica')
         .text(companyName, 50, 220, { align: 'center' });
      
      doc.fontSize(12).fillColor('#CCCCCC')
         .text(`Transformation Digitale Complète | ${date}`, 50, 255, { align: 'center' });

      // Bas de page
      doc.fontSize(10).fillColor('#666666')
         .text('IAS - Intelli AI Scale | darly@intelliaiscale.com', 50, 750, { align: 'center' });

      // ============================================================
      // PAGE 2: RÉSUMÉ EXÉCUTIF
      // ============================================================
      
      doc.addPage();
      
      doc.fontSize(24).fillColor(darkColor).font('Helvetica-Bold')
         .text('Résumé Exécutif', 50, 50);
      
      doc.moveTo(50, 85).lineTo(545, 85).strokeColor(accentColor).lineWidth(2).stroke();
      
      doc.fontSize(12).fillColor('#333333').font('Helvetica')
         .text(`Après analyse approfondie de votre site web ${url}, nous avons identifié des opportunités stratégiques pour transformer votre présence digitale.`, 50, 110, {
           width: 495,
           align: 'justify',
           lineGap: 8
         });

      doc.moveDown(1.5);
      
      doc.fontSize(14).fillColor(darkColor).font('Helvetica-Bold')
         .text('Score Actuel de Votre Site', 50, doc.y);
      
      doc.fontSize(48).fillColor(scrapedData.score >= 70 ? accentColor : '#EF4444')
         .text(`${scrapedData.score}/100`, 50, doc.y + 10);
      
      doc.fontSize(12).fillColor('#666666').font('Helvetica')
         .text('Notre objectif : atteindre un score de 95+ en 30 jours.', 50, doc.y + 10);

      doc.moveDown(2);
      
      doc.fontSize(14).fillColor(darkColor).font('Helvetica-Bold')
         .text('Opportunités Identifiées', 50, doc.y);
      
      const issues = scrapedData.issues || ['Amélioration du design', 'Optimisation mobile', 'Intégration IA'];
      issues.slice(0, 5).forEach((issue, i) => {
        doc.fontSize(11).fillColor('#333333').font('Helvetica')
           .text(`${i + 1}. ${issue}`, 70, doc.y + 15, { width: 475 });
      });

      // ============================================================
      // PAGE 3: PACKAGE ESSENTIEL
      // ============================================================
      
      doc.addPage();
      
      doc.rect(50, 50, 495, 80).fillAndStroke('#F0F9FF', '#2D7A8F');
      
      doc.fontSize(22).fillColor(darkColor).font('Helvetica-Bold')
         .text('PACKAGE ESSENTIEL', 70, 70);
      doc.fontSize(12).fillColor('#666666').font('Helvetica')
         .text('Transformation digitale fondamentale pour démarrer', 70, 100);
      
      // Inclusions
      doc.fontSize(14).fillColor(darkColor).font('Helvetica-Bold')
         .text('Inclus dans ce Package :', 50, 160);
      
      const essentialInclusions = [
        '✓ Site Web Modernisé (Design Responsive)',
        '✓ Optimisation Mobile et Tablette',
        '✓ Chatbot IA Basique (Qualification Prospects)',
        '✓ Migration vers GoHighLevel',
        '✓ Formation Équipe (2h)',
        '✓ Support Email 30 jours',
        '✓ Rapport d\'Audit Détaillé'
      ];
      
      essentialInclusions.forEach((item, i) => {
        doc.fontSize(11).fillColor('#333333').font('Helvetica')
           .text(item, 70, 190 + (i * 25), { width: 450 });
      });
      
      // Investissement
      doc.moveDown(2);
      doc.fontSize(14).fillColor(darkColor).font('Helvetica-Bold')
         .text('Investissement', 50, doc.y + 20);
      
      doc.rect(50, doc.y + 10, 495, 100).fillAndStroke('#F9FAFB', '#E5E7EB');
      
      const yPos = doc.y + 30;
      doc.fontSize(12).fillColor('#666666').font('Helvetica')
         .text('Setup Fee (Paiement Unique)', 70, yPos);
      doc.fontSize(20).fillColor(accentColor).font('Helvetica-Bold')
         .text('2 997 CAD', 400, yPos - 5);
      
      doc.fontSize(12).fillColor('#666666').font('Helvetica')
         .text('Retainer Mensuel', 70, yPos + 50);
      doc.fontSize(20).fillColor(primaryColor).font('Helvetica-Bold')
         .text('497 CAD/mois', 370, yPos + 45);
      
      doc.fontSize(10).fillColor('#999999').font('Helvetica-Oblique')
         .text('* Engagement minimum 3 mois', 70, yPos + 80);

      // ============================================================
      // PAGE 4: PACKAGE PREMIUM
      // ============================================================
      
      doc.addPage();
      
      doc.rect(50, 50, 495, 80).fillAndStroke('#F0FDF4', '#5bc236');
      
      doc.fontSize(22).fillColor(darkColor).font('Helvetica-Bold')
         .text('PACKAGE PREMIUM', 70, 65);
      doc.fontSize(11).fillColor(accentColor).font('Helvetica-Bold')
         .text('⭐ RECOMMANDÉ', 70, 95);
      doc.fontSize(12).fillColor('#666666').font('Helvetica')
         .text('Solution complète pour dominer votre marché', 70, 110);
      
      // Inclusions
      doc.fontSize(14).fillColor(darkColor).font('Helvetica-Bold')
         .text('Tout le Package Essentiel, PLUS :', 50, 160);
      
      const premiumInclusions = [
        '✓ Agent Vocal IA Avancé (Prise de RDV Automatisée)',
        '✓ Système de Prospection Automatisée',
        '✓ 6 Visuels Réseaux Sociaux Mensuels (DALL-E)',
        '✓ Optimisation SEO Avancée',
        '✓ Intégration CRM Complète',
        '✓ Tableaux de Bord Analytics',
        '✓ Formation Approfondie (6h)',
        '✓ Support Prioritaire (Email + Slack)',
        '✓ Mises à Jour Mensuelles',
        '✓ Consultation Stratégique Mensuelle (1h)'
      ];
      
      premiumInclusions.forEach((item, i) => {
        doc.fontSize(11).fillColor('#333333').font('Helvetica')
           .text(item, 70, 190 + (i * 22), { width: 450 });
      });
      
      // Investissement
      doc.addPage();
      
      doc.fontSize(20).fillColor(darkColor).font('Helvetica-Bold')
         .text('Investissement Package Premium', 50, 50);
      
      doc.rect(50, 90, 495, 120).fillAndStroke('#F0FDF4', '#5bc236');
      
      const yPos2 = 110;
      doc.fontSize(12).fillColor('#666666').font('Helvetica')
         .text('Setup Fee (Paiement Unique)', 70, yPos2);
      doc.fontSize(24).fillColor(accentColor).font('Helvetica-Bold')
         .text('4 997 CAD', 380, yPos2 - 8);
      
      doc.fontSize(12).fillColor('#666666').font('Helvetica')
         .text('Retainer Mensuel', 70, yPos2 + 60);
      doc.fontSize(24).fillColor(primaryColor).font('Helvetica-Bold')
         .text('997 CAD/mois', 350, yPos2 + 52);
      
      doc.fontSize(10).fillColor('#999999').font('Helvetica-Oblique')
         .text('* Engagement minimum 6 mois', 70, yPos2 + 100);

      // ROI Estimé
      doc.moveDown(3);
      doc.fontSize(16).fillColor(darkColor).font('Helvetica-Bold')
         .text('Retour sur Investissement Estimé', 50, doc.y + 20);
      
      doc.rect(50, doc.y + 10, 495, 150).fillAndStroke('#FFFBEB', '#F59E0B');
      
      const yPos3 = doc.y + 30;
      doc.fontSize(12).fillColor('#333333').font('Helvetica')
         .text('Avec notre Package Premium, nos clients observent en moyenne :', 70, yPos3, { width: 455, align: 'justify' });
      
      doc.fontSize(11).fillColor('#666666').font('Helvetica')
         .text('• +150% de leads qualifiés générés', 90, yPos3 + 40)
         .text('• +75% de taux de conversion', 90, yPos3 + 60)
         .text('• -60% de coûts opérationnels (automatisation)', 90, yPos3 + 80)
         .text('• ROI positif dès le 3e mois', 90, yPos3 + 100);

      // ============================================================
      // PAGE 5: CONDITIONS & GARANTIES
      // ============================================================
      
      doc.addPage();
      
      doc.fontSize(24).fillColor(darkColor).font('Helvetica-Bold')
         .text('Conditions & Garanties', 50, 50);
      
      doc.moveTo(50, 85).lineTo(545, 85).strokeColor(accentColor).lineWidth(2).stroke();
      
      // Période d'essai
      doc.fontSize(16).fillColor(primaryColor).font('Helvetica-Bold')
         .text('🛡️ Période d\'Essai de 30 Jours', 50, 110);
      
      doc.fontSize(11).fillColor('#333333').font('Helvetica')
         .text('Si vous optez pour une mise à jour complète de votre site web avec notre Agent Vocal IA intégré, nous offrons une période d\'essai de 30 jours. Si vous n\'êtes pas satisfait des résultats, nous travaillerons avec vous pour ajuster la solution jusqu\'à atteindre vos objectifs.', 50, 140, {
           width: 495,
           align: 'justify',
           lineGap: 6
         });
      
      // Conditions
      doc.moveDown(2);
      doc.fontSize(16).fillColor(primaryColor).font('Helvetica-Bold')
         .text('📋 Conditions Générales', 50, doc.y + 20);
      
      const conditions = [
        '• Setup Fee payable à la signature du contrat',
        '• Retainer mensuel facturé en début de mois',
        '• Résiliation possible avec préavis de 30 jours après période d\'engagement',
        '• Données et code source restent votre propriété',
        '• Support inclus durant toute la durée du contrat',
        '• Mises à jour et améliorations continues incluses'
      ];
      
      conditions.forEach((cond, i) => {
        doc.fontSize(11).fillColor('#333333').font('Helvetica')
           .text(cond, 70, doc.y + 15, { width: 475 });
      });
      
      // Timeline
      doc.moveDown(2);
      doc.fontSize(16).fillColor(primaryColor).font('Helvetica-Bold')
         .text('⏱️ Timeline de Livraison', 50, doc.y + 20);
      
      doc.fontSize(11).fillColor('#333333').font('Helvetica')
         .text('• Jours 1-7 : Analyse approfondie et planification', 70, doc.y + 20)
         .text('• Jours 8-21 : Développement et intégration', 70, doc.y + 10)
         .text('• Jours 22-28 : Tests et optimisations', 70, doc.y + 10)
         .text('• Jour 30 : Mise en ligne et formation', 70, doc.y + 10);

      // ============================================================
      // PAGE 6: PROCHAINES ÉTAPES
      // ============================================================
      
      doc.addPage();
      
      doc.fontSize(24).fillColor(darkColor).font('Helvetica-Bold')
         .text('Prochaines Étapes', 50, 50);
      
      doc.moveTo(50, 85).lineTo(545, 85).strokeColor(accentColor).lineWidth(2).stroke();
      
      doc.fontSize(14).fillColor(darkColor).font('Helvetica-Bold')
         .text('Pour Démarrer Votre Transformation Digitale :', 50, 120);
      
      const steps = [
        {
          title: '1. Choisir Votre Package',
          desc: 'Sélectionnez le package qui correspond le mieux à vos objectifs (Essentiel ou Premium).'
        },
        {
          title: '2. Appel de Découverte (30 min)',
          desc: 'Planifiez un appel avec notre équipe pour affiner les détails et répondre à vos questions.'
        },
        {
          title: '3. Signature du Contrat',
          desc: 'Finalisation des documents et paiement du Setup Fee pour commencer.'
        },
        {
          title: '4. Lancement du Projet',
          desc: 'Notre équipe démarre immédiatement après signature (kick-off meeting dans 48h).'
        }
      ];
      
      let yStep = 170;
      steps.forEach(step => {
        doc.fontSize(13).fillColor(primaryColor).font('Helvetica-Bold')
           .text(step.title, 50, yStep);
        doc.fontSize(11).fillColor('#666666').font('Helvetica')
           .text(step.desc, 70, yStep + 20, { width: 475, lineGap: 4 });
        yStep += 85;
      });
      
      // CTA Final
      doc.rect(50, 580, 495, 120).fillAndStroke('#EFF6FF', primaryColor);
      
      doc.fontSize(18).fillColor(darkColor).font('Helvetica-Bold')
         .text('Prêt à Transformer Votre Entreprise ?', 70, 605, { align: 'center', width: 455 });
      
      doc.fontSize(12).fillColor('#666666').font('Helvetica')
         .text('Contactez-nous dès aujourd\'hui pour planifier votre appel de découverte', 70, 640, { align: 'center', width: 455 });
      
      doc.fontSize(14).fillColor(accentColor).font('Helvetica-Bold')
         .text('📧 darly@intelliaiscale.com', 70, 670, { align: 'center', width: 455 });

      // Footer
      doc.fontSize(9).fillColor('#999999').font('Helvetica')
         .text(`IAS - Intelli AI Scale | Proposition valide 30 jours | ${date}`, 50, 750, { align: 'center', width: 495 });

      doc.end();
      console.log('[PDF] Proposition commerciale professionnelle generee');

    } catch (error) {
      console.error('[PDF] Erreur:', error.message);
      reject(error);
    }
  });
}

module.exports = { generateAuditPDF, generateProposalPDF };
