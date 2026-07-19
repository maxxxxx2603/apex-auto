const { load, save } = require('../db');
const { resyncEmployee } = require('../utils/employeeSync');
const { recoverEmployeeFromChannel } = require('../utils/employeeRecovery');
const { STAGE_CATEGORY } = require('../utils/syncChannel');
const { updateWarningBoard } = require('../utils/warningBoard');
const { log } = require('../utils/logger');
const questions = require('../cvQuestions');

module.exports = async function ready(client) {
  console.log(`✅ Connecté en tant que ${client.user.tag}`);

  const data = load();
  let count = 0;
  let corrected = 0;
  let recovered = 0;

  for (const guild of client.guilds.cache.values()) {
    // Retrouve les salons employés que le bot aurait oubliés (redémarrage sans persistance, etc.)
    for (const categoryId of STAGE_CATEGORY.filter(Boolean)) {
      const category = await guild.channels.fetch(categoryId).catch(() => null);
      if (!category) continue;
      const children = category.children?.cache || guild.channels.cache.filter((c) => c.parentId === categoryId);
      for (const channel of children.values()) {
        if (data.employees[channel.id]) continue;
        const rec = recoverEmployeeFromChannel(channel);
        if (rec) {
          data.employees[channel.id] = rec;
          recovered++;
        }
      }
    }

    for (const [channelId, emp] of Object.entries(data.employees)) {
      try {
        const result = await resyncEmployee(guild, channelId, emp);
        if (result.channel) count++;
        if (result.stageChanged) corrected++;
      } catch (e) {
        // le salon peut appartenir à une autre guilde, ignorer silencieusement
      }
    }

    // Reprend les candidatures CV en cours après un redémarrage
    for (const session of Object.values(data.cvSessions)) {
      try {
        const channel = await guild.channels.fetch(session.channelId).catch(() => null);
        if (!channel) continue;
        const nextQuestion =
          session.step < questions.length
            ? questions[session.step].question
            : "**Étape 8/8 — Pièce d'identité**\nEnvoie une **photo** de ta carte d'identité (image uniquement).";
        await channel.send(`🔄 Le bot a redémarré, reprenons là où on s'était arrêté :\n\n${nextQuestion}`);
      } catch (e) {
        // ignore
      }
    }
  }

  save(data);

  // Crée ou met à jour le tableau des employés/avertissements dans son salon dédié
  for (const guild of client.guilds.cache.values()) {
    await updateWarningBoard(guild).catch((e) => console.error('Erreur updateWarningBoard:', e));
  }

  if (count > 0 || recovered > 0) {
    await log(
      client,
      '🔄 Démarrage',
      `Bot démarré, ${count} salon(s) employé(s) resynchronisé(s) automatiquement.` +
        (recovered > 0 ? `\n🔎 ${recovered} salon(s) retrouvé(s) et réintégré(s) dans la mémoire.` : '') +
        (corrected > 0 ? `\n⚠️ ${corrected} palier(s) corrigé(s) (rôles modifiés manuellement détectés).` : ''),
      0x95a5a6
    );
  }
};
