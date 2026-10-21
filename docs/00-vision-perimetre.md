# 00 — Vision et périmètre

## Vision

Une seule app pour jouer au Loup-garou **sans cartes, sans papier et sans erreur du meneur**. Le meneur se concentre sur la mise en scène pendant que l'app gère les rôles, l'ordre de nuit, les pouvoirs, les morts, les votes et les conditions de victoire. L'app fonctionne autour d'une table comme en visio.

## Personas

| Persona | Besoin principal | Appareil typique |
|---|---|---|
| **Meneur** | Créer et configurer la partie, voir tout l'état caché, faire avancer les phases, ne rien oublier (ordre de nuit, effets différés, égalités) | Tablette ou ordinateur, parfois téléphone |
| **Joueur** | Rejoindre vite, voir son rôle en secret, agir la nuit, voter, suivre qui est mort | Téléphone |
| **Joueur mort / spectateur** | Suivre la partie sans pouvoir influencer les vivants | Téléphone |

## Principes produit

1. **Un rôle reste secret même quand les téléphones sont posés sur la table.** On utilise un écran de couverture, on maintient appuyé pour révéler et le masquage est automatique.
2. **Le meneur garde la main.** L'app propose et automatise, et le meneur valide les transitions de phase. Il peut annuler la dernière action et corriger une erreur (avec journalisation).
3. **Toujours à la voix.** On joue autour d'une table (**présentiel**) ou en appel vocal sur Discord ou un autre outil (**distanciel**). Dans les deux cas, le meneur raconte et le village débat à voix haute. L'app ne remplace pas la voix : elle gère les secrets, les actions et les votes. À distance, des canaux écrits restent disponibles en complément (loups la nuit, cimetière, message privé au meneur, village en option). Il n'y a pas de matchmaking : on joue entre personnes qui se connaissent.
4. **On joue en moins d'une minute.** Le meneur crée la partie, affiche un code ou un QR, les joueurs rejoignent, la composition est proposée automatiquement selon le nombre de joueurs, et c'est parti.

## Périmètre V1 (MVP)

- Comptes utilisateurs (e-mail + mot de passe, connexion Google en option), profil (pseudo, avatar choisi dans une galerie interne).
- Création de partie, salon d'attente avec code à 6 caractères et QR, gestion des joueurs (expulser, réordonner les places).
- Configuration : mode de jeu, composition des rôles (manuelle ou suggérée), options de règles (voir `docs/01`), mode présentiel ou distanciel, minuteurs.
- Déroulé complet : distribution, nuits, jours, élection du maire, votes, morts, effets différés, fin de partie et révélation.
- Tous les rôles de la liste V1 dans `docs/02-roles.md`.
- Trois **modes de jeu** : Classique, Nuit blanche (déguisée) et Vampire (`docs/11-modes-de-jeu.md`).
- Le modificateur **Role play** : fiches de personnage, présentations au jour 1, nuit 1 sans mort (`docs/01` §9).
- L'élection du **Maire** et sa succession (désignation ou réélection, au choix du meneur).
- Tableau de bord du meneur : état complet, script de narration, file d'actions en attente, annuler, journal.
- Chat (mode distanciel) : village, loups, cimetière, canal privé avec le meneur.
- Reconnexion transparente (le joueur ferme l'app et la rouvre, il retrouve sa partie).
- Historique des parties et statistiques de base par compte.
- Compositions sauvegardées (« presets ») par compte.
- PWA installable, ainsi que des releases natives Windows, macOS, Linux, Android et iOS.
- Interface en français, avec l'infrastructure i18n en place.

## Hors périmètre V1 (prévu plus tard)

- Meneur automatique (partie sans meneur humain) → V2.
- Nouveaux modes de jeu (au-delà des trois de la V1) → ajoutés comme plugins de mode, sans changer le cœur.
- Création de rôles personnalisés par les utilisateurs → V2 (le moteur doit le permettre, voir `docs/04`).
- Chat vocal ou vidéo intégré : on s'appuie sur un outil externe (Discord, Meet).
- Matchmaking public ou parties ouvertes à des inconnus.
- Classement, succès et cosmétiques payants.
- Notifications push natives (seules les notifications PWA locales en V1, si le temps le permet).

## Contraintes

- **Coût d'hébergement visé : 0 €** (formule gratuite Cloudflare). L'architecture doit rester dans les quotas gratuits pour un usage entre amis.
- Une partie compte de **5 à 24 joueurs**, plus 1 meneur.
- Latence perçue inférieure à 300 ms entre l'action du meneur et sa mise à jour chez les joueurs.
- Fonctionne sur les navigateurs mobiles récents (Safari iOS et Chrome Android).
