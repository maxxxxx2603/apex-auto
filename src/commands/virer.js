const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder, MessageFlags } = require('discord.js');
const config = require('../config');
const { load, save } = require('../db');
const { updateWarningBoard } = require('../utils/warningBoard');
const { log } = require('../utils/logger');

const RAISON_LABELS = {
  inactivite: 'Inactivité',
  erreur_professionnel: 'Erreur professionnelle',
  autre: 'Autre',
};

module.exports = {
  data: new SlashCommandBuilder()
    .setName('virer')
    .setDescription('Renvoie un employé : retire ses rôles, supprime son salon, prévient par MP')
    .addUserOption((o) => o.setName('membre').setDescription('Employé à renvoyer').setRequired(true))
    .addStringOption((o) =>
      o
        .setName('raison')
        .setDescription('Raison du renvoi')
        .setRequired(true)
        .addChoices(
          { name: 'Inactivité', value: 'inactivite' },
          { name: 'Erreur professionnelle', value: 'erreur_professionnel' },
          { name: 'Autre', value: 'autre' }
        )
    )
    .addStringOption((o) =>
      o.setName('details').setDescription("Précisions (obligatoire si raison = Autre)").setRequired(false).setMaxLength(500)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction) {
    const member = interaction.options.getMember('membre');
    const raisonKey = interaction.options.getString('raison', true);
    const details = interaction.options.getString('details');

    if (!member) {
      return interaction.reply({ content: 'Membre introuvable sur ce serveur.', flags: MessageFlags.Ephemeral });
    }

    if (raisonKey === 'autre' && !details) {
      return interaction.reply({
        content: 'Merci de préciser la raison dans l\'option `details` quand tu choisis "Autre".',
        flags: MessageFlags.Ephemeral,
      });
    }

    const raisonLabel = RAISON_LABELS[raisonKey];
    const raisonComplete = details ? `${raisonLabel} — ${details}` : raisonLabel;

    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const data = load();
    const displayName = member.displayName || member.user.username;

    // Retire tous les rôles sauf celui à conserver (et les rôles gérés par une intégration, type booster/bot)
    const rolesToRemove = member.roles.cache.filter(
      (r) => r.id !== interaction.guild.id && r.id !== config.ROLE_KEPT_AFTER_FIRE && !r.managed
    );
    await member.roles.remove(rolesToRemove).catch(() => {});
    await member.roles.add(config.ROLE_KEPT_AFTER_FIRE).catch(() => {});

    const employeeEntry = Object.entries(data.employees).find(([, emp]) => emp.userId === member.id);

    // Prévient la personne par MP AVANT toute suppression de salon
    const dmEmbed = new EmbedBuilder()
      .setTitle('🚪 Fin de contrat — Apex Auto')
      .setDescription(`Tu as été renvoyé(e) d'**Apex Auto**.\n\n**Raison :** ${raisonComplete}`)
      .setColor(0xe74c3c)
      .setTimestamp();
    await member.send({ embeds: [dmEmbed] }).catch(() => {});

    // IMPORTANT : on confirme la commande AVANT de supprimer le salon. Si /virer est tapée depuis le salon
    // employé lui-même, le supprimer avant d'avoir répondu invalide la réponse Discord (erreur "Unknown Message").
    await interaction.editReply(`🚪 **${displayName}** a été renvoyé(e). Raison : ${raisonComplete}`);

    await log(
      interaction.client,
      '🚪 Employé renvoyé',
      `${interaction.user.tag} a renvoyé **${displayName}** (<@${member.id}>).\nRaison : ${raisonComplete}`,
      0xe74c3c
    );

    // Supprime son salon employé s'il en a un (en dernier)
    if (employeeEntry) {
      const [channelId] = employeeEntry;
      const channel = await interaction.guild.channels.fetch(channelId).catch(() => null);
      if (channel) await channel.delete().catch(() => {});
      delete data.employees[channelId];
    }

    save(data);
    await updateWarningBoard(interaction.guild).catch(() => {});
  },
};
