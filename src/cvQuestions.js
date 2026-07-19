// Chaque question est posée une par une dans le salon de candidature.
// La dernière étape (carte d'identité) est gérée séparément car elle exige une image.
module.exports = [
  { key: 'nom_prenom', label: 'Nom Prénom', question: '**Étape 1/8 — Présentation RP**\nQuel est ton **Nom Prénom** RP ?' },
  { key: 'age_rp', label: 'Âge RP', question: '**Étape 2/8**\nQuel est ton **Âge RP** ?' },
  { key: 'experience', label: 'Expérience précédente', question: "**Étape 3/8**\nQuelle est ton **expérience précédente** (autres expériences...) ?" },
  { key: 'motivations', label: 'Motivations', question: '**Étape 4/8**\nQuelles sont tes **motivations** pour rejoindre Apex Auto (envies, passion...) ?' },
  { key: 'anciennete', label: 'Ancienneté en ville', question: "**Étape 5/8**\nQuelle est ton **ancienneté en ville** (X mois / X années) ?" },
  { key: 'age_reel', label: 'Âge réel (HRP)', question: '**Étape 6/8 — HRP**\nQuel est ton **âge réel** ?' },
  { key: 'disponibilites', label: 'Disponibilités', question: '**Étape 7/8**\nQuelles sont tes **disponibilités** ?' },
];

// Étape 8 (index = questions.length) : carte d'identité, image uniquement.
