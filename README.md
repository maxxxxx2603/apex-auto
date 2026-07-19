# Apex Auto Bot

Bot Discord de recrutement CV + gestion des employés pour "Apex Auto".

## ⚠️ Sécurité — À FAIRE EN PREMIER

Le token que tu as collé dans le chat est **grillé**. Va sur le
[Discord Developer Portal](https://discord.com/developers/applications) → ton application → **Bot** → **Reset Token**,
puis récupère le nouveau token. Ne le mets **jamais** dans un fichier commit sur Git, ni dans un message,
uniquement dans les variables d'environnement (`.env` en local, "Variables" sur Railway).

## Fonctionnalités

- `/post-recrutement` : poste l'annonce de recrutement avec le bouton "Dépôt CV" et ping le rôle.
- Bouton "Dépôt CV" : crée un salon privé, pose les questions une par une (nom/prénom, âge RP, expérience,
  motivations, ancienneté, âge réel, disponibilités), renomme le membre dès son nom/prénom donné, puis demande
  une photo de carte d'identité (refuse tout ce qui n'est pas une image).
- Le CV complet part dans le salon de review avec boutons **Accepter** / **Refuser** :
  - Accepter → DM de confirmation, demande des dispos dans le salon dédié, envoie la carte d'identité dans le
    salon dédié, ajoute le rôle "employé accepté".
  - Refuser → DM de refus + conseil de repostuler dans une semaine.
- `/employer @membre` : crée le salon employé (préfixe 🔴), donne les rôles employé, retire le rôle "accepté".
- `/up [salon]` : fait monter le salon/le membre à travers les 3 paliers (catégorie + rôles changent à chaque
  palier). Par défaut agit sur le salon où la commande est tapée, mais tu peux préciser un autre salon.
- Quota de ventes : chaque image postée par l'employé dans son salon compte comme une vente. À 30, le salon
  passe automatiquement de 🔴 à 🟢.
- `/reset [salon]` : remet le quota à zéro pour le salon employé donné (par défaut : le salon actuel).
- `/reset` : **sans argument, réinitialise le quota de TOUS les salons employés** des 4 catégories connues
  d'un coup (elle retrouve au passage les salons oubliés ou créés manuellement). Ajoute `salon:#...` (et
  éventuellement `membre:@...` si le salon a été créé manuellement) pour ne cibler qu'un seul salon.
- `/up membre:@...` : fait monter le salon/le membre à travers les 3 paliers (catégorie + rôles changent à
  chaque palier). Il suffit de mentionner la personne, le bot retrouve automatiquement son salon employé grâce
  au lien personne↔salon stocké en mémoire. L'option `salon` n'est utile que si son salon a été créé
  manuellement et jamais lié.
- `/setup` : resynchronise tous les salons employés. Elle regarde les **rôles réels** que possède chaque
  membre (pas seulement ce que le bot a en mémoire), en déduit le bon palier, corrige les rôles s'il y a un
  écart (par exemple si quelqu'un a changé un rôle à la main), retrouve les salons oubliés dans les catégories
  connues, puis remet chaque salon dans la bonne catégorie avec le bon emoji (🔴/🟢 selon le quota).
- `/annonce salon:#... role:@...` : ouvre un **formulaire Discord** (titre + zone de texte multi-lignes
  confortable) pour rédiger l'annonce, puis la poste avec le ping du rôle choisi.
- **Système d'avertissements** : `/avertissement membre:@... motif:...` donne un avertissement. La personne
  reçoit un message dans son propre salon employé avec le motif, un tableau (embed mis à jour en direct) dans
  le salon `1521231242878521424` liste **tous les employés actuels** avec leur total d'avertissements (0 si
  aucun), et à partir de 3 avertissements un message ping automatiquement la direction
  (`<@&1521235816054001744>`) dans ce même salon. Ce tableau se crée/actualise automatiquement au démarrage du
  bot, après `/employer`, `/setup` et `/virer` — un employé en disparaît dès qu'il n'est plus employé.
- `/virer membre:@... raison:... [details]` : renvoie un employé — retire tous ses rôles sauf
  `1208469657019879486`, supprime son salon employé, le retire du tableau, et lui envoie un MP avec la raison
  choisie (Inactivité / Erreur professionnelle / Autre — préciser dans `details` si "Autre").
- **Progression des ventes** : chaque image postée dans le salon employé ajoute une réaction ✅ de
  confirmation et incrémente à la fois le quota (remis à zéro par `/reset`) et un **total historique**
  (`totalVentes`) qui n'est jamais remis à zéro, pour suivre la progression dans la durée.
- `/total [membre]` : affiche le total de ventes et le quota actuel d'un employé précis, ou (sans argument,
  tapée dans un salon employé) celui du salon courant, ou sinon le classement de tous les employés.
- **Progression dans la description du salon** : chaque salon employé affiche dans sa description (topic)
  un résumé du type `📊 Progression : 5/30 ventes (total historique : 42)`. Mis à jour automatiquement toutes
  les 10 minutes (pas à chaque vente) pour éviter tout rate limit Discord sur les modifications de salon.
- **Système de tickets (prise de RDV)** : `/post-ticket` poste un panneau avec un bouton "Prendre rendez-vous"
  dans le salon `1521238649172131981`. Un clic crée un salon privé pour la personne, avec un bouton "Fermer le
  ticket" dedans (utilisable par la personne ou par un administrateur). À la fermeture, un transcript complet
  de la conversation est généré et envoyé dans le salon de logs, puis le salon est supprimé.
- Le bot se resynchronise aussi automatiquement tout seul à chaque démarrage (mémoire persistante via `db.json`).
- Tous les événements importants sont loggés dans le salon de logs configuré.

## Configuration des IDs

Tous les IDs (salons, rôles, catégories) sont dans `src/config.js`. Modifie-les si jamais un ID change côté serveur.

## Enregistrement des commandes slash

**Depuis cette version, ce n'est plus une étape manuelle** : le bot enregistre lui-même ses commandes
automatiquement à chaque démarrage (sur le serveur `GUILD_ID` s'il est défini, sinon globalement). Tu n'as
donc rien à faire de spécial sur Railway — dès que le bot affiche `✅ Connecté en tant que ...` dans les logs,
les commandes se mettent à jour toutes seules dans la foulée.

Si tu préfères quand même le faire manuellement en local (optionnel) :
```bash
npm run deploy-commands
```

## Installation locale (optionnel)

```bash
npm install
cp .env.example .env
# remplis .env avec ton NOUVEAU token, le CLIENT_ID de l'application, et le GUILD_ID de ton serveur
npm start
```

## Permissions requises pour le bot sur Discord

Quand tu invites le bot (OAuth2 → URL Generator → coche `bot` + `applications.commands`), donne-lui au minimum :

- Gérer les salons (Manage Channels)
- Gérer les rôles (Manage Roles)
- Gérer les pseudos (Manage Nicknames)
- Voir les salons, Envoyer des messages, Joindre des fichiers, Intégrer des liens
- Gérer les messages (pour éditer/supprimer proprement)

**Important** : dans les paramètres du serveur → Rôles, le rôle du bot doit être placé **au-dessus** de tous les
rôles qu'il doit ajouter/retirer (ROLE_UP1, ROLE_UP2, ROLE_UP3, ROLE_EMPLOYER_1/2, ROLE_EMPLOYEE_ACCEPTED), sinon
Discord refusera silencieusement les changements de rôle.

## Déploiement sur Railway

1. Crée un nouveau repo GitHub (privé de préférence) et pousse ce projet dedans (le `.gitignore` exclut déjà
   `.env` et `db.json`, donc ton token ne partira jamais sur GitHub).
2. Sur Railway : **New Project → Deploy from GitHub repo**, sélectionne ce repo.
3. Dans l'onglet **Variables** du service Railway, ajoute :
   - `DISCORD_TOKEN` = ton nouveau token
   - `CLIENT_ID` = l'ID de l'application Discord
   - `GUILD_ID` = l'ID de ton serveur (optionnel mais recommandé pour un déploiement instantané des commandes)
4. **Fortement recommandé — active la persistance** : sans ça, la mémoire du bot repart de zéro à chaque
   redéploiement (paliers, quotas, candidatures en cours). Voici comment faire, étape par étape :
   1. Dans ton projet Railway, clique sur ton service (le bot)
   2. Onglet **Settings** → section **Volumes** → clique **+ New Volume**
   3. Mets un point de montage, par exemple : `/app/data`
   4. Retourne dans l'onglet **Variables** et ajoute une nouvelle variable :
      - `DB_PATH` = `/app/data/db.json`
   5. Railway va redéployer automatiquement. Dans les logs, tu dois voir au démarrage :
      `💾 Base de données stockée dans : /app/data/db.json`
   6. À partir de là, `db.json` survit à tous les redéploiements suivants.

   Si tu ne définis pas `DB_PATH`, le bot fonctionne quand même (il utilise un fichier local non persistant), et
   le système de récupération automatique des salons compense en partie — mais les quotas seront perdus à
   chaque redéploiement.
5. C'est tout : Railway lance `npm start` automatiquement, et le bot enregistre ses commandes slash tout seul
   dès qu'il se connecte. Pas besoin de terminal local ni de commande manuelle.

## Notes

- `/post-recrutement` ne doit être lancée qu'une seule fois (ou à chaque fois que tu veux reposter l'annonce) —
  elle n'est pas automatique au démarrage pour éviter les doublons.
- La catégorie des salons de candidature CV (`CV_CATEGORY_ID` dans `src/config.js`) est laissée à `null` par
  défaut (salon créé à la racine du serveur). Mets un ID de catégorie si tu veux les ranger ailleurs.
