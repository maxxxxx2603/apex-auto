const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder, MessageFlags } = require('discord.js');
const config = require('../config');
const { load, save } = require('../db');
const { updateWarningBoard } = require('../utils/warningBoard');
const { log } = require('../utils/logger');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('avertissement')
    .setDescription('Donne un avertissement à un employé')
    .addUserOption((o) => o.setName('membre').setDescription('Employé concerné').setRequired(true))
    .addStringOption((o) =>
      o.setName('motif').setDescription("Motif de l'avertissement").setRequired(true).setMaxLength(1000)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction) {
    const member = interaction.options.getMember('membre');
    const motif = interaction.options.getString('motif', true);

    if (!member) {
      return interaction.reply({ content: 'Membre introuvable sur ce serveur.', flags: MessageFlags.Ephemeral });
    }

    const data = load();
    if (!data.warnings) data.warnings = {};

    if (!data.warnings[member.id]) {
      data.warnings[member.id] = { displayName: member.displayName || member.user.username, count: 0, history: [] };
    }
    const record = data.warnings[member.id];
    record.displayName = member.displayName || member.user.username;
    record.count += 1;
    record.history.push({ motif, date: new Date().toISOString(), by: interaction.user.tag });

    // Prévenir le membre dans son propre salon employé, s'il en a un
    const employeeEntry = Object.entries(data.employees).find(([, emp]) => emp.userId === member.id);
    if (employeeEntry) {
      const [channelId] = employeeEntry;
      const channel = await interaction.guild.channels.fetch(channelId).catch(() => null);
      if (channel) {
        const warnEmbed = new EmbedBuilder()
          .setTitle('⚠️ Avertissement reçu')
          .setDescription(`Tu as reçu un avertissement.\n\n**Motif :** ${motif}`)
          .setColor(0xe74c3c)
          .setFooter({ text: `Avertissement n°${record.count}` })
          .setTimestamp();
        await channel.send({ content: `<@${member.id}>`, embeds: [warnEmbed] }).catch(() => {});
      }
    }

    save(data);
    await updateWarningBoard(interaction.guild);

    // Alerte à la direction à partir du seuil configuré (par défaut : tous les 3 avertissements)
    if (record.count % config.WARNING_ALERT_THRESHOLD === 0) {
      const boardChannel = await interaction.guild.channels.fetch(config.WARNING_BOARD_CHANNEL_ID).catch(() => null);
      if (boardChannel) {
        await boardChannel.send(
          `<@&${config.DIRECTION_ROLE_ID}> ⚠️ **${record.displayName}** a atteint **${record.count} avertissements**. Une décision est requise.`
        );
      }
    }

    await interaction.reply(`⚠️ Avertissement donné à **${record.displayName}** (${record.count} au total).\nMotif : ${motif}`);
    await log(
      interaction.client,
      '⚠️ Avertissement',
      `${interaction.user.tag} a donné un avertissement à **${record.displayName}** (total : ${record.count}).\nMotif : ${motif}`,
      0xe67e22
    );
  },
};
