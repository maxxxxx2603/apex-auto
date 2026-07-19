const { AttachmentBuilder } = require('discord.js');

// Récupère jusqu'à 500 messages du salon (les plus récents en premier côté API, remis dans l'ordre
// chronologique ici) et les formate en texte simple pour archivage.
async function buildTranscript(channel) {
  let allMessages = [];
  let lastId;

  for (let i = 0; i < 5; i++) {
    const options = { limit: 100 };
    if (lastId) options.before = lastId;
    const batch = await channel.messages.fetch(options).catch(() => null);
    if (!batch || batch.size === 0) break;
    allMessages = allMessages.concat(Array.from(batch.values()));
    lastId = batch.last().id;
    if (batch.size < 100) break;
  }

  allMessages.reverse(); // remettre dans l'ordre chronologique

  const lines = allMessages.map((m) => {
    const time = m.createdAt.toISOString().replace('T', ' ').slice(0, 19);
    const author = m.author?.tag || 'inconnu';
    const content = m.content || '(pas de texte)';
    const attachments = m.attachments.size > 0 ? ` [pièce(s) jointe(s): ${m.attachments.map((a) => a.url).join(', ')}]` : '';
    return `[${time}] ${author}: ${content}${attachments}`;
  });

  const text = lines.join('\n') || '(aucun message dans ce ticket)';
  return new AttachmentBuilder(Buffer.from(text, 'utf-8'), { name: `transcript-${channel.name}.txt` });
}

module.exports = { buildTranscript };
