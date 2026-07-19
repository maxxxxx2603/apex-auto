const { SlashCommandBuilder, PermissionFlagsBits, MessageFlags } = require('discord.js');
const { load, save } = require('../db');
const { resyncEmployee } = require('../utils/employeeSync');
const { recoverEmployeeFromChannel } = require('../utils/employeeRecovery');
const { STAGE_CATEGORY } = require('../utils/syncChannel');
const { updateWarningBoard } = require('../utils/warningBoard');
const { log } = require('../utils/logger');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('setup')
    .setDescription('Resynchronise tous les salons employés (rôles réels → palier → catégorie + emoji)')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });
    const data = load();
    let fixedCount = 0;
    let correctedStages = 0;
    let recoveredCount = 0;

    // 1. Scanner les catégories connues pour retrouver les salons employés que le bot aurait oubliés
    //    (ex: après un redémarrage sans mémoire persistante).
    const categoryIds = STAGE_CATEGORY.filter(Boolean);
    for (const categoryId of categoryIds) {
      const category = await interaction.guild.channels.fetch(categoryId).catch(() => null);
      if (!category) continue;
      const children = category.children?.cache || interaction.guild.channels.cache.filter((c) => c.parentId === categoryId);
      for (const channel of children.values()) {
        if (data.employees[channel.id]) continue; // déjà connu
        const recovered = recoverEmployeeFromChannel(channel);
        if (recovered) {
          data.employees[channel.id] = recovered;
          recoveredCount++;
        }
      }
    }

    // 2. Resynchroniser tous les salons employés connus (existants + récupérés à l'instant)
    for (const [channelId, emp] of Object.entries(data.employees)) {
      try {
        const before = emp.stage;
        const result = await resyncEmployee(interaction.guild, channelId, emp);
        if (result.channel) fixedCount++;
        if (result.stageChanged) correctedStages++;
      } catch (e) {
        console.error(`Erreur sync salon ${channelId}:`, e);
      }
    }

    save(data);
    await updateWarningBoard(interaction.guild).catch(() => {});

    let message = `✅ Resynchronisation terminée pour ${fixedCount} salon(s) employé(s).`;
    if (recoveredCount > 0) message += `\n🔎 ${recoveredCount} salon(s) retrouvé(s) et réintégré(s) dans la mémoire du bot.`;
    if (correctedStages > 0) message += `\n⚠️ ${correctedStages} palier(s) corrigé(s) car les rôles ne correspondaient pas à la mémoire du bot.`;

    await interaction.editReply(message);

    await log(
      interaction.client,
      '⚙️ Setup',
      `Resynchronisation manuelle lancée par ${interaction.user.tag} (${fixedCount} salon(s), ${recoveredCount} récupéré(s), ${correctedStages} palier(s) corrigé(s)).`,
      0x95a5a6
    );
  },
};
