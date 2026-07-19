const config = require('../config');
const { load } = require('../db');

// Met à jour la description (topic) de chaque salon employé avec sa progression actuelle.
// Volontairement appelée seulement toutes les 10 minutes (pas à chaque vente) pour éviter
// de se faire rate-limit par Discord sur les modifications de salon.
async function updateEmployeeTopics(client) {
  const data = load();

  for (const guild of client.guilds.cache.values()) {
    for (const [channelId, emp] of Object.entries(data.employees)) {
      try {
        const channel = await guild.channels.fetch(channelId).catch(() => null);
        if (!channel || !channel.isTextBased()) continue;

        const newTopic = `📊 Progression : ${emp.quota}/${config.QUOTA_TARGET} ventes (total historique : ${emp.totalVentes || 0})`;
        if (channel.topic !== newTopic) {
          await channel.edit({ topic: newTopic }).catch(() => {});
        }
      } catch (e) {
        // ignore et continue avec les autres salons
      }
    }
  }
}

module.exports = { updateEmployeeTopics };
