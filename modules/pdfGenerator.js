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
      console.log('[PDF] ✅ Rapport d'audit généré');

    } catch (error) {
      console.error('[PDF] Erreur:', error.message);
      reject(error);
    }
  });
}

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

      // Couverture
      doc.fontSize(32).fillColor('#0f204b').text('Proposition Commerciale', 50, 200);
      doc.fontSize(24).fillColor('#5bc236').text(companyName, 50, 250);

      // Page 2: Offre
      doc.addPage();
      doc.fontSize(20).fillColor('#0f204b').text('Notre Offre', 50, 50);
      doc.fontSize(12).fillColor('#666').text('• Site web modernisé', 50, 100);
      doc.text('• Chatbot IA intégré', 50, 130);
      doc.text('• Formation complète', 50, 160);

      doc.end();
      console.log('[PDF] ✅ Proposition commerciale générée');

    } catch (error) {
      console.error('[PDF] Erreur:', error.message);
      reject(error);
    }
  });
}

module.exports = { generateAuditPDF, generateProposalPDF };
