const {
  ChannelType,
  PermissionFlagsBits,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  MessageFlags,
} = require('discord.js');
const config = require('../config');
const { load, save } = require('../db');
const slugify = require('../utils/slugify');
const { log } = require('../utils/logger');
const { buildTranscript } = require('../utils/transcript');
const questions = require('../cvQuestions');

function isStaff(member) {
  return member.permissions.has(PermissionFlagsBits.Administrator);
}

module.exports = async function interactionCreate(client, interaction) {
  // --- Slash commands ---
  if (interaction.isChatInputCommand()) {
    const command = client.commands.get(interaction.commandName);
    if (!command) return;
    try {
      await command.execute(interaction, client);
    } catch (e) {
      console.error(e);
      const payload = { content: "Une erreur est survenue lors de l'exécution de la commande.", flags: MessageFlags.Ephemeral };
      if (interaction.replied || interaction.deferred) {
        await interaction.followUp(payload).catch(() => {});
      } else {
        await interaction.reply(payload).catch(() => {});
      }
    }
    return;
  }

  // --- Boutons ---
  if (interaction.isButton()) {
    const { customId } = interaction;

    // Dépôt de candidature
    if (customId === 'cv_deposit') {
      const data = load();
      const existing = Object.values(data.cvSessions).find((s) => s.userId === interaction.user.id);
      if (existing) {
        return interaction.reply({
          content: `Tu as déjà une candidature en cours ici : <#${existing.channelId}>`,
          flags: MessageFlags.Ephemeral,
        });
      }

      await interaction.deferReply({ flags: MessageFlags.Ephemeral });

      const permissionOverwrites = [
        { id: interaction.guild.roles.everyone.id, deny: [PermissionFlagsBits.ViewChannel] },
        {
          id: interaction.user.id,
          allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.AttachFiles, PermissionFlagsBits.ReadMessageHistory],
        },
      ];
      // Seul le rôle staff/direction (CV_NOTIFY_ROLE_ID) voit le salon de candidature.
      // On n'y met pas RECRUITMENT_PING_ROLE_ID : c'est un rôle que possèdent (quasiment) tous les membres,
      // pas un rôle réservé au staff — le mettre ici rendait le salon visible par tout le monde.
      if (config.CV_NOTIFY_ROLE_ID) {
        permissionOverwrites.push({
          id: config.CV_NOTIFY_ROLE_ID,
          allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.ReadMessageHistory],
        });
      }

      const channel = await interaction.guild.channels.create({
        name: `cv-${slugify(interaction.user.username)}`,
        type: ChannelType.GuildText,
        parent: config.CV_CATEGORY_ID || undefined,
        permissionOverwrites,
      });

      data.cvSessions[channel.id] = {
        userId: interaction.user.id,
        channelId: channel.id,
        step: 0,
        answers: {},
      };
      save(data);

      const rolePing = config.CV_NOTIFY_ROLE_ID ? `<@&${config.CV_NOTIFY_ROLE_ID}> ` : '';
      await channel.send(
        `${rolePing}<@${interaction.user.id}> Bienvenue dans ta candidature **Apex Auto** ! Réponds aux questions une par une.\n\n${questions[0].question}`
      );

      await interaction.editReply(`Ton salon de candidature a été créé : ${channel}`);
      return;
    }

    // Acceptation / refus d'un CV
    if (customId.startsWith('cv_accept_') || customId.startsWith('cv_refuse_')) {
      if (!isStaff(interaction.member)) {
        return interaction.reply({ content: "Tu n'as pas la permission de traiter les candidatures.", flags: MessageFlags.Ephemeral });
      }

      const applicantId = customId.replace('cv_accept_', '').replace('cv_refuse_', '');
      const data = load();
      const review = data.reviews[applicantId];
      if (!review) {
        return interaction.reply({ content: 'Cette candidature a déjà été traitée ou est introuvable.', flags: MessageFlags.Ephemeral });
      }

      const applicant = await interaction.guild.members.fetch(applicantId).catch(() => null);
      const isAccept = customId.startsWith('cv_accept_');

      // Defer la réponse immédiatement pour éviter l'expiration de l'interaction
      try {
        await interaction.deferUpdate();
      } catch (e) {
        console.error('Erreur lors du defer:', e);
      }

      if (isAccept) {
        if (applicant) {
          await applicant.roles.add(config.ROLE_EMPLOYEE_ACCEPTED).catch(() => {});
          await applicant
            .send(
              `✅ Ta candidature chez **Apex Auto** a été acceptée !\nMerci de mettre tes disponibilités ici : <#${config.DISPO_CHANNEL_ID}>`
            )
            .catch(() => {});
        }

        const idCardChannel = await interaction.guild.channels.fetch(config.ID_CARD_CHANNEL_ID).catch(() => null);
        // On relit l'URL de l'image directement sur le message cliqué (toujours à jour), plutôt que de se fier
        // à une URL sauvegardée en base qui peut avoir expiré entre-temps.
        const freshIdCardUrl = interaction.message.embeds[0]?.image?.url || review.idCardUrl;
        if (idCardChannel && freshIdCardUrl) {
          const embed = new EmbedBuilder()
            .setTitle("Carte d'identité")
            .setDescription(`Candidat : <@${applicantId}> (${review.answers.nom_prenom || 'N/A'})`)
            .setImage(freshIdCardUrl)
            .setColor(0x2ecc71);
          await idCardChannel.send({ embeds: [embed] });
        }

        await log(interaction.client, '✅ CV accepté', `Candidature de <@${applicantId}> acceptée par ${interaction.user.tag}.`, 0x2ecc71);
      } else {
        if (applicant) {
          await applicant
            .send(
              "❌ Ta candidature chez **Apex Auto** n'a pas été retenue.\nTu peux retenter une nouvelle candidature dans une semaine."
            )
            .catch(() => {});
        }
        await log(interaction.client, '❌ CV refusé', `Candidature de <@${applicantId}> refusée par ${interaction.user.tag}.`, 0xe74c3c);
      }

      delete data.reviews[applicantId];
      save(data);

      // Le CV a été traité (accepté ou refusé) : on supprime le message de review, il n'a plus d'utilité.
      await interaction.message.delete().catch(() => {});
      return;
    }

    // Ouverture d'un ticket (prise de RDV)
    if (customId === 'ticket_open') {
      const data = load();
      if (!data.tickets) data.tickets = {};

      const existing = Object.values(data.tickets).find((t) => t.userId === interaction.user.id);
      if (existing) {
        return interaction.reply({
          content: `Tu as déjà un ticket ouvert ici : <#${existing.channelId}>`,
          flags: MessageFlags.Ephemeral,
        });
      }

      await interaction.deferReply({ flags: MessageFlags.Ephemeral });

      const permissionOverwrites = [
        { id: interaction.guild.roles.everyone.id, deny: [PermissionFlagsBits.ViewChannel] },
        {
          id: interaction.user.id,
          allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.AttachFiles, PermissionFlagsBits.ReadMessageHistory],
        },
      ];
      if (config.TICKET_STAFF_ROLE_ID) {
        permissionOverwrites.push({
          id: config.TICKET_STAFF_ROLE_ID,
          allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.ReadMessageHistory, PermissionFlagsBits.SendMessages],
        });
      }

      const channel = await interaction.guild.channels.create({
        name: `🎫┃${slugify(interaction.user.username)}`,
        type: ChannelType.GuildText,
        parent: config.TICKET_CATEGORY_ID || undefined,
        permissionOverwrites,
      });

      data.tickets[channel.id] = {
        userId: interaction.user.id,
        channelId: channel.id,
        openedAt: Date.now(),
        openedBy: interaction.user.tag,
      };
      save(data);

      const closeRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('ticket_close').setLabel('🔒 Fermer le ticket').setStyle(ButtonStyle.Danger)
      );

      await channel.send({
        content: `<@${interaction.user.id}> Bienvenue ! Décris ta demande de rendez-vous ici, un membre de l'équipe va te répondre. Clique sur le bouton ci-dessous quand le ticket peut être fermé.`,
        components: [closeRow],
      });

      await interaction.editReply(`Ton ticket a été créé : ${channel}`);
      await log(interaction.client, '🎫 Ticket ouvert', `${interaction.user.tag} a ouvert un ticket : ${channel}`, 0x3498db);
      return;
    }

    // Fermeture d'un ticket
    if (customId === 'ticket_close') {
      const data = load();
      if (!data.tickets) data.tickets = {};
      const ticket = data.tickets[interaction.channel.id];

      if (!ticket) {
        return interaction.reply({ content: "Ce salon n'est pas reconnu comme un ticket actif.", flags: MessageFlags.Ephemeral });
      }

      const isOwner = ticket.userId === interaction.user.id;
      if (!isOwner && !isStaff(interaction.member)) {
        return interaction.reply({ content: "Tu n'as pas la permission de fermer ce ticket.", flags: MessageFlags.Ephemeral });
      }

      await interaction.reply('🔒 Fermeture du ticket en cours, génération du transcript...');

      const transcript = await buildTranscript(interaction.channel);
      const logsChannel = await interaction.guild.channels.fetch(config.LOGS_CHANNEL_ID).catch(() => null);

      if (logsChannel) {
        const embed = new EmbedBuilder()
          .setTitle('🔒 Ticket fermé')
          .setDescription(
            `Ouvert par : <@${ticket.userId}> (${ticket.openedBy})\n` +
              `Fermé par : ${interaction.user.tag}\n` +
              `Salon : #${interaction.channel.name}`
          )
          .setColor(0x95a5a6)
          .setTimestamp();
        await logsChannel.send({ embeds: [embed], files: [transcript] });
      }

      delete data.tickets[interaction.channel.id];
      save(data);

      await interaction.channel.send('Ce salon va être supprimé dans quelques secondes.');
      setTimeout(() => {
        interaction.channel.delete().catch(() => {});
      }, 5000);
      return;
    }
  }

  // --- Soumission de formulaires (modals) ---
  if (interaction.isModalSubmit()) {
    if (interaction.customId.startsWith('annonce_modal|')) {
      const [, channelId, roleId] = interaction.customId.split('|');
      const titre = interaction.fields.getTextInputValue('annonce_titre') || '📢 Annonce';
      const message = interaction.fields.getTextInputValue('annonce_message');

      const targetChannel = await interaction.guild.channels.fetch(channelId).catch(() => null);
      if (!targetChannel || !targetChannel.isTextBased()) {
        return interaction.reply({ content: "Le salon choisi n'est plus valide.", flags: MessageFlags.Ephemeral });
      }

      const embed = new EmbedBuilder()
        .setTitle(titre)
        .setDescription(message)
        .setColor(0xc40000)
        .setFooter({ text: `Annonce de ${interaction.user.tag}` })
        .setTimestamp();

      // Defer la réponse immédiatement pour éviter l'expiration de l'interaction
      await interaction.deferReply({ flags: MessageFlags.Ephemeral }).catch(() => {});
      
      await targetChannel.send({ content: `<@&${roleId}>`, embeds: [embed] }).catch(() => {});
      await interaction.editReply({ content: `Annonce postée dans ${targetChannel} ✅` }).catch(() => {});

      await log(
        interaction.client,
        '📢 Annonce postée',
        `${interaction.user.tag} a posté une annonce dans ${targetChannel} (rôle pingé : <@&${roleId}>).`,
        0xc40000
      );
      return;
    }
  }
};
