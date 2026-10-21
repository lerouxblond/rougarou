# CLAUDE.md — Rougarou

Rougarou est une application multijoueur temps réel pour jouer au Loup-garou (jeu de déduction sociale). Le **meneur** (maître du jeu) pilote la partie depuis son appareil. Chaque **joueur** reçoit son rôle, agit la nuit, débat et vote depuis le sien. Le jeu se pratique en présentiel ou à distance.

Ce fichier contient les règles permanentes du projet. Lis-le en entier avant toute tâche, puis le document `docs/` qui concerne la tâche.

## Carte de la documentation

| Fichier | Contenu | À lire quand… |
|---|---|---|
| `docs/00-vision-perimetre.md` | Vision, personas, périmètre V1, hors périmètre | Toujours au démarrage d'un jalon |
| `docs/01-regles-du-jeu.md` | Déroulé d'une partie, phases, votes, conditions de victoire | Tu touches au moteur ou au flux de jeu |
| `docs/02-roles.md` | Catalogue des rôles, ordre de nuit, interactions et cas limites | Tu ajoutes ou modifies un rôle |
| `docs/11-modes-de-jeu.md` | Modes de jeu (Classique, Nuit blanche, Vampire), modificateurs (Role play), différence entre mode, modificateur, preset et composition | Tu touches aux règles, à la config ou à la projection |
| `docs/12-deroulement-partie.md` | Déroulé meneur/joueur pas à pas, pilotage jour/nuit, minuteurs, sons et vibrations, **registre des décisions D-xx** | Avant tout jalon : vérifie que ses décisions sont validées |
| `docs/03-fonctionnalites.md` | Écrans, user stories, critères d'acceptation | Tu construis de l'UI |
| `docs/04-architecture.md` | Monorepo, moteur, Durable Objects, protocole, base de données, sécurité | Toujours avant du code serveur ou du protocole |
| `docs/05-stack.md` | Technologies imposées et interdites | Avant d'ajouter une dépendance |
| `docs/06-design-system.md` | Identité, tokens, composants, accessibilité | Tu touches à l'UI |
| `docs/07-assets.md` | Illustrations, icônes, sons, licences | Tu ajoutes un visuel ou un son |
| `docs/08-deploiement.md` | Environnements, GitHub Actions, releases natives, secrets | Tu touches à la CI/CD |
| `docs/09-conventions.md` | Normes de code, Git, tests, documentation | Toujours |
| `docs/10-roadmap.md` | Jalons ordonnés avec définition de « terminé » | Pour savoir quoi faire ensuite |
| `docs/adr/` | Décisions d'architecture (ADR) | Avant de remettre une décision en cause |
| `design/tokens.css` | Source de vérité des design tokens | Tu stylises quoi que ce soit |

## Règles non négociables

1. **Le serveur fait autorité.** Toute la logique de jeu s'exécute dans `packages/engine`, appelée par le Durable Object `GameRoom`. Le client ne fait qu'afficher et envoyer des intentions. Il ne calcule jamais un résultat de jeu.
2. **Aucune fuite d'information cachée.** Le serveur envoie à chaque client une **vue projetée** (`projectView(state, viewerId)`). Un joueur ne reçoit jamais le rôle d'un autre joueur, ni les cibles de nuit, ni les messages d'un canal auquel il n'a pas accès. Ce n'est pas seulement l'UI qui masque ces informations : elles ne quittent jamais le serveur. Chaque nouveau rôle doit avoir un test de non-fuite. Un mode **déguisé** (Nuit blanche) ne doit jamais être détectable par un joueur, même en inspectant le trafic réseau (`docs/11`, `W-30` à `W-33`).
3. **Le moteur est pur.** `packages/engine` n'a aucune dépendance au réseau, au DOM, à Cloudflare ou à l'horloge. Le temps et l'aléa sont injectés (`now`, `rng` à graine). Le moteur suit le schéma `(state, command) => { state, events } | error`.
4. **Le protocole est typé et validé.** Tout message client↔serveur est défini dans `packages/protocol` avec Zod et validé des deux côtés. On n'utilise jamais de `any`, ni de JSON non validé.
5. **Les règles du jeu sont spécifiées avant d'être codées.** Si un comportement n'est pas décrit dans `docs/01`, `docs/02` ou `docs/11`, tu t'arrêtes et tu le proposes dans la doc (ou tu poses la question) au lieu d'improviser.
6. **Le français d'abord, avec i18n dès le départ.** Aucun texte en dur dans les composants : tout passe par les fichiers de traduction (`fr` par défaut, `en` prévu).
7. **Aucun asset ni texte officiel.** Les illustrations, les textes de cartes et la marque « Les Loups-garous de Thiercelieux » appartiennent à leurs ayants droit. Tous les visuels sont originaux (voir `docs/07-assets.md`).
8. **Pas de décision 🟡 implémentée en silence.** Avant un jalon, vérifie dans `docs/12` §7 que les décisions qui le bloquent sont ✅. Sinon, demande.
9. **L'accessibilité n'est pas optionnelle.** Le contraste respecte le niveau WCAG AA, tout se fait au clavier, les lecteurs d'écran sont pris en charge et `prefers-reduced-motion` est respecté.

## Commandes

```bash
pnpm install          # installer
pnpm dev              # web (Vite) + worker (wrangler dev) en parallèle
pnpm test             # tests unitaires (Vitest), tous packages
pnpm test:e2e         # Playwright (multi-contextes : 1 meneur + N joueurs)
pnpm lint             # ESLint + Prettier check
pnpm typecheck        # tsc --noEmit sur tout le monorepo
pnpm check            # lint + typecheck + test : à lancer avant chaque commit
pnpm --filter native tauri dev            # app desktop en local
pnpm --filter native tauri android dev    # app Android en local
```

## Commandes Claude Code du projet

- `/jalon [Mx]` : planifier puis exécuter le prochain jalon de la roadmap (suivi dans `docs/progress.md`).
- `/add-role <id>` : ajouter un rôle selon la procédure (tests, puis non-fuite, puis code, puis i18n).
- `/add-mode <id>` : ajouter un mode de jeu (spécification, tests, plugin de mode, i18n).

## Façon de travailler

- Avance **jalon par jalon** en suivant `docs/10-roadmap.md`. Un jalon est terminé quand sa définition de « terminé » est remplie et que `pnpm check` passe.
- Pour toute fonctionnalité du moteur, écris **d'abord les tests** (scénarios de partie déterministes), puis le code.
- Fais des petits commits en Conventional Commits (voir `docs/09-conventions.md`).
- Si tu prends une décision structurante (nouvelle dépendance majeure, changement de protocole, changement de schéma de base de données), écris un ADR dans `docs/adr/`.
- Mets à jour la doc concernée **dans le même commit** que le code qui la rend obsolète.
- Ne modifie pas `design/tokens.css` sans mettre à jour `docs/06-design-system.md`.
