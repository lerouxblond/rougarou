# 06 — Design system « Lanterne »

> Direction validée le 21/10/2026 (D-24) : **Lanterne**, nocturne cinématique, sobre et vivante, avec des personnages en **pixel art animé**. Elle remplace « Clair de lune ». Les maquettes `J..`/`M..` antérieures gardent l'ancien habillage, mais leur structure reste valable. Les écrans de référence sont sur la page « Directions premium » du canevas.

## Maquettes de référence

Le canevas **« Rougarou — Conception de l'app »** (lien dans le `README.md`) contient les tokens, les composants, le parcours, le déroulé meneur/joueur (minuteurs et sons), 29 écrans joueur (mobile) et 13 écrans meneur (dont un sur téléphone). Ce sont des intentions de design, pas des contrats pixel près : en cas d'écart, **cette doc et `design/tokens.css` font foi**.

## Direction artistique

**Lanterne : la nuit comme un plan de cinéma.** De grands aplats sombres, une seule lumière chaude (l'or de lanterne), de la brume et une lune en couches qui bougent lentement, une typographie grande et aérée, et très peu d'éléments par écran. Les personnages en pixel art sont la seule source de détail : tout le reste est calme. Le jour est une brume matinale pâle, écrite à l'encre.

Principes : un écran = une intention ; une seule action principale (bouton pilule doré) ; le mouvement porte l'information (fondu de phase, carte qui se lève, barres de vote qui glissent), jamais la décoration seule.

**Ancienne direction (référence) : gothique sombre et lisible.** On évoque une forêt de nuit, la lune, le parchemin, la cire et le sang, sans jamais sacrifier la lisibilité d'une app jouée sur téléphone, parfois dans une pièce peu éclairée.

**L'interface change avec la phase de jeu.** C'est l'idée maîtresse du design.
- **Nuit** : bleu nuit profond, lumière lunaire froide, contrastes doux. Rien de clair ne doit attirer l'œil dans une pièce sombre.
- **Jour** : parchemin chaud, encre sépia. Le changement de phase se voit à l'échelle de toute la table.
- Le thème se pilote avec `data-phase="night" | "day"` sur `<html>`. Hors partie (accueil, profil…), l'app reste en thème **nuit**.

Mots-clés : *lanterne, sceau de cire, gravure sur bois, brume, lune, griffures*.
À éviter : le gore, le kitsch Halloween (citrouilles, toiles d'araignée), le néon, les dégradés arc-en-ciel.

## Couleurs

La source de vérité est `design/tokens.css`. Les composants n'utilisent **que** les tokens sémantiques (`--color-bg`, `--color-text`…), jamais les tokens primitifs.

| Token sémantique | Nuit | Jour | Usage |
|---|---|---|---|
| `--color-bg` | `#070A12` encre nocturne | `#E6E0D4` brume matinale | Fond de page |
| `--color-surface` | `#0E1320` | `#F5F1E8` | Cartes, panneaux |
| `--color-surface-raised` | `#161D2E` | `#FFFCF5` | Modales, menus |
| `--color-border` | `#1F2738` | `#D2CABA` | Séparateurs |
| `--color-text` | `#ECE6D6` clair de lune | `#1A1712` encre | Texte principal |
| `--color-text-muted` | `#9EA6B8` | `#5E564A` | Texte secondaire |
| `--color-accent` | `#F2C14E` or de lanterne | `#7A4B0E` | Actions principales |
| `--color-danger` | `#E86A71` | `#9E1F28` | Mort, suppression |
| `--team-village` | `#F2C14E` | `#7A4B0E` | Camp Village |
| `--team-wolves` | `#E86A71` | `#9E1F28` | Camp Loups |
| `--team-vampires` | `#D77BB6` | `#8E2A66` | Camp Vampires (mode Vampire) |
| `--team-solo` | `#A98BE0` | `#5E3F9A` | Rôles solo |
| `--color-focus` | `#7FB8FF` | `#1F5FBF` | Anneau de focus |

- Contraste : chaque paire texte/fond doit atteindre **4,5:1** (3:1 pour le texte de 24 px et plus et les composants d'interface). Un test automatique (`packages/ui/test/contrast.test.ts`) le vérifie.
- On ne code jamais une information par la couleur seule : un camp a toujours une icône **et** un libellé.

## Typographie

Toutes les polices sont sous licence OFL et auto-hébergées via `@fontsource`.

| Rôle | Police | Usage |
|---|---|---|
| Display | **Cormorant Garamond** (500–700) | Titres, noms de rôles, annonces (« La nuit tombe »), grands corps de 44 à 58 px |
| Texte | **DM Sans** (400, 500, 700) | Tout le reste |
| Libellés pixel | **Pixelify Sans** (400, 600) | Petits libellés en capitales espacées, code de partie, minuteurs, compteurs : ils font le lien avec les sprites |

L'échelle de tailles est en `rem`, mobile d'abord : 12 / 14 / **16 (base)** / 18 / 22 / 28 / 36 / 48. Le display n'est jamais en dessous de 18 px. La hauteur de ligne est de 1,5 pour le texte et 1,15 pour le display.

## Espacements, rayons, ombres

- On utilise une grille de 4 px : `--space-1` (4 px) jusqu'à `--space-12` (48 px).
- Rayons : `--radius-sm` 6 px, `--radius-md` 12 px, `--radius-card` 16 px (cartes de rôle), `--radius-full`.
- Ombres de nuit : une lueur (`--glow-accent`) plutôt qu'une ombre portée. Ombres de jour : ombres douces brun chaud.
- Les zones tactiles font **au moins 44×44 px**.

## Mouvement

### Les six moments vivants (planche « Mouvement » du canevas)

| # | Moment | Animation | Durée | Son |
|---|---|---|---|---|
| 1 | La nuit tombe | Fondu de tout l'écran + lune qui monte | 1 200 ms | public : hurlement |
| 2 | La carte se lève | Montée + zoom 0,92 → 1, puis halo de la couleur du camp | 600 ms | aucun (privé) |
| 3 | Une mort à l'aube | Sprite figé et décoloré, puis le nom se resserre | 900 ms | public : glas, synchronisé |
| 4 | Les voix arrivent | Barre qui glisse, décalage de 90 ms ; réordonnancement | 400 ms / 300 ms | public : gong à la clôture |
| 5 | C'est ton tour | Anneau doré qui pulse sur l'action principale | 1 600 ms en boucle | privé seulement (distanciel, écouteurs) |
| 6 | Toutes les cartes | Révélation en cascade | 80 ms entre deux cartes | public : thème du vainqueur |

Ambiance permanente (nuit) : étoiles qui scintillent, deux couches de brume qui dérivent (16 et 22 s), sprites en boucle. De jour, rien ne bouge en permanence.

### Tokens de mouvement

| Token | Valeur | Usage |
|---|---|---|
| `--motion-fast` | 120 ms | Survols, appuis |
| `--motion-base` | 220 ms | Panneaux, toasts |
| `--motion-slow` | 600 ms | Retournement de carte |
| `--motion-phase` | 1 200 ms | Fondu nuit ↔ jour |
| `--ease-out` | `cubic-bezier(.2,.8,.2,1)` | Défaut |

Avec `prefers-reduced-motion: reduce`, toutes les durées passent à 0 ou à un fondu de 120 ms maximum.

**Retours haptiques** (si l'appareil les prend en charge et que l'option est active) : impulsion courte quand c'est son tour, double impulsion quand on meurt, impulsion longue en fin de partie.

## Composants (`packages/ui`)

| Composant | Notes |
|---|---|
| `Button` | Variantes `primary`, `secondary`, `ghost`, `danger`. Tailles `md` et `lg` (lg par défaut sur mobile pour les actions de jeu) |
| `IconButton` | `aria-label` obligatoire (vérifié par le typage) |
| `RoleCard` | Face cachée ou visible, geste « maintenir pour révéler », masquage automatique, illustration, nom, badge de camp |
| `PlayerChip` | Avatar, pseudo, état (vivant, mort, déconnecté), badges (Maire, amoureux, charmé, sous la vue du meneur) |
| `PlayerGrid` / `PlayerCircle` | Disposition en cercle qui suit l'ordre des places. Elle passe en grille sur un petit écran. Sert à sélectionner une cible |
| `TargetPicker` | Sélection d'une ou plusieurs cibles avec contraintes, puis confirmation |
| `VoteBoard` | Votes en direct (flèches ou badges), poids des votes, résultat |
| `ModeCard` | Carte de choix de mode : illustration, nom, joueurs conseillés, badge « Déguisé » visible du meneur seulement |
| `MayorBadge` | Écharpe de Maire, posée sur un `PlayerChip`, avec une animation d'investiture |
| `CharacterSheet` | Formulaire de fiche de personnage (role play) : portrait, nom, métier, trait, « Inspire-moi » |
| `PresentationCard` | Grande fiche du joueur qui a la parole au jour 1, avec l'ordre de passage |
| `PhaseBanner` | Nom de la phase, numéro du jour ou de la nuit, minuteur |
| `Timer` | Anneau ou barre, avec `aria-live` aux paliers 30 s, 10 s, 0 s |
| `NarratorScript` | Grand texte à lire avec les étapes précédentes et suivantes |
| `NightStepList` | Ordre de nuit avec l'état de chaque étape (à venir, en cours, faite, passée) |
| `ChatPanel` | Onglets par canal, messages, champ de saisie, état coupé |
| `Toast`, `Dialog`, `Sheet` (panneau bas sur mobile), `Tabs`, `Switch`, `Stepper` (+/−), `Badge`, `Avatar`, `EmptyState`, `Skeleton` | Basés sur Radix |

Chaque composant est livré avec son histoire dans **Ladle** (Storybook léger), en thèmes nuit **et** jour, et passe un test d'accessibilité axe.

## Plateformes et tailles d'écran

Les deux rôles (joueur et meneur) doivent être **jouables sur téléphone, tablette et ordinateur** :

| Taille | Largeur | Joueur | Meneur |
|---|---|---|---|
| Téléphone | < 640 px | Une colonne, barre d'outils en bas | **Onglets** (Script · Étapes · Joueurs · Journal) et action principale fixée en bas (M13 et suivants) |
| Tablette | 640–1023 px | Deux colonnes : jeu + panneau (joueurs ou chat) | Deux colonnes : script et actions + joueurs |
| Ordinateur | ≥ 1024 px | Trois zones : cercle des joueurs au centre, carte et infos à gauche, chat ou journal à droite ; raccourcis clavier | Trois colonnes (M02, M03) |

## Mises en page clés

- **Joueur (mobile, portrait)** : `PhaseBanner` en haut → zone principale (action, vote ou attente) → barre basse avec « Ma carte », « Infos », « Chat » et « Joueurs ».
- **Meneur (tablette ou desktop, paysage)** : trois colonnes : `NightStepList` ou phases | `NarratorScript` et actions | `PlayerCircle` avec tous les rôles visibles et le journal. Sur mobile, les colonnes deviennent des onglets.
- **Écran de nuit uniforme** (US-40) : fond animé de brume et de lune, identique pour tous les joueurs qui ne sont pas en train d'agir.

## Iconographie

- **Rôles et personnages** : pixel art léger animé (`docs/07` §Direction). Composant `PixelSprite` (grille, palette, images, vitesse), qui respecte `prefers-reduced-motion`.

### Icônes d'interface

- On construit un jeu d'icônes **maison**, au trait, sur une grille de 24 px avec un trait de 1,75 px et des terminaisons arrondies, dans un style gravure simplifié.
- Pour les icônes génériques (réglages, chat, retour…), on utilise **Lucide**, avec le même trait de 1,75 px pour rester cohérent.
