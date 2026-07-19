const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const config = require('../config');
const { load, save } = require('../db');
const { syncChannel, STAGE_CATEGORY } = require('../utils/syncChannel');
const { log } = require('../utils/logger');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('up')
    .setDescription('Fait monter de palier un employé (retrouve son salon automatiquement)')
    .addUserOption((o) => o.setName('membre').setDescription('Employé à faire monter').setRequired(true))
    .addChannelOption((o) =>
      o
        .setName('salon')
        .setDescription("À préciser seulement si son salon a été créé manuellement et n'est pas encore lié")
        .setRequired(false)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction) {
    const member = interaction.options.getMember('membre');
    const salonOption = interaction.options.getChannel('salon');
    const data = load();

    if (!member) {
      return interaction.reply({ content: 'Membre introuvable sur ce serveur.', flags: MessageFlags.Ephemeral });
    }

    // On retrouve le salon lié à cette personne via la mémoire du bot (le lien personne <-> salon
    // est établi par /employer, et se retrouve automatiquement même après un redémarrage).
    let channelId = null;
    let emp = null;
    const existingEntry = Object.entries(data.employees).find(([, e]) => e.userId === member.id);

    if (existingEntry) {
      [channelId, emp] = existingEntry;
    } else if (salonOption) {
      // Salon créé manuellement et encore jamais lié : on l'associe maintenant grâce à sa catégorie.
      const stageIndex = STAGE_CATEGORY.indexOf(salonOption.parentId);
      if (stageIndex === -1) {
        return interaction.reply({
          content: `${salonOption} n'est dans aucune des catégories employé/palier connues.`,
          ephemeral: true,
        });
      }
      channelId = salonOption.id;
      emp = {
        userId: member.id,
        displayName: member.displayName || member.user.username,
        stage: stageIndex,
        quota: 0,
        totalVentes: 0,
      };
      data.employees[channelId] = emp;
    } else {
      return interaction.reply({
        content:
          `Je ne trouve pas de salon employé lié à ${member}.\n` +
          `Si son salon a été créé manuellement (pas avec /employer), relance en précisant l'option \`salon\`.`,
        ephemeral: true,
      });
    }

    if (emp.stage === 0) {
      await member.roles.add(config.ROLE_UP1).catch(() => {});
      await member.roles.remove(config.ROLE_EMPLOYER_2).catch(() => {});
      emp.stage = 1;
    } else if (emp.stage === 1) {
      await member.roles.add(config.ROLE_UP2).catch(() => {});
      await member.roles.remove(config.ROLE_UP1).catch(() => {});
      emp.stage = 2;
    } else if (emp.stage === 2) {
      await member.roles.add(config.ROLE_UP3).catch(() => {});
      await member.roles.remove(config.ROLE_UP2).catch(() => {});
      emp.stage = 3;
    } else {
      return interaction.reply({ content: 'Ce membre est déjà au palier maximum.', ephemeral: true });
    }

    save(data);
    await syncChannel(interaction.guild, channelId, emp);

    await interaction.reply(`⬆️ **${emp.displayName}** passe au palier ${emp.stage}.`);
    await log(interaction.client, '⬆️ Up de palier', `**${emp.displayName}** est passé au palier ${emp.stage} par ${interaction.user.tag}.`, 0x3498db);
  },
};
