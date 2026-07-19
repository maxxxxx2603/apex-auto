const config = require('../config');
const { syncChannel, STAGE_CATEGORY } = require('./syncChannel');

const UP_ROLES = [config.ROLE_UP1, config.ROLE_UP2, config.ROLE_UP3]; // index 0 = palier 1, etc.

// Détermine le vrai palier du membre en se basant sur les rôles qu'il possède réellement,
// plutôt que sur la valeur stockée (qui peut être fausse si un rôle a été changé à la main).
function determineStageFromRoles(member) {
  if (member.roles.cache.has(config.ROLE_UP3)) return 3;
  if (member.roles.cache.has(config.ROLE_UP2)) return 2;
  if (member.roles.cache.has(config.ROLE_UP1)) return 1;
  return 0;
}

// Remet les rôles du membre en cohérence avec le palier donné : ajoute ce qui manque,
// retire ce qui ne devrait plus être là.
async function fixRolesForStage(member, stage) {
  const rolesToAdd = [config.ROLE_EMPLOYER_1]; // rôle de base toujours présent
  const rolesToRemove = [];

  if (stage === 0) {
    rolesToAdd.push(config.ROLE_EMPLOYER_2);
    rolesToRemove.push(...UP_ROLES);
  } else {
    rolesToRemove.push(config.ROLE_EMPLOYER_2);
    const currentStageRole = UP_ROLES[stage - 1];
    rolesToAdd.push(currentStageRole);
    rolesToRemove.push(...UP_ROLES.filter((r) => r !== currentStageRole));
  }

  await member.roles.add(rolesToAdd.filter(Boolean)).catch(() => {});
  await member.roles.remove(rolesToRemove.filter(Boolean)).catch(() => {});
}

// Fonction complète : détermine le vrai palier depuis les rôles, corrige les rôles en trop/manquants,
// met à jour la donnée stockée, puis remet le salon dans la bonne catégorie avec le bon emoji.
async function resyncEmployee(guild, channelId, emp) {
  const member = await guild.members.fetch(emp.userId).catch(() => null);

  if (member) {
    const actualStage = determineStageFromRoles(member);
    const stageChanged = actualStage !== emp.stage;
    emp.stage = actualStage;
    await fixRolesForStage(member, actualStage);
    const channel = await syncChannel(guild, channelId, emp);
    return { channel, stageChanged, stage: actualStage };
  }

  // Membre introuvable (parti du serveur ?) : on resynchronise au moins le salon avec les données connues.
  const channel = await syncChannel(guild, channelId, emp);
  return { channel, stageChanged: false, stage: emp.stage };
}

module.exports = { resyncEmployee, determineStageFromRoles, fixRolesForStage, STAGE_CATEGORY };
