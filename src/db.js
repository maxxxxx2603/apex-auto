const fs = require('fs');
const path = require('path');

// Si un Volume Railway est monté, DB_PATH pointera dessus (ex: /app/data/db.json) pour survivre
// aux redéploiements. Sinon, valeur par défaut à côté du projet (non persistante entre redeploys).
const DB_PATH = process.env.DB_PATH || path.join(__dirname, '..', 'db.json');

function ensureDir() {
  const dir = path.dirname(DB_PATH);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function load() {
  ensureDir();
  if (!fs.existsSync(DB_PATH)) {
    const initial = { employees: {}, cvSessions: {}, reviews: {}, tickets: {}, warnings: {} };
    fs.writeFileSync(DB_PATH, JSON.stringify(initial, null, 2));
    return initial;
  }
  try {
    const parsed = JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));
    if (!parsed.tickets) parsed.tickets = {}; // compatibilité avec une base créée avant l'ajout des tickets
    if (!parsed.warnings) parsed.warnings = {}; // compatibilité avec une base créée avant l'ajout des avertissements
    return parsed;
  } catch (e) {
    console.error('db.json illisible, réinitialisation.', e);
    const initial = { employees: {}, cvSessions: {}, reviews: {}, tickets: {}, warnings: {} };
    fs.writeFileSync(DB_PATH, JSON.stringify(initial, null, 2));
    return initial;
  }
}

function save(data) {
  ensureDir();
  fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2));
}

module.exports = { load, save, DB_PATH };
