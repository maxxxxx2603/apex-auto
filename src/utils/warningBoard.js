const { EmbedBuilder } = require('discord.js');
const config = require('../config');
const { load, save } = require('../db');

const BOARD_TITLE = '⚠️ Tableau des employés — Avertissements';

function buildEmbed(data) {
  const entries = Object.values(data.employees).map((emp) => ({
    displayName: emp.displayName || 'Employé',
    count: data.warnings?.[emp.userId]?.count || 0,
  }));

  entries.sort((a, b) => b.count - a.count || a.displayName.localeCompare(b.displayName));

  const embed = new EmbedBuilder().setTitle(BOARD_TITLE).setColor(0xe67e22).setTimestamp();

  if (entries.length === 0) {
    embed.setDescription('Aucun employé enregistré pour le moment.');
  } else {
    embed.setDescription(
      entries.map((e) => `**${e.displayName}** — ${e.count} avertissement${e.count > 1 ? 's' : ''}`).join('\n')
    );
  }
  return embed;
}

// Crée ou met à jour (en éditant le même message) l'embed listant tous les employés actuels avec leur
// nombre d'avertissements. Si l'ID sauvegardé ne fonctionne plus (message supprimé, ou mémoire perdue après
// un redéploiement sans Volume Railway), on cherche d'abord un tableau déjà existant dans le salon avant
// d'en recréer un — pour ne jamais spammer plusieurs tableaux.
async function updateWarningBoard(guild) {
  const data = load();
  const channel = await guild.channels.fetch(config.WARNING_BOARD_CHANNEL_ID).catch(() => null);
  if (!channel) return;

  const embed = buildEmbed(data);

  // 1. Essayer l'ID mémorisé
  if (data.warningBoardMessageId) {
    const existing = await channel.messages.fetch(data.warningBoardMessageId).catch(() => null);
    if (existing) {
      await existing.edit({ embeds: [embed] });
      return;
    }
  }

  // 2. Filet de sécurité : chercher un tableau déjà posté par le bot dans les derniers messages du salon
  const recent = await channel.messages.fetch({ limit: 50 }).catch(() => null);
  if (recent) {
    const botBoards = recent.filter(
      (m) => m.author.id === guild.client.user.id && m.embeds[0]?.title === BOARD_TITLE
    );
    if (botBoards.size > 0) {
      const [first, ...duplicates] = [...botBoards.values()];
      await first.edit({ embeds: [embed] }).catch(() => {});
      data.warningBoardMessageId = first.id;
      save(data);
      // Nettoie les doublons éventuels (ex : plusieurs redémarrages sans mémoire persistante)
      for (const dup of duplicates) {
        await dup.delete().catch(() => {});
      }
      return;
    }
  }

  // 3. Vraiment aucun tableau existant : on en crée un
  const sent = await channel.send({ embeds: [embed] });
  data.warningBoardMessageId = sent.id;
  save(data);
}

module.exports = { updateWarningBoard };
