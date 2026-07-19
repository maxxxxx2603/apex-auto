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
    .setName('post-recrutement')
    .setDescription("Poste l'annonce de recrutement Apex Auto avec le bouton de dépôt de CV")
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction) {
    const channel = await interaction.guild.channels.fetch(config.RECRUITMENT_CHANNEL_ID).catch(() => null);
    if (!channel) {
      return interaction.reply({ content: "Salon de recrutement introuvable (vérifie l'ID en config).", flags: MessageFlags.Ephemeral });
    }

    const embed = new EmbedBuilder()
      .setTitle('🚗 Apex Auto | Recrutement')
      .setDescription(
        "**Apex Auto**, concessionnaire automobile de référence, recrute !\n\n" +
        "Tu es passionné(e) de voitures, sérieux(se) et motivé(e) ? Rejoins notre équipe.\n\n" +
        "Clique sur le bouton ci-dessous pour déposer ta candidature. Tu répondras à quelques questions directement dans un salon privé créé pour toi."
      )
      .setColor(0xc40000)
      .setFooter({ text: 'Apex Auto Concession' });

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('cv_deposit').setLabel('📄 Dépôt CV').setStyle(ButtonStyle.Success)
    );

    await channel.send({ content: `<@&${config.RECRUITMENT_PING_ROLE_ID}>`, embeds: [embed], components: [row] });
    await interaction.reply({ content: 'Annonce postée ✅', ephemeral: true });
  },
};
