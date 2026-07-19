const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder, MessageFlags } = require('discord.js');
const config = require('../config');
const { load } = require('../db');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('total')
    .setDescription("Affiche la progression des ventes d'un employé (ou le classement de tous)")
    .addUserOption((o) => o.setName('membre').setDescription('Employé concerné (optionnel)').setRequired(false))
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction) {
    const data = load();
    const memberOption = interaction.options.getMember('membre');

    // Cas 1 : un membre précis est demandé
    if (memberOption) {
      const entry = Object.values(data.employees).find((emp) => emp.userId === memberOption.id);
      if (!entry) {
        return interaction.reply({ content: `${memberOption} n'est pas reconnu comme employé.`, flags: MessageFlags.Ephemeral });
      }
      const embed = new EmbedBuilder()
        .setTitle(`📊 Progression — ${entry.displayName}`)
        .addFields(
          { name: 'Total des ventes (historique)', value: `${entry.totalVentes || 0}`, inline: true },
          { name: `Quota actuel (objectif ${config.QUOTA_TARGET})`, value: `${entry.quota}/${config.QUOTA_TARGET}`, inline: true },
          { name: 'Palier', value: `${entry.stage}`, inline: true }
        )
        .setColor(0x3498db)
        .setTimestamp();
      return interaction.reply({ embeds: [embed] });
    }

    // Cas 2 : si tapée dans un salon employé sans préciser de membre, cible ce salon
    const currentEntry = data.employees[interaction.channel.id];
    if (currentEntry) {
      const embed = new EmbedBuilder()
        .setTitle(`📊 Progression — ${currentEntry.displayName}`)
        .addFields(
          { name: 'Total des ventes (historique)', value: `${currentEntry.totalVentes || 0}`, inline: true },
          { name: `Quota actuel (objectif ${config.QUOTA_TARGET})`, value: `${currentEntry.quota}/${config.QUOTA_TARGET}`, inline: true },
          { name: 'Palier', value: `${currentEntry.stage}`, inline: true }
        )
        .setColor(0x3498db)
        .setTimestamp();
      return interaction.reply({ embeds: [embed] });
    }

    // Cas 3 : aucun contexte précis → classement de tous les employés
    const entries = Object.values(data.employees).sort((a, b) => (b.totalVentes || 0) - (a.totalVentes || 0));
    if (entries.length === 0) {
      return interaction.reply({ content: 'Aucun employé enregistré pour le moment.', ephemeral: true });
    }

    const embed = new EmbedBuilder()
      .setTitle('📊 Classement des ventes — Apex Auto')
      .setDescription(
        entries
          .map((e, i) => `**${i + 1}.** ${e.displayName} — **${e.totalVentes || 0}** ventes (quota : ${e.quota}/${config.QUOTA_TARGET})`)
          .join('\n')
      )
      .setColor(0x3498db)
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  },
};
