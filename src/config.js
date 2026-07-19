module.exports = {
  // --- Recrutement ---
  RECRUITMENT_CHANNEL_ID: '1291489264252747796',   // annonce de recrutement postée ici
  RECRUITMENT_PING_ROLE_ID: '1208469657019879486', // rôle ping + accès staff aux salons de candidature
  CV_CATEGORY_ID: null,                            // optionnel : ID de catégorie pour ranger les salons "cv-xxx"

  // --- Traitement du CV ---
  CV_REVIEW_CHANNEL_ID: '1525668530761105568',     // les CV complets arrivent ici avec boutons Accepter/Refuser
  CV_NOTIFY_ROLE_ID: '1521235816054001744',        // rôle pingé dans le salon de candidature dès son ouverture
  DISPO_CHANNEL_ID: '1525669777819963513',         // où l'accepté doit poster ses disponibilités
  ID_CARD_CHANNEL_ID: '1525669278034956370',       // la carte d'identité est renvoyée ici si accepté
  ROLE_EMPLOYEE_ACCEPTED: '1525669425699622952',   // rôle donné à l'acceptation du CV

  // --- /employer ---
  EMPLOYER_CATEGORY_ID: '1521617875914326026',     // catégorie où naît le salon employé
  ROLE_EMPLOYER_1: '1521235335470911528',          // ajouté au /employer
  ROLE_EMPLOYER_2: '1224329720804675736',          // ajouté au /employer, retiré au 1er /up

  // --- /up (paliers) ---
  UP1_CATEGORY_ID: '1452468365611503749',
  ROLE_UP1: '1208467720132100176',                 // ajouté palier 1, retiré palier 2

  UP2_CATEGORY_ID: '1525672397909528708',
  ROLE_UP2: '1333107113727361065',                 // ajouté palier 2, retiré palier 3

  UP3_CATEGORY_ID: '1525672555703177256',
  ROLE_UP3: '1208467906912845825',                 // ajouté palier 3 (grade max)

  // --- Logs ---
  LOGS_CHANNEL_ID: '1452467178979983391',

  // --- Tickets (prise de RDV) ---
  TICKET_CHANNEL_ID: '1521238649172131981', // panneau "ouvrir un ticket" posté ici, et logs des tickets fermés envoyés ici
  TICKET_CATEGORY_ID: '1521240572143079464', // catégorie où sont créés les salons de ticket
  TICKET_STAFF_ROLE_ID: null,               // optionnel : rôle staff qui voit tous les tickets (sinon Administrateur uniquement)

  // --- Avertissements ---
  WARNING_BOARD_CHANNEL_ID: '1521231242878521424', // tableau des avertissements (embed mis à jour en direct)
  DIRECTION_ROLE_ID: '1521235816054001744',        // rôle prévenu automatiquement à partir de 3 avertissements
  WARNING_ALERT_THRESHOLD: 3,

  // --- Renvoi ---
  ROLE_KEPT_AFTER_FIRE: '1208469657019879486', // seul rôle conservé quand un employé est viré (tous les autres retirés)

  // --- Quota ---
  QUOTA_TARGET: 25, // nombre d'images (ventes) avant de passer le salon en vert
};
