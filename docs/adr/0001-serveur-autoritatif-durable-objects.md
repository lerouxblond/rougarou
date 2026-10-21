# 0001 — Serveur qui fait autorité : un Durable Object par partie

- **Statut** : accepté
- **Date** : 2026-10-21

## Contexte
Dans une partie multijoueur temps réel, des informations restent cachées (rôles, cibles de nuit). On vise un coût d'hébergement nul pour un usage entre amis. L'app doit fonctionner sans pause liée à l'inactivité, puisqu'on joue de façon occasionnelle.

## Décision
Chaque partie est un **Durable Object Cloudflare** (backend SQLite, API WebSocket Hibernation), qui détient l'état et exécute le moteur. Les clients ne reçoivent que des vues projetées.

## Alternatives considérées
- **Supabase Realtime** : très complet, mais un projet en formule gratuite est mis en pause après 7 jours d'inactivité. De plus, une logique qui fait autorité y demande des Edge Functions et du verrouillage côté Postgres.
- **Serveur Node + Socket.io sur un VPS** : il faut maintenir un serveur, et l'hébergement est payant ou peu fiable s'il est gratuit.
- **Pair à pair (WebRTC) avec le meneur comme hôte** : pas de serveur, mais l'appareil du meneur doit rester allumé et connecté, la reconnexion est fragile et les informations cachées transitent par un client.

## Conséquences
- Le code du serveur est lié au runtime Workers, ce qu'on atténue grâce à un moteur pur et portable.
- Les quotas de la formule gratuite sont à surveiller (voir `docs/08`).
- Les tests du DO se font avec `@cloudflare/vitest-pool-workers`.
