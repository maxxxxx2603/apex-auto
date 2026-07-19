const config = require('../config');
const slugify = require('./slugify');

const STAGE_CATEGORY = [
  config.EMPLOYER_CATEGORY_ID,
  config.UP1_CATEGORY_ID,
  config.UP2_CATEGORY_ID,
  config.UP3_CATEGORY_ID,
];

// Remet un salon employé à l'état cohérent avec les données stockées :
// bonne catégorie selon le palier (stage), bon emoji selon le quota.
async function syncChannel(guild, channelId, emp) {
  const channel = await guild.channels.fetch(channelId).catch(() => null);
  if (!channel) return null;

  const targetCategory = STAGE_CATEGORY[emp.stage] ?? STAGE_CATEGORY[STAGE_CATEGORY.length - 1];
  const emoji = emp.quota >= config.QUOTA_TARGET ? '🟢' : '🔴';
  const baseName = emp.displayName ? slugify(emp.displayName) : (channel.name.split('┃')[1] || 'employe');
  const newName = `${emoji}┃${baseName}`;

  const updates = {};
  if (channel.parentId !== targetCategory) updates.parent = targetCategory;
  if (channel.name !== newName) updates.name = newName;

  if (Object.keys(updates).length) {
    await channel.edit(updates);
  }
  return channel;
}

module.exports = { syncChannel, STAGE_CATEGORY };
