require('dotenv').config();
const registerCommands = require('./registerCommands');

// Script pour enregistrer manuellement les commandes en local si besoin.
// Sur Railway, ce n'est plus nécessaire : le bot les enregistre tout seul au démarrage.
registerCommands().then(() => process.exit(0));
