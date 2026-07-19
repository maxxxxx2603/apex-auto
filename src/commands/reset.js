const { SlashCommandBuilder, PermissionFlagsBits, MessageFlags } = require('discord.js');
const { load, save } = require('../db');
const { resyncEmployee } = require('../utils/employeeSync');
const { getOrRecoverEmployee, recoverEmployeeFromChannel } = require('../utils/employeeRecovery');
const { STAGE_CATEGORY } = require('../utils/syncChannel');
const { log } = require('../utils/logger');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('reset')
    .setDescription("Remet à zéro le quota de ventes (par défaut : TOUS les salons employés des catégories connues)")
    .addChannelOption((o) =>
      o.setName('salon').setDescription('Ne réinitialiser que ce salon précis (optionnel)').setRequired(false)
    )
    .addUserOption((o) =>
      o
        .setName('membre')
        .setDescription("À préciser si le salon (unique) a été créé manuellement, pas avec /employer")
        .setRequired(false)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction) {
    const targetChannelOption = interaction.options.getChannel('salon');
    const memberOption = interaction.options.getMember('membre');
    const data = load();

    // --- Cas 1 : un salon précis est donné → comportement ciblé (comme avant) ---
    if (targetChannelOption) {
      let emp = getOrRecoverEmployee(data, targetChannelOption);

      if (!emp && memberOption) {
        const stageIndex = STAGE_CATEGORY.indexOf(targetChannelOption.parentId);
        if (stageIndex === -1) {
          return interaction.reply({
            content: `${targetChannelOption} n'est dans aucune des catégories employé/palier connues.`,
            flags: MessageFlags.Ephemeral,
          });
        }
        emp = {
          userId: memberOption.id,
          displayName: memberOption.displayName || memberOption.user.username,
          stage: stageIndex,
          quota: 0,
          totalVentes: 0,
        };
        data.employees[targetChannelOption.id] = emp;
      }

      if (!emp) {
        return interaction.reply({
          content:
            `${targetChannelOption} n'est pas reconnu comme un salon employé.\n` +
            `Si ce salon a été créé manuellement, relance en précisant l'option \`membre\`.`,
          ephemeral: true,
        });
      }

      emp.quota = 0;
      await resyncEmployee(interaction.guild, targetChannelOption.id, emp);
      save(data);

      await interaction.reply(`🔄 Quota remis à zéro pour **${emp.displayName}** (${targetChannelOption}).`);
      await log(interaction.client, '🔄 Reset quota', `Quota remis à zéro pour **${emp.displayName}** par ${interaction.user.tag}.`, 0xf1c40f);
      return;
    }

    // --- Cas 2 : aucun salon précisé → reset de TOUS les salons employés des catégories connues ---
    await interaction.deferReply({ ephemeral: true });

    // Retrouve d'abord les salons oubliés/manuels non encore en mémoire
    let recoveredCount = 0;
    for (const categoryId of STAGE_CATEGORY.filter(Boolean)) {
      const category = await interaction.guild.channels.fetch(categoryId).catch(() => null);
      if (!category) continue;
      const children = category.children?.cache || interaction.guild.channels.cache.filter((c) => c.parentId === categoryId);
      for (const channel of children.values()) {
        if (data.employees[channel.id]) continue;
        const recovered = recoverEmployeeFromChannel(channel);
        if (recovered) {
          data.employees[channel.id] = recovered;
          recoveredCount++;
        }
      }
    }

    let resetCount = 0;
    for (const [channelId, emp] of Object.entries(data.employees)) {
      try {
        emp.quota = 0;
        await resyncEmployee(interaction.guild, channelId, emp);
        resetCount++;
      } catch (e) {
        console.error(`Erreur reset salon ${channelId}:`, e);
      }
    }

    save(data);

    let message = `🔄 Quota remis à zéro pour ${resetCount} salon(s) employé(s).`;
    if (recoveredCount > 0) message += `\n🔎 ${recoveredCount} salon(s) retrouvé(s) et réintégré(s) au passage.`;
    await interaction.editReply(message);

    await log(
      interaction.client,
      '🔄 Reset quota global',
      `${interaction.user.tag} a remis à zéro le quota de ${resetCount} salon(s) employé(s).`,
      0xf1c40f
    );
  },
};
