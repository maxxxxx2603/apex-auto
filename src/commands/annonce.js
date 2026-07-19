const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  ChannelType,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ActionRowBuilder,
} = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('annonce')
    .setDescription('Ouvre un formulaire pour rédiger et poster une annonce')
    .addChannelOption((o) =>
      o
        .setName('salon')
        .setDescription("Le salon où poster l'annonce")
        .addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement)
        .setRequired(true)
    )
    .addRoleOption((o) => o.setName('role').setDescription('Le rôle à ping').setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction) {
    const channel = interaction.options.getChannel('salon', true);
    const role = interaction.options.getRole('role', true);

    // On encode le salon et le rôle choisis dans le customId de la modale, pour les retrouver à la soumission.
    const modal = new ModalBuilder()
      .setCustomId(`annonce_modal|${channel.id}|${role.id}`)
      .setTitle("Rédiger l'annonce");

    const titreInput = new TextInputBuilder()
      .setCustomId('annonce_titre')
      .setLabel('Titre (optionnel)')
      .setStyle(TextInputStyle.Short)
      .setRequired(false)
      .setMaxLength(256)
      .setPlaceholder('📢 Annonce');

    const messageInput = new TextInputBuilder()
      .setCustomId('annonce_message')
      .setLabel('Contenu de l\'annonce')
      .setStyle(TextInputStyle.Paragraph)
      .setRequired(true)
      .setMaxLength(4000)
      .setPlaceholder('Écris ton annonce ici, plusieurs lignes possibles...');

    modal.addComponents(
      new ActionRowBuilder().addComponents(titreInput),
      new ActionRowBuilder().addComponents(messageInput)
    );

    await interaction.showModal(modal);
  },
};
