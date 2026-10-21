# 10 — Roadmap par jalons

Chaque jalon est livrable et déployé. Ne commence pas un jalon tant que la définition de « terminé » du précédent n'est pas remplie. Au début de chaque jalon, découpe-le en tâches dans une issue GitHub (ou dans `docs/progress.md`).

---

## M0 — Socle
**But** : un monorepo vide mais « prêt pour la prod ».
- pnpm workspaces + Turborepo, packages `config`, `engine`, `protocol`, `ui`, `i18n`, apps `web`, `server`, `native` (squelettes).
- TS strict, ESLint, Prettier, Lefthook, commitlint, release-please.
- `apps/server` : Worker Hono qui sert les assets de `apps/web` plus `GET /api/health`.
- `apps/web` : shell PWA (manifest, service worker), routage, i18n branché, `tokens.css` importé, fond de nuit, page d'accueil statique.
- Ladle avec un composant `Button` dans les deux thèmes.
- Workflows `ci.yml` et `deploy.yml` (preview et production).
- ADR 0001 à 0005 relus (déjà fournis), puis ADR 0007 pour le choix immuable ou immer.

**Terminé quand** : l'URL de production affiche l'accueil, la PWA est installable, la CI est verte et une PR produit une URL de preview.

## M1 — Moteur v0 (sans interface)
**But** : on peut jouer une partie Loups contre Villageois entièrement en tests.
- `GameState`, commandes, événements, `apply`, `evolve`, rejeu, `Undo`, `Rng` à graine.
- Machine d'états complète (`docs/01` §2), options (schéma Zod), votes (`R-30` à `R-35`), Maire (`R-50` à `R-52`), pipeline des morts (`R-40` à `R-43`), victoire (`R-01` à `R-06`).
- Rôles `werewolf` et `villager` sous forme de plugins, avec un registre.
- **Registre des modes** avec le seul mode `classic` (`docs/11`). L'architecture de plugin de mode (étapes de nuit, conditions de victoire, retouche de projection) est en place dès ce jalon, même si un seul mode l'utilise.
- Maire : élection au jour 1, et les deux fonctionnements de succession `designate` / `reelect` (`R-50` à `R-53`).
- `projectView` en liste blanche et un test de non-fuite générique.
- Le DSL de test et les tests de propriétés fast-check.

**Terminé quand** : la couverture du moteur dépasse 90 % et 1 000 parties aléatoires se terminent sans violer d'invariant.

## M2 — Comptes et temps réel
**But** : de vrais utilisateurs se connectent à une vraie partie (UI minimale).
- D1 + Drizzle + migrations, Better Auth (e-mail et mot de passe, Google en option), profil.
- REST : créer une partie, rejoindre par code, ticket WS.
- Durable Object `GameRoom` : sockets en hibernation, journal SQLite, diffusion des vues projetées, minuteurs (alarms), reconnexion.
- Client : store Zustand du WS, indicateur de connexion.
- Écrans fonctionnels mais bruts : salon, distribution, une vue de débogage de l'état.

**Terminé quand** : 6 navigateurs (1 meneur et 5 joueurs) jouent une partie Loups contre Villageois en production, et le rechargement d'une page en pleine nuit restaure l'état.

## M3 — Rôles classiques
- `seer`, `witch`, `hunter`, `cupid`, `little-girl`, plus les amoureux (`R-03`).
- Ordre de nuit calculé, actions immédiates, informations privées.
- Les cas limites 1, 2, 3, 9 de `docs/02` sont testés.
- Cartes de rôle en fallback SVG.

**Terminé quand** : chaque rôle a ses tests, son test de non-fuite et ses textes i18n, et une partie e2e à 8 joueurs utilise tous les rôles classiques.

## M4 — Interface complète (présentiel jouable)
- Design system complet (`docs/06`) avec Ladle.
- Vue joueur : carte « maintenir pour révéler », écran de nuit uniforme, actions, vote, « Mes informations ».
- Vue meneur : `NightStepList`, `NarratorScript` (avec synthèse vocale en option), cercle des joueurs, journal, annuler, forcer, mode correction.
- Écran de configuration : suggestion de composition, indicateur d'équilibre, options.
- Écran de fin et chronologie.
- Transitions jour et nuit, haptique, sons (option).

**Terminé quand** : une vraie partie en présentiel à 8 ou plus est jouée sans papier, le score Lighthouse (PWA, accessibilité) est d'au moins 90 et axe ne signale aucune violation sérieuse.

## M4b — UI vivante
**But** : passer d'une interface jouable à une interface vivante, sur la direction Lanterne.
- Composant `PixelSprite` (planches de 12 images, échelles ×1, ×2, ×4, ×6, mouvement réduit) et sprites de travail de `design/sprites/` pour tous les rôles (fallback généré pour les rôles sans sprite).
- Les **six moments vivants** de `docs/06` §Mouvement, avec la bibliothèque Motion, et l'ambiance de nuit (étoiles, brume).
- Sons publics synchronisés par horodatage serveur, profils audio (`docs/12` §5).
- Catalogue Ladle avec tous les composants en nuit et en jour, sur téléphone, tablette et ordinateur.
- Vérification visuelle : captures Playwright des écrans clés, comparées aux écrans de référence « Directions premium » du canevas.

**Terminé quand** : les six moments sont implémentés, désactivables par « mouvement réduit », et le budget de performance tient (60 images/s sur un téléphone moyen, aucune animation qui bloque une action).

## M5 — Mode distanciel et compte
- Canaux de chat (US-70) avec contrôle d'accès côté serveur, limitation de débit, mise en sourdine.
- Option `parallelNight`.
- Historique des parties, statistiques de base, presets de composition.
- Remplacement d'un joueur (`R-62`), transfert du rôle de meneur (US-81).

**Terminé quand** : une partie entière est jouée à distance avec un appel vocal externe, et le test de non-fuite du chat (un message des loups n'est jamais reçu par un non-loup) passe.

- **Modificateur Role play** (`docs/01` §9) : registre des modificateurs, fiches de personnage, phase `PRESENTATIONS`, nuit 1 sans mort, script du meneur personnalisé.

## M6 — Rôles d'extension
- Tous les rôles `extension` de `docs/02`, dans cet ordre : Salvateur, Ancien, Idiot du village, Bouc émissaire, Corbeau, Renard, Montreur d'ours, Chevalier, Enfant sauvage, Chien-loup, Deux sœurs / Trois frères, Infect père des loups, Grand méchant loup, Loup blanc, Joueur de flûte, Ange, Servante dévouée, Voleur.
- Tous les cas limites de `docs/02`.

**Terminé quand** : chaque rôle est testé, et les tests de propriétés tournent avec toutes les compositions possibles.

## M7 — Modes de jeu spéciaux
- **Vampire** (`docs/11` §3) : rôle `vampire`, statut converti, succession `V-20`, victoire `V-30`, adaptations Salvateur, Sorcière et Voyante. Les 8 cas limites de `docs/11` sont testés.
- **Nuit blanche** (`docs/11` §2) : composition leurre, tirage de la victime, bouton « Pas de loup » dans **tous** les modes, défaite à 2 vivants.
- **Test de déguisement `W-33`** : la forme des messages envoyés est identique à celle d'une partie classique avec la même composition leurre.
- UI : écran de choix de mode (`ModeCard`), outils du meneur propres à chaque mode, révélation de fin « C'était une Nuit blanche ».

**Terminé quand** : une partie de chaque mode est jouée en e2e, et le test `W-33` passe sur 100 graines.

## M8 — Apps natives et releases
- `apps/native` Tauri 2 : desktop + Android (+ iOS désactivable), deep links, haptique, stockage sécurisé du jeton (plugin bearer).
- `release.yml` complet, mise à jour automatique sur desktop, APK signé.
- Optimisation : diffs (`patch`) au lieu d'états complets, budget de bundle respecté.

**Terminé quand** : la release `v1.0.0-rc.1` est publiée avec les binaires Windows, macOS, Linux et Android téléchargeables, et une partie mixte (PWA iPhone, APK Android, desktop) se joue.

## M9 — Finitions V1.0
- Remplacement des fallbacks par les illustrations finales (`docs/07`), `CREDITS.md` complet.
- Traduction anglaise.
- Audit d'accessibilité manuel (VoiceOver, TalkBack, clavier).
- Page « À propos », mentions, politique de confidentialité (données de compte, suppression du compte).

**Terminé quand** : la `v1.0.0` est publiée.

---

## Après la V1 (pistes)
Meneur automatique, nouveaux modes de jeu, rôles personnalisés (éditeur basé sur le système de plugins), notifications push, statistiques avancées, thèmes de cartes.
