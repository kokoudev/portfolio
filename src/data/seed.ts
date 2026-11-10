import { contentSchema, type Content } from '../lib/schema';
import type { z } from 'zod';

/**
 * Contenu initial du site. Il sert tant que rien n'a été enregistré depuis l'admin.
 * Règle : rien d'inventé — tout ce qui manque est marqué « À AJOUTER ».
 */
const rawSeed: z.input<typeof contentSchema> = {
  projects: [
    {
      id: 'vision',
      title: 'VISION — Digital Guardian',
      badge: 'EN COURS · PROJET DE FIN D’ÉTUDES',
      category: 'iot',
      description:
        'Antivol connecté pour motos : un boîtier embarqué localise la moto en temps réel et permet de couper le moteur à distance depuis l’application.',
      problem: 'À Lomé, une moto volée disparaît en quelques minutes.',
      solution:
        'Un boîtier ESP32-S3 avec modem 4G envoie sa position par MQTT ; l’app affiche la carte, les trajets, la zone de sécurité (géofencing) et commande l’arrêt moteur, refusé si la moto roule.',
      stack: 'AdonisJS · Flutter · ESP32-S3 · MQTT (EMQX) · Redis · MySQL · PASETO',
      url: '#soutenance',
      cta: 'Voir la soutenance →',
      image: 'asset:vision-admin',
      imageAlt: 'Tableau de bord d’administration de VISION (données de démonstration)',
      gallery: [
        { image: 'asset:vision-tracking', alt: 'Module de localisation de VISION : carte, trajet et arrêt moteur (données de démonstration)' },
      ],
      featured: true,
    },
    {
      id: 'algovisualizer',
      title: 'AlgoVisualizer',
      badge: 'EN LIGNE',
      category: 'web',
      description: 'Visualisation pas à pas de QuickSort, Two Sum et Karatsuba, avec analyse de complexité.',
      problem: '',
      solution: '',
      stack: 'Python · JavaScript · Railway',
      url: 'https://web-production-2e739.up.railway.app',
      cta: 'Voir le site ↗',
      image: '',
      imageAlt: '',
      gallery: [],
      featured: false,
    },
    {
      id: 'gamedi',
      title: 'Site vitrine GAMÉDI',
      badge: 'CLIENT · FREELANCE',
      category: 'client',
      description:
        'Site vitrine d’import de véhicules Asie → Lomé : catalogue, prix « tout compris » (véhicule, transport, dédouanement) affichés dans la devise choisie (FCFA, EUR, USD, NGN, GHS), thème clair/sombre.',
      problem: '',
      solution: '',
      stack: 'Netlify · Responsive · SEO',
      url: 'https://demo-gadvision.netlify.app/',
      cta: 'Voir la démo ↗',
      image: 'asset:gamedi',
      imageAlt: 'Page d’accueil du site vitrine : « Votre voiture importée, prix tout compris »',
      gallery: [],
      featured: false,
    },
  ],
  formations: [
    { id: 'cepd', year: '2016', title: 'CEPD', school: 'Lycée René Maritime, Lomé', detail: '', current: false },
    { id: 'bepc', year: '2020', title: 'BEPC', school: 'Lycée René Maritime, Lomé', detail: '', current: false },
    { id: 'bac', year: '2023', title: 'Baccalauréat Série D', school: 'Lycée SIGMA, Lomé', detail: '', current: false },
    {
      id: 'licence',
      year: '2023 – 2026',
      title: 'Licence en Génie Logiciel',
      school: 'IPNET Institute of Technology, Lomé',
      detail: 'Soutenance à venir',
      current: true,
    },
  ],
  certifications: [
    {
      id: 'stanford-divide-conquer',
      title: 'Divide and Conquer, Sorting and Searching, and Randomized Algorithms',
      issuer: 'Stanford University · Coursera',
      date: 'Févr. 2026',
      description: 'Diviser pour régner, tri, recherche et algorithmes randomisés.',
      image: 'asset:stanford-divide-conquer',
      verifyUrl: 'https://coursera.org/verify/UR2PRV13QXQB',
    },
    {
      id: 'stanford-graph-search',
      title: 'Graph Search, Shortest Paths, and Data Structures',
      issuer: 'Stanford University · Coursera',
      date: 'Mars 2026',
      description: 'Parcours de graphes, plus courts chemins, tas, tables de hachage.',
      image: 'asset:stanford-graph-search',
      verifyUrl: 'https://coursera.org/verify/7SO2NB40TK6M',
    },
    {
      id: 'stanford-greedy-dp',
      title: 'Greedy Algorithms, Minimum Spanning Trees, and Dynamic Programming',
      issuer: 'Stanford University · Coursera',
      date: 'Mars 2026',
      description: 'Algorithmes gloutons, arbres couvrants minimaux, programmation dynamique.',
      image: 'asset:stanford-greedy-dp',
      verifyUrl: 'https://coursera.org/verify/WBZ82KDPMFCD',
    },
    {
      id: 'cisco-cybersecurity-essentials',
      title: 'Cybersecurity Essentials',
      issuer: 'Cisco Networking Academy',
      date: 'Avr. 2024',
      description: 'Confidentialité, intégrité, disponibilité et défense des réseaux.',
      image: 'asset:cisco-cybersecurity-essentials',
      verifyUrl: '',
    },
    {
      id: 'fortinet-fca',
      title: 'Fortinet Certified Associate in Cybersecurity',
      issuer: 'Fortinet Training Institute',
      date: 'Janv. 2024 · expiré en janv. 2026',
      description: 'Fondamentaux de la cybersécurité et du paysage des menaces.',
      image: 'asset:fortinet-fca',
      verifyUrl: 'https://training.fortinet.com/admin/tool/certificate/index.php',
    },
    {
      id: 'greatlearning-linux',
      title: 'Linux Tutorial',
      issuer: 'Great Learning Academy',
      date: 'Mars 2024',
      description: 'Ligne de commande et administration de base sous Linux.',
      image: 'asset:greatlearning-linux',
      verifyUrl: '',
    },
    {
      id: 'greatlearning-appsec',
      title: 'Application Security',
      issuer: 'Great Learning Academy',
      date: 'Mars 2024',
      description: 'Principes de sécurité des applications.',
      image: 'asset:greatlearning-appsec',
      verifyUrl: '',
    },
  ],
  diplomas: [
    { id: 'licence', title: 'Licence en Génie Logiciel — IPNET', status: 'À AJOUTER après la soutenance', file: '', link: '' },
    { id: 'certificats', title: 'Certificats Stanford, Cisco, Fortinet, Great Learning', status: '7 certificats', file: '', link: '#certifications' },
  ],
  video: {
    youtubeId: '',
    title: 'Soutenance — VISION, Digital Guardian',
    caption: 'Présentation du projet de fin d’études devant le jury d’IPNET.',
  },
};

/** Contenu initial validé (les valeurs par défaut du schéma sont appliquées). */
export const seed: Content = contentSchema.parse(rawSeed);
