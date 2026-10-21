# 0003 — Comptes : Better Auth sur Workers et D1

- **Statut** : accepté
- **Date** : 2026-10-21

## Contexte
Les comptes sont nécessaires (historique, presets). L'app tourne en web et en natif (Tauri). On ne veut pas de service d'auth payant au-delà d'un petit volume, ni de dépendance forte à un fournisseur.

## Décision
**Better Auth** monté dans le Worker Hono sur `/api/auth/*`, avec l'adaptateur Drizzle pour D1. La session passe par un cookie sur le web et par le plugin *bearer* pour Tauri. Le WebSocket est authentifié par un ticket à usage unique.

## Alternatives considérées
- **Clerk ou Auth0** : rapides à intégrer, mais payants à l'échelle, avec des données chez un tiers et une intégration Tauri moins directe.
- **Auth maison** : risqué pour la sécurité.
- **Supabase Auth** : implique d'ajouter Supabase à côté de Cloudflare, donc un deuxième fournisseur.

## Conséquences
- Il faut un fournisseur d'e-mail transactionnel (vérification, réinitialisation), à choisir au jalon M2 (ADR à venir).
- Les migrations du schéma d'auth s'intègrent au flux drizzle-kit.
