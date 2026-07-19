const { EmbedBuilder } = require('discord.js');
const config = require('../config');

async function log(client, title, description, color = 0x5865f2) {
  try {
    const channel = await client.channels.fetch(config.LOGS_CHANNEL_ID);
    if (!channel) return;
    const embed = new EmbedBuilder()
      .setTitle(title)
      .setDescription(description)
      .setColor(color)
      .setTimestamp();
    await channel.send({ embeds: [embed] });
  } catch (e) {
    console.error('Erreur log:', e);
  }
}

module.exports = { log };
