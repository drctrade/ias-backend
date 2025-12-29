// ================================
// MODULE PROSPECT FINDER - Recherche de prospects qualifiés
// ================================

const axios = require('axios');

/**
 * Trouve 10 prospects qualifiés basés sur l'industrie
 */
async function findProspects(industry, companyName) {
  console.log(`[PROSPECTS] Recherche de prospects pour l'industrie: ${industry}`);

  // Définir les critères de ciblage par industrie
  const targetingCriteria = getTargetingCriteria(industry);

  // Générer des prospects simulés (en production, utiliser Apollo.io, LinkedIn, etc.)
  const prospects = generateQualifiedProspects(industry, targetingCriteria, companyName);

  return {
    industry: industry,
    targetingCriteria: targetingCriteria,
    prospects: prospects,
    searchStrategy: getSearchStrategy(industry),
    recommendedChannels: getRecommendedChannels(industry)
  };
}

/**
 * Définit les critères de ciblage par industrie
 */
function getTargetingCriteria(industry) {
  const criteria = {
    'Restaurant': {
      businessTypes: ['Restaurants', 'Cafés', 'Bars', 'Traiteurs', 'Food trucks'],
      painPoints: ['Pas de réservation en ligne', 'Site web obsolète', 'Pas de présence sur les réseaux sociaux', 'Pas de système de commande en ligne'],
      idealSize: '5-50 employés',
      revenue: '200K€ - 2M€',
      signals: ['Site web de plus de 3 ans', 'Pas de chatbot', 'Avis Google < 4.0', 'Pas de menu en ligne']
    },
    'Immobilier': {
      businessTypes: ['Agences immobilières', 'Courtiers', 'Promoteurs', 'Gestionnaires de biens'],
      painPoints: ['Pas de visite virtuelle', 'Site non responsive', 'Pas de chatbot pour les demandes', 'Processus de lead manuel'],
      idealSize: '3-30 employés',
      revenue: '500K€ - 5M€',
      signals: ['Annonces non optimisées', 'Pas de CRM visible', 'Formulaires basiques', 'Pas d\'automatisation']
    },
    'Santé': {
      businessTypes: ['Cabinets médicaux', 'Dentistes', 'Kinésithérapeutes', 'Cliniques', 'Spécialistes'],
      painPoints: ['Pas de prise de RDV en ligne', 'Téléphone saturé', 'Pas de rappels automatiques', 'Site non sécurisé'],
      idealSize: '2-20 employés',
      revenue: '300K€ - 3M€',
      signals: ['Doctolib non utilisé', 'Site web basique', 'Pas de présence digitale', 'Avis non gérés']
    },
    'Beauté': {
      businessTypes: ['Salons de coiffure', 'Instituts de beauté', 'Spas', 'Barbiers', 'Ongleries'],
      painPoints: ['Pas de réservation en ligne', 'Pas de fidélisation digitale', 'Photos non professionnelles', 'Pas de présence Instagram'],
      idealSize: '1-15 employés',
      revenue: '100K€ - 1M€',
      signals: ['Planity non utilisé', 'Instagram < 1000 followers', 'Site web absent ou obsolète', 'Pas de galerie photos']
    },
    'Fitness': {
      businessTypes: ['Salles de sport', 'Coachs personnels', 'Studios yoga/pilates', 'CrossFit', 'Clubs de fitness'],
      painPoints: ['Pas de réservation de cours en ligne', 'Pas d\'app mobile', 'Pas de suivi client', 'Marketing limité'],
      idealSize: '2-30 employés',
      revenue: '150K€ - 2M€',
      signals: ['Pas de système de booking', 'Site non mobile', 'Pas de programme de fidélité', 'Réseaux sociaux inactifs']
    },
    'Juridique': {
      businessTypes: ['Cabinets d\'avocats', 'Notaires', 'Huissiers', 'Conseillers juridiques'],
      painPoints: ['Site web non professionnel', 'Pas de prise de RDV en ligne', 'Pas de chatbot pour les questions', 'Pas de contenu éducatif'],
      idealSize: '2-50 employés',
      revenue: '500K€ - 10M€',
      signals: ['Site web daté', 'Pas de blog juridique', 'Formulaire de contact basique', 'Pas de FAQ']
    },
    'Construction': {
      businessTypes: ['Entreprises de construction', 'Rénovation', 'Artisans', 'Architectes', 'Décorateurs'],
      painPoints: ['Pas de portfolio en ligne', 'Pas de devis en ligne', 'Site non responsive', 'Pas de témoignages clients'],
      idealSize: '5-100 employés',
      revenue: '500K€ - 10M€',
      signals: ['Pas de galerie de réalisations', 'Site web basique', 'Pas de présence Google My Business', 'Avis non sollicités']
    },
    'Services Professionnels': {
      businessTypes: ['Consultants', 'Comptables', 'Agences marketing', 'Formateurs', 'Coachs'],
      painPoints: ['Pas de tunnel de vente', 'Site non optimisé conversion', 'Pas de lead magnet', 'Pas d\'automatisation'],
      idealSize: '1-50 employés',
      revenue: '200K€ - 5M€',
      signals: ['Pas de blog', 'Pas de newsletter', 'Formulaires basiques', 'Pas de CRM']
    }
  };

  return criteria[industry] || criteria['Services Professionnels'];
}

/**
 * Génère des prospects qualifiés simulés
 */
function generateQualifiedProspects(industry, criteria, excludeCompany) {
  const prospects = [];
  
  // Noms d'entreprises par industrie
  const companyNames = {
    'Restaurant': ['Le Petit Bistrot', 'La Table Gourmande', 'Chez Marcel', 'L\'Atelier du Chef', 'Saveurs d\'Ailleurs', 'Le Comptoir Parisien', 'La Brasserie du Coin', 'Pizzeria Napoli', 'Sushi Master', 'Le Jardin Secret'],
    'Immobilier': ['Immo Plus', 'Century Habitat', 'Nexity Local', 'Orpi Centre', 'Laforêt Immobilier', 'Guy Hoquet', 'Square Habitat', 'Stéphane Plaza', 'ERA Immobilier', 'Arthurimmo'],
    'Santé': ['Cabinet Dr. Martin', 'Clinique du Parc', 'Centre Dentaire Plus', 'Kiné Santé', 'Dr. Dubois', 'Centre Médical Voltaire', 'Ostéo Bien-Être', 'Cabinet Santé Plus', 'Clinique des Lilas', 'Dr. Moreau'],
    'Beauté': ['Salon Élégance', 'Institut Belle & Zen', 'Coiff\'Style', 'Spa Sérénité', 'L\'Atelier Beauté', 'Hair Design', 'Nails Art Studio', 'Beauty Lounge', 'Le Salon de Marie', 'Esthétique Plus'],
    'Fitness': ['Fitness Park', 'Basic Fit Local', 'CrossFit Box', 'Yoga Studio', 'Club Forme', 'Gym Tonic', 'Sport & Santé', 'FitZone', 'Body Training', 'Wellness Club'],
    'Juridique': ['Cabinet Dupont & Associés', 'Maître Laurent', 'Notaire Martin', 'Cabinet Juridique Plus', 'Avocats Conseil', 'Étude Legrand', 'Cabinet Droit & Conseil', 'Maître Dubois', 'Notaires Réunis', 'Cabinet Juridique Central'],
    'Construction': ['Bâti Plus', 'Réno Expert', 'Constructions Modernes', 'Artisan Pro', 'Maison Concept', 'Travaux & Co', 'Bâtiment Solutions', 'Rénovation Express', 'Construire Ensemble', 'Habitat Design'],
    'Services Professionnels': ['Conseil Plus', 'Expert Compta', 'Marketing Pro', 'Formation Elite', 'Coach Business', 'Stratégie & Co', 'Consulting Group', 'Digital Agency', 'Business Solutions', 'Performance Conseil']
  };

  const names = companyNames[industry] || companyNames['Services Professionnels'];
  const cities = ['Paris', 'Lyon', 'Marseille', 'Bordeaux', 'Lille', 'Toulouse', 'Nantes', 'Nice', 'Strasbourg', 'Montpellier'];

  for (let i = 0; i < 10; i++) {
    const companyName = names[i];
    const city = cities[i];
    
    // Générer des raisons de ciblage spécifiques
    const reasons = generateTargetingReasons(criteria, i);
    
    prospects.push({
      id: i + 1,
      companyName: companyName,
      industry: industry,
      city: city,
      website: `https://www.${companyName.toLowerCase().replace(/[^a-z0-9]/g, '')}.fr`,
      estimatedEmployees: getRandomInRange(criteria.idealSize),
      estimatedRevenue: criteria.revenue,
      contactName: generateContactName(),
      contactTitle: getContactTitle(industry),
      contactEmail: `contact@${companyName.toLowerCase().replace(/[^a-z0-9]/g, '')}.fr`,
      contactPhone: generatePhoneNumber(),
      linkedinUrl: `https://linkedin.com/company/${companyName.toLowerCase().replace(/[^a-z0-9]/g, '')}`,
      score: 70 + Math.floor(Math.random() * 25), // Score entre 70 et 95
      targetingReasons: reasons,
      painPoints: criteria.painPoints.slice(0, 3),
      recommendedApproach: getRecommendedApproach(industry, reasons),
      priority: i < 3 ? 'high' : i < 7 ? 'medium' : 'low'
    });
  }

  return prospects;
}

/**
 * Génère des raisons de ciblage spécifiques
 */
function generateTargetingReasons(criteria, index) {
  const allReasons = [
    `Site web non responsive (${criteria.signals[0]})`,
    `Absence de chatbot ou d'automatisation`,
    `Pas de système de réservation/prise de RDV en ligne`,
    `Présence réseaux sociaux limitée ou inactive`,
    `Avis Google non optimisés`,
    `Formulaire de contact basique sans qualification`,
    `Pas de stratégie de contenu visible`,
    `Site web de plus de 3 ans (design obsolète)`,
    `Pas de CRM ou d'automatisation marketing visible`,
    `Opportunité de différenciation concurrentielle`
  ];

  // Sélectionner 3-4 raisons aléatoires
  const numReasons = 3 + Math.floor(Math.random() * 2);
  const selectedReasons = [];
  const usedIndexes = new Set();

  while (selectedReasons.length < numReasons) {
    const randomIndex = Math.floor(Math.random() * allReasons.length);
    if (!usedIndexes.has(randomIndex)) {
      usedIndexes.add(randomIndex);
      selectedReasons.push(allReasons[randomIndex]);
    }
  }

  return selectedReasons;
}

/**
 * Génère un nom de contact
 */
function generateContactName() {
  const firstNames = ['Jean', 'Marie', 'Pierre', 'Sophie', 'Laurent', 'Isabelle', 'Philippe', 'Nathalie', 'François', 'Catherine'];
  const lastNames = ['Martin', 'Bernard', 'Dubois', 'Thomas', 'Robert', 'Richard', 'Petit', 'Durand', 'Leroy', 'Moreau'];
  
  return `${firstNames[Math.floor(Math.random() * firstNames.length)]} ${lastNames[Math.floor(Math.random() * lastNames.length)]}`;
}

/**
 * Retourne un titre de contact approprié
 */
function getContactTitle(industry) {
  const titles = {
    'Restaurant': ['Gérant', 'Propriétaire', 'Directeur', 'Chef d\'établissement'],
    'Immobilier': ['Directeur d\'agence', 'Agent principal', 'Responsable commercial', 'Gérant'],
    'Santé': ['Praticien', 'Directeur', 'Responsable administratif', 'Gérant'],
    'Beauté': ['Gérant(e)', 'Propriétaire', 'Directeur(trice)', 'Responsable'],
    'Fitness': ['Gérant', 'Directeur', 'Responsable', 'Propriétaire'],
    'Juridique': ['Associé', 'Avocat principal', 'Notaire', 'Directeur'],
    'Construction': ['Gérant', 'Directeur', 'Chef d\'entreprise', 'Responsable commercial'],
    'Services Professionnels': ['Directeur', 'Fondateur', 'Gérant', 'CEO']
  };

  const industryTitles = titles[industry] || titles['Services Professionnels'];
  return industryTitles[Math.floor(Math.random() * industryTitles.length)];
}

/**
 * Génère un numéro de téléphone français
 */
function generatePhoneNumber() {
  const prefixes = ['01', '02', '03', '04', '05', '06', '07'];
  const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
  const number = Math.floor(Math.random() * 90000000) + 10000000;
  return `${prefix} ${number.toString().substring(0, 2)} ${number.toString().substring(2, 4)} ${number.toString().substring(4, 6)} ${number.toString().substring(6, 8)}`;
}

/**
 * Extrait un nombre aléatoire d'une plage
 */
function getRandomInRange(range) {
  const match = range.match(/(\d+)-(\d+)/);
  if (match) {
    const min = parseInt(match[1]);
    const max = parseInt(match[2]);
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }
  return 10;
}

/**
 * Retourne l'approche recommandée
 */
function getRecommendedApproach(industry, reasons) {
  const approaches = [
    {
      channel: 'Email personnalisé',
      timing: 'Mardi ou Jeudi, 10h-11h',
      message: 'Commencer par mentionner un problème spécifique identifié sur leur site'
    },
    {
      channel: 'LinkedIn',
      timing: 'Mercredi, 14h-16h',
      message: 'Connexion + message personnalisé avec valeur ajoutée'
    },
    {
      channel: 'Vidéo Loom',
      timing: 'Envoi le lundi matin',
      message: 'Audit vidéo personnalisé de 2 minutes montrant les opportunités'
    }
  ];

  return approaches[Math.floor(Math.random() * approaches.length)];
}

/**
 * Retourne la stratégie de recherche
 */
function getSearchStrategy(industry) {
  return {
    primarySources: [
      'Google Maps (recherche locale)',
      'LinkedIn Sales Navigator',
      'Pages Jaunes / Annuaires professionnels',
      'Réseaux sociaux (Facebook, Instagram)'
    ],
    searchQueries: [
      `${industry} + [ville]`,
      `${industry} site web obsolète`,
      `${industry} pas de réservation en ligne`,
      `${industry} avis Google`
    ],
    qualificationCriteria: [
      'Site web de plus de 2 ans',
      'Pas de chatbot visible',
      'Moins de 100 avis Google',
      'Réseaux sociaux peu actifs'
    ],
    disqualificationCriteria: [
      'Déjà équipé d\'un chatbot',
      'Site web récent et moderne',
      'Grande entreprise (> 100 employés)',
      'Concurrent direct'
    ]
  };
}

/**
 * Retourne les canaux recommandés
 */
function getRecommendedChannels(industry) {
  const channels = {
    'Restaurant': ['Instagram DM', 'Email', 'Visite en personne'],
    'Immobilier': ['LinkedIn', 'Email', 'Téléphone'],
    'Santé': ['Email', 'Courrier', 'Téléphone'],
    'Beauté': ['Instagram DM', 'Facebook', 'Email'],
    'Fitness': ['Instagram', 'Email', 'Partenariats'],
    'Juridique': ['LinkedIn', 'Email', 'Recommandations'],
    'Construction': ['Email', 'Téléphone', 'LinkedIn'],
    'Services Professionnels': ['LinkedIn', 'Email', 'Networking']
  };

  return channels[industry] || channels['Services Professionnels'];
}

module.exports = {
  findProspects
};
