require('dotenv').config();
const { Client, GatewayIntentBits, Partials, Collection } = require('discord.js');

// Évite que le bot crash sur une promesse non gérée
process.on('unhandledRejection', (err) => {
  console.error('[unhandledRejection]', err);
});
process.on('uncaughtException', (err) => {
  console.error('[uncaughtException]', err);
});

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
  partials: [Partials.Channel],
});

// Chargement des commandes
client.commands = new Collection();
const commandFiles = ['employer', 'up', 'reset', 'setup', 'postRecrutement', 'annonce', 'postTicket', 'avertissement', 'virer', 'total'];
for (const file of commandFiles) {
  const command = require(`./commands/${file}`);
  client.commands.set(command.data.name, command);
}

const interactionCreate = require('./handlers/interactionCreate');
const messageCreate = require('./handlers/messageCreate');
const ready = require('./handlers/ready');
const registerCommands = require('./registerCommands');
const { updateEmployeeTopics } = require('./utils/topicUpdater');

const TOPIC_UPDATE_INTERVAL_MS = 10 * 60 * 1000; // 10 minutes

client.once('clientReady', async () => {
  await registerCommands(client);
  await ready(client);

  // Première mise à jour des descriptions de salon juste après le démarrage,
  // puis toutes les 10 minutes ensuite (pour éviter les rate limits Discord).
  await updateEmployeeTopics(client).catch((e) => console.error('Erreur updateEmployeeTopics:', e));
  setInterval(() => {
    updateEmployeeTopics(client).catch((e) => console.error('Erreur updateEmployeeTopics:', e));
  }, TOPIC_UPDATE_INTERVAL_MS);
});
client.on('interactionCreate', (interaction) => interactionCreate(client, interaction));
client.on('messageCreate', (message) => messageCreate(client, message));

if (!process.env.DISCORD_TOKEN) {
  console.error('❌ DISCORD_TOKEN manquant dans les variables d\'environnement.');
  process.exit(1);
}

const { DB_PATH } = require('./db');
console.log(`💾 Base de données stockée dans : ${DB_PATH}`);

client.login(process.env.DISCORD_TOKEN);
