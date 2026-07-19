const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, AttachmentBuilder } = require('discord.js');
const config = require('../config');
const { load, save } = require('../db');
const { syncChannel, STAGE_CATEGORY } = require('../utils/syncChannel');
const { log } = require('../utils/logger');
const questions = require('../cvQuestions');
const { isImageAttachment } = require('../utils/isImage');

function firstImageAttachment(message) {
  return message.attachments.find((a) => isImageAttachment(a));
}

module.exports = async function messageCreate(client, message) {
  if (message.author.bot) return;

  const data = load();

  // --- Comptage du quota (ventes = images postées dans le salon employé) ---
  // Double vérification volontaire : le salon doit être suivi comme salon employé ET être physiquement
  // situé dans une des 4 catégories employé/palier — jamais ailleurs (tickets, CV, salons annexes, etc.),
  // même si une entrée existait par erreur en mémoire.
  const emp = data.employees[message.channel.id];
  const isInEmployerCategory = STAGE_CATEGORY.includes(message.channel.parentId);

  if (emp && isInEmployerCategory) {
    const imageCount = message.attachments.filter((a) => isImageAttachment(a)).size;
    if (imageCount > 0) {
      const wasBelow = emp.quota < config.QUOTA_TARGET;
      emp.quota += imageCount;
      // Compteur de ventes total, indépendant du quota : /reset remet le quota à zéro mais ne touche pas
      // à ce total, qui garde tout l'historique de progression de l'employé (comme au EMS).
      emp.totalVentes = (emp.totalVentes || 0) + imageCount;
      save(data);
      await syncChannel(message.guild, message.channel.id, emp);

      // Réaction de confirmation + petit rapport, sur le même principe que la validation du bot EMS
      await message.react('✅').catch(() => {});
      const reportEmbed = new EmbedBuilder()
        .setDescription(
          `✅ **Vente comptabilisée** pour **${emp.displayName}**\n` +
            `Quota : **${emp.quota}/${config.QUOTA_TARGET}** — Total historique : **${emp.totalVentes}**`
        )
        .setColor(0x2ecc71);
      await message.reply({ embeds: [reportEmbed] }).catch(() => {});

      if (wasBelow && emp.quota >= config.QUOTA_TARGET) {
        await message.channel.send(`🟢 Quota de ${config.QUOTA_TARGET} atteint pour **${emp.displayName}** !`);
        await log(client, '🟢 Quota atteint', `**${emp.displayName}** a atteint son quota de ${config.QUOTA_TARGET}.`, 0x2ecc71);
      }
    }
    return;
  }

  // --- Flux de candidature CV ---
  const session = data.cvSessions[message.channel.id];
  if (!session || message.author.id !== session.userId) return;

  // Étape des questions texte
  if (session.step < questions.length) {
    const current = questions[session.step];
    session.answers[current.key] = message.content;

    // Renommer le membre dès que le nom/prénom RP est donné
    if (current.key === 'nom_prenom') {
      await message.member.setNickname(message.content.slice(0, 32)).catch(() => {});
    }

    session.step += 1;
    save(data);

    if (session.step < questions.length) {
      await message.channel.send(questions[session.step].question);
    } else {
      await message.channel.send(
        "**Étape 8/8 — Pièce d'identité**\nEnvoie une **photo** de ta carte d'identité (image uniquement, aucun autre format accepté)."
      );
    }
    return;
  }

  // Étape finale : carte d'identité (image uniquement)
  const image = firstImageAttachment(message);
  if (!image) {
    await message.channel.send("❌ Merci d'envoyer uniquement une **image** de ta carte d'identité.");
    return;
  }

  session.idCardUrl = image.url;
  save(data);

  // On ré-uploade la carte d'identité en tant que nouvelle pièce jointe rattachée au message de review.
  // Comme ça, même si le salon de candidature est supprimé juste après, l'image reste valide et affichable
  // (sinon le lien CDN de l'image devient invalide dès que le salon/message d'origine disparaît).
  const idCardAttachment = new AttachmentBuilder(image.url, { name: 'carte-identite.png' });

  // Construire le récapitulatif et l'envoyer en review
  const reviewChannel = await message.guild.channels.fetch(config.CV_REVIEW_CHANNEL_ID).catch(() => null);
  let idCardPersistentUrl = null;

  if (reviewChannel) {
    // Fonction pour limiter la longueur des valeurs des champs (max 1024 caractères)
    const truncate = (str, max = 1024) => {
      if (!str) return 'N/A';
      const s = String(str).trim();
      return s.length > max ? s.substring(0, max - 3) + '...' : s;
    };

    const a = session.answers;
    const embed = new EmbedBuilder()
      .setTitle('📄 Nouvelle candidature — Apex Auto')
      .setDescription(`Candidat : <@${session.userId}>`)
      .addFields(
        { name: 'Nom Prénom', value: truncate(a.nom_prenom) },
        { name: 'Âge RP', value: truncate(a.age_rp), inline: true },
        { name: 'Âge réel (HRP)', value: truncate(a.age_reel), inline: true },
        { name: 'Ancienneté en ville', value: truncate(a.anciennete) },
        { name: 'Expérience précédente', value: truncate(a.experience) },
        { name: 'Motivations', value: truncate(a.motivations) },
        { name: 'Disponibilités', value: truncate(a.disponibilites) }
      )
      .setImage('attachment://carte-identite.png')
      .setColor(0xc40000)
      .setTimestamp();

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId(`cv_accept_${session.userId}`).setLabel('Accepter').setStyle(ButtonStyle.Success),
      new ButtonBuilder().setCustomId(`cv_refuse_${session.userId}`).setLabel('Refuser').setStyle(ButtonStyle.Danger)
    );

    const rolePing = config.CV_NOTIFY_ROLE_ID ? `<@&${config.CV_NOTIFY_ROLE_ID}>` : '';
    const sentMessage = await reviewChannel.send({ content: rolePing || undefined, embeds: [embed], components: [row], files: [idCardAttachment] });
    // On récupère l'URL définitive de l'image telle qu'hébergée sur CE message (celui-ci n'est jamais supprimé).
    idCardPersistentUrl = sentMessage.embeds[0]?.image?.url || null;
  }

  data.reviews[session.userId] = { ...session, idCardUrl: idCardPersistentUrl || session.idCardUrl };
  delete data.cvSessions[message.channel.id];
  save(data);

  await message.author
    .send('✅ Nous avons bien reçu ta candidature chez **Apex Auto**. Nous allons la traiter le plus rapidement possible.')
    .catch(() => {});

  await message.channel.send('✅ Candidature envoyée ! Ce salon va être supprimé dans quelques secondes.');
  await log(client, '📄 Nouvelle candidature', `<@${session.userId}> a soumis sa candidature.`, 0x3498db);

  setTimeout(() => {
    message.channel.delete().catch(() => {});
  }, 5000);
};
