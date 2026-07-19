const { SlashCommandBuilder, PermissionFlagsBits, ChannelType, MessageFlags } = require('discord.js');
const config = require('../config');
const { load, save } = require('../db');
const slugify = require('../utils/slugify');
const { log } = require('../utils/logger');
const { updateWarningBoard } = require('../utils/warningBoard');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('employer')
    .setDescription('Crée le salon employé pour un membre')
    .addUserOption((o) => o.setName('membre').setDescription('Membre à employer').setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    try {
    const member = interaction.options.getMember('membre');
    if (!member) {
      return interaction.editReply('❌ Membre introuvable sur ce serveur.');
    }

    // Vérifier que le membre n'est pas déjà employé
    const data = load();
    const alreadyEmployee = Object.values(data.employees).find((e) => e.userId === member.id);
    if (alreadyEmployee) {
      return interaction.editReply(`⚠️ <@${member.id}> est déjà employé(e) (salon : <#${Object.keys(data.employees).find(k => data.employees[k].userId === member.id)}>).`);
    }

    const displayName = member.displayName || member.user.username;
    const slug = slugify(displayName);
    const channelName = `🔴┃${slug}`;

    const category = await interaction.guild.channels.fetch(config.EMPLOYER_CATEGORY_ID).catch(() => null);
    if (!category) {
      return interaction.editReply("Catégorie employé introuvable (vérifie l'ID en config).");
    }

    const channel = await interaction.guild.channels.create({
      name: channelName,
      type: ChannelType.GuildText,
      parent: category.id,
      topic: `📊 Progression : 0/${config.QUOTA_TARGET} ventes (total historique : 0)`,
      permissionOverwrites: [
        { id: interaction.guild.roles.everyone.id, deny: [PermissionFlagsBits.ViewChannel] },
        {
          id: member.id,
          allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory],
        },
      ],
    });

    // Positionner le salon tout en bas de la catégorie
    const siblingsCount = category.children.cache.size;
    await channel.setPosition(siblingsCount).catch(() => {});

    await member.roles.add([config.ROLE_EMPLOYER_1, config.ROLE_EMPLOYER_2]).catch(() => {});
    await member.roles.remove(config.ROLE_EMPLOYEE_ACCEPTED).catch(() => {});

    data.employees[channel.id] = {
      userId: member.id,
      displayName,
      stage: 0,
      quota: 0,
      totalVentes: 0,
    };
    save(data);
    await updateWarningBoard(interaction.guild).catch(() => {});

    await channel.send({ content: `<@${member.id}> Bienvenue chez **Apex Auto** ! Ce salon est ton espace employé.` });
    await interaction.editReply(`Salon employé créé : ${channel}`);

    await log(
      interaction.client,
      '👔 Nouvel employé',
      `**${displayName}** (${member.id}) a été employé par ${interaction.user.tag}.\nSalon : ${channel}`,
      0x2ecc71
    );
    } catch (err) {
      console.error('[employer] Erreur:', err);
      return interaction.editReply(`❌ Une erreur est survenue : ${err.message}`);
    }
  },
};
