const { OverwriteType } = require('discord.js');
const config = require('../config');
const { STAGE_CATEGORY } = require('./syncChannel');

// Retrouve l'ID du membre associé à un salon employé en se basant sur les permissions du salon
// (le membre est celui qui a une permission overwrite explicite dessus).
function findMemberIdFromOverwrites(channel) {
  const overwrite = channel.permissionOverwrites.cache.find((o) => o.type === OverwriteType.Member);
  return overwrite ? overwrite.id : null;
}

// Reconstruit les données d'un employé à partir d'un salon existant sur Discord,
// même si le bot n'a plus l'info en mémoire (ex: redémarrage sans persistance).
function recoverEmployeeFromChannel(channel) {
  const stageIndex = STAGE_CATEGORY.indexOf(channel.parentId);
  if (stageIndex === -1) return null; // le salon n'est dans aucune des catégories connues

  const userId = findMemberIdFromOverwrites(channel);
  if (!userId) return null;

  const parts = channel.name.split('┃');
  const displayName = (parts[1] || parts[0] || 'employe').replace(/^[🔴🟢]/, '').trim() || 'employe';

  return {
    userId,
    displayName,
    stage: stageIndex,
    quota: 0,
    totalVentes: 0,
  };
}

// Retourne les données d'un employé pour un salon donné : depuis la mémoire si elles existent,
// sinon tente de les reconstruire automatiquement. Si récupéré, l'enregistre dans data.employees.
function getOrRecoverEmployee(data, channel) {
  if (data.employees[channel.id]) return data.employees[channel.id];

  const recovered = recoverEmployeeFromChannel(channel);
  if (recovered) {
    data.employees[channel.id] = recovered;
    return recovered;
  }
  return null;
}

module.exports = { getOrRecoverEmployee, recoverEmployeeFromChannel, findMemberIdFromOverwrites };
