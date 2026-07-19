const { REST, Routes } = require('discord.js');

const commandFiles = ['employer', 'up', 'reset', 'setup', 'postRecrutement', 'annonce', 'postTicket', 'avertissement', 'virer', 'total'];

async function registerCommands(client) {
  const commands = commandFiles.map((file) => require(`./commands/${file}`).data.toJSON());

  if (!process.env.CLIENT_ID) {
    console.error('❌ CLIENT_ID manquant, impossible d\'enregistrer les commandes.');
    return;
  }

  const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);

  try {
    if (process.env.GUILD_ID) {
      await rest.put(Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID), { body: commands });
      console.log(`✅ ${commands.length} commande(s) enregistrée(s) sur le serveur ${process.env.GUILD_ID}.`);
    } else {
      await rest.put(Routes.applicationCommands(process.env.CLIENT_ID), { body: commands });
      console.log(`✅ ${commands.length} commande(s) enregistrée(s) globalement (peut prendre jusqu'à 1h à apparaître).`);
    }
  } catch (error) {
    console.error('❌ Erreur en enregistrant les commandes:', error);
  }
}

module.exports = registerCommands;
