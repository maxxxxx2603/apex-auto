const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  MessageFlags,
} = require('discord.js');
const config = require('../config');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('post-ticket')
    .setDescription('Poste le panneau de prise de rendez-vous (ouverture de ticket)')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction) {
    const channel = await interaction.guild.channels.fetch(config.TICKET_CHANNEL_ID).catch(() => null);
    if (!channel) {
      return interaction.reply({ content: "Salon de ticket introuvable (vérifie l'ID en config).", flags: MessageFlags.Ephemeral });
    }

    const embed = new EmbedBuilder()
      .setTitle('📅 Prise de rendez-vous — Apex Auto')
      .setDescription(
        'Besoin de prendre rendez-vous ou une question à nous poser ?\n\n' +
          'Clique sur le bouton ci-dessous pour ouvrir un ticket privé. Un salon sera créé rien que pour toi, ' +
          'visible uniquement par toi et notre équipe.'
      )
      .setColor(0xc40000)
      .setFooter({ text: 'Apex Auto Concession' });

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('ticket_open').setLabel('📅 Prendre rendez-vous').setStyle(ButtonStyle.Success)
    );

    await channel.send({ embeds: [embed], components: [row] });
    await interaction.reply({ content: 'Panneau de ticket posté ✅', flags: MessageFlags.Ephemeral });
  },
};
