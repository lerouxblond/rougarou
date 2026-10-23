# 07 — Assets : illustrations, icônes, sons

## Propriété intellectuelle (à lire en premier)

- « Les Loups-garous de Thiercelieux » est une marque déposée, et les illustrations de ses cartes sont protégées. **On n'utilise ni le nom, ni les illustrations, ni les textes de cartes officiels**, même « en attendant ».
- Les mécaniques de jeu ne sont pas protégées en tant que telles. Les noms génériques de rôles (Voyante, Sorcière…) sont utilisables, mais leurs **descriptions sont rédigées pour ce projet**.
- Tout asset ajouté au dépôt doit avoir une ligne dans `apps/web/public/assets/CREDITS.md` (source, auteur, licence). Licences acceptées : production originale du projet, CC0, CC-BY (avec attribution affichée dans « À propos »), OFL pour les polices.
- Les images générées par IA sont acceptées si l'outil utilisé permet un usage commercial et si le prompt ne cite aucune œuvre ni aucun artiste vivant. Le prompt et l'outil sont notés dans `CREDITS.md`.

## Direction des icônes et illustrations : pixel art léger et animé

Validé le 21/10/2026 : les **icônes de rôles** (et les petits personnages de l'interface) sont en **pixel art léger animé**.

| Spéc. | Valeur |
|---|---|
| Grille | **32×32** pour tous les personnages (bustes ombrés sur 3 tons, contour automatique de 1 px), affichés à l'échelle entière : ×2 dans les listes, ×4 pour les actions, ×6 sur la carte de rôle, avec `image-rendering: pixelated`. Le 16×16 sert seulement aux micro-icônes d'état |
| Palette | 6 à 8 couleurs par sprite, prises dans les tokens (encre, lune, or, sang, rose, violet) plus 2 tons de fourrure ou de peau ; contour sombre de 1 px |
| Animation | **4 poses** combinées en une planche de **12 images** (le clignement ou le geste rare n'apparaît qu'une fois), lue en `steps(12)` sur 1,8 à 3,6 s. Animations de référence : brume et étincelles (Voyante), oreille, clignement et gueule (Loup), bulles (Sorcière), flamme et halo (Villageois), chauve-souris (Vampire) |
| Format | Planche de sprites PNG (une ligne par rôle, une colonne par image) + JSON des images ; ou SVG en `<rect>` pour les icônes 16×16 |
| Mouvement réduit | Avec `prefers-reduced-motion`, on affiche l'image 1 sans animation |
| Outil conseillé | Aseprite ou Piskel (export planche + JSON) |

Les **illustrations de cartes** (768×1024) restent possibles plus tard. En V1, la carte de rôle utilise le sprite 32×32 agrandi sur un fond de carte décoré, ce qui suffit à la livrer sans illustrateur.

### Sprites de travail fournis

`design/sprites/` contient des planches de 12 images (32×32) générées pour la Voyante, le Loup-garou, la Sorcière, le Villageois et le Vampire, ainsi que le script `generate_work_sprites.py` qui les produit (formes, ombrage sur 3 tons, contour automatique). Ce sont des **sprites de travail** : ils servent pendant tout le développement et seront remplacés par des sprites dessinés à la main dans Aseprite, avec la même grammaire.

## Inventaire à produire

### Illustrations de rôles (prioritaire)

| Spéc. | Valeur |
|---|---|
| Format | WebP (et AVIF en option), avec une source vectorielle ou PSD conservée dans `design/sources/` |
| Taille | 768×1024 (ratio 3:4, celui des cartes), plus une vignette 192×256 |
| Style | Gravure sur bois ou linogravure, 2 ou 3 tons. Fond nuit `--ink-950` et une couleur d'accent selon le camp (or, sang, violet). Personnage en buste, de trois quarts, avec un attribut identifiable (lanterne, fiole, arc, flèche, boule de cristal…) |
| Cohérence | Même cadrage, même source de lumière (la lune, en haut à gauche), même épaisseur de trait |
| Nommage | `role-<id>.webp`, `role-<id>@thumb.webp` (id de `docs/02`) |

Il faut une illustration par rôle (27 au total, Vampire originel compris), une illustration par **mode de jeu** (`mode-<id>.webp`, pour les cartes de choix de mode et la révélation de fin « C'était une Nuit blanche ») et une pour le **dos de carte** (`card-back.webp` : sceau de cire avec une tête de loup stylisée et le motif lunaire).

**Fallback en attendant les illustrations** : on génère des cartes en SVG à partir de l'icône du rôle, centrée sur un fond texturé, avec le nom en Cormorant Garamond (la police d'affichage de `design/tokens.css`). Le jalon M3 peut être livré avec ces fallbacks.

### Icônes maison (SVG, grille 24 px, trait 1,75 px)

- **Une icône par rôle** (même liste que les illustrations) : `icon-role-<id>.svg`.
- **Camps** : `icon-team-village` (maison à toit pointu), `icon-team-wolves` (empreinte de loup), `icon-team-solo` (étoile à 5 branches), `icon-team-vampires` (crocs ou goutte inversée).
- **États** : `icon-dead` (croix ou pierre tombale), `icon-mayor` (écharpe tricolore stylisée ou médaille), `icon-vampire-converted` (morsure), `icon-lovers` (cœur percé), `icon-charmed` (note de musique), `icon-infected` (goutte), `icon-disconnected`, `icon-muted`.
- **Phases** : `icon-moon`, `icon-sun`, `icon-dawn`, `icon-vote` (main levée).
- Les sources SVG vivent dans `packages/ui/icons`. Les composants React `RoleIcon` et `TeamIcon` en recopient les dessins, sans `svgr` (aucune dépendance de plus), et un test vérifie qu'ils restent identiques aux fichiers. La carte de repli `RoleCardArt` les assemble (M3).

### Arrière-plans et textures

- `bg-night-forest` : silhouette de forêt en bas, ciel étoilé et lune. Fonctionne en couches pour un léger effet de parallaxe.
- `bg-day-village` : silhouette de village sur parchemin.
- `texture-parchment`, `texture-noise` : tuiles de 512 px à superposer avec une faible opacité.
- `fog-layer` : PNG transparent animé en CSS pour l'écran de nuit uniforme.
- Logo : mot-symbole « Rougarou » en Cormorant Garamond plus un monogramme (loup hurlant dans un croissant de lune). Exports : favicon, icônes PWA (192, 512, maskable), icônes Tauri (générées par `tauri icon` depuis un PNG 1024).

### Sons

Qui entend quoi, et quand : matrice de `docs/12-deroulement-partie.md` §5.

**En M4** (P31), les sons publics sont **synthétisés** dans le navigateur par la Web Audio API (création originale du projet : aucun fichier, aucune licence) et ne sont joués que sur l'appareil du meneur, avec une option « Sons » désactivable. Les fichiers du tableau ci-dessous, les sons des joueurs, leurs profils audio et la synchronisation par le serveur arrivent en **M4b**.

| Événement | Fichier | Durée |
|---|---|---|
| La nuit tombe | `sfx-nightfall.ogg` | 2–3 s (hurlement lointain et vent) |
| Le jour se lève | `sfx-daybreak.ogg` | 2 s (coq lointain, cloches) |
| C'est ton tour | `sfx-your-turn.ogg` | moins de 0,5 s (clochette discrète) |
| Mort, exécution | `sfx-death.ogg` | 1 s (glas) |
| Investiture du Maire | `sfx-mayor.ogg` | 1,5 s (fanfare courte) |
| Vote ouvert / clos | `sfx-vote-open.ogg`, `sfx-vote-close.ogg` | moins de 1 s (cloche, gong) |
| 10 dernières secondes | `sfx-tick.ogg` | boucle de 1 s |
| Arrivée dans le salon | `sfx-join.ogg` | moins de 0,5 s |
| Fin de partie | `sfx-victory-village.ogg`, `sfx-victory-wolves.ogg` | 3 s |
| Ambiance de nuit | `amb-night-loop.ogg` | boucle de 60 s, sur l'appareil du meneur seulement |

Sources : CC0 (par exemple freesound, filtré sur CC0) ou création originale. Formats OGG et M4A (fallback pour Safari). Volume normalisé à −16 LUFS.

## Emplacement dans le dépôt

```
apps/web/public/assets/
├─ roles/        role-*.webp, role-*@thumb.webp, card-back.webp
├─ bg/           bg-*, texture-*, fog-layer.png
├─ sfx/          *.ogg, *.m4a
├─ brand/        logo.svg, monogram.svg, pwa-*.png
└─ CREDITS.md
packages/ui/icons/   *.svg (sources) → composants générés
design/sources/      fichiers sources lourds (gérés avec Git LFS)
```

Budget : l'ensemble des assets préchargés au premier lancement (dos de carte, icônes, polices, fond de nuit) ne dépasse pas **600 ko**. Les illustrations de rôles se chargent à la demande, puis sont mises en cache par le service worker.
