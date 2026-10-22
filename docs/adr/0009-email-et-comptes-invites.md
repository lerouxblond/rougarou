# 0009 — E-mails par Resend, inactifs sans domaine ; invités par Better Auth

- **Statut** : accepté
- **Date** : 2026-10-22

## Contexte
L'ADR 0003 laisse le fournisseur d'e-mails à choisir en M2 (D-18). Le coût visé est nul. Le 2026-10-22, l'envoi d'e-mails par Cloudflare (Email Sending) exige la formule Workers payante, et les offres gratuites de Resend (100 e-mails par jour, 3 000 par mois) ou de Brevo exigent un **domaine vérifié**. Or le domaine est reporté à M8 (D-17) : l'app vit sur `*.workers.dev`, qu'on ne peut pas vérifier. Par ailleurs, D-04 demande des comptes invités (pseudo seul) convertibles en compte.

## Décision
On retient **Resend**, appelé derrière une interface `EmailSender`. Tant qu'aucun domaine n'est vérifié, la vérification d'e-mail et la réinitialisation par e-mail sont **désactivées par configuration** : sans clé Resend, `EmailSender` n'est pas branché. Les invités passent par le plugin **`anonymous`** de Better Auth, dont la conversion en compte garde l'identifiant de l'utilisateur.

## Alternatives considérées
- **Cloudflare Email Sending** : pas de dépendance ni de clé, mais il faut la formule payante.
- **Acheter un domaine dès M2** : la vérification d'e-mail fonctionnerait tout de suite, mais D-17 la reporte, et les invités suffisent aux parties entre amis.
- **Brevo** : formule gratuite plus large (300 par jour), mais même exigence de domaine, et une API moins simple depuis un Worker.
- **Invités maison** (identifiant en cookie) : une seconde forme de session à sécuriser, alors que Better Auth la fournit.

## Conséquences
- Sans domaine, un compte n'a pas d'e-mail vérifié, et un mot de passe oublié ne se réinitialise pas en libre-service. C'est accepté jusqu'à M8.
- Activer les e-mails revient à vérifier le domaine dans Resend puis à définir `RESEND_API_KEY` et `EMAIL_FROM` par `wrangler secret put`, sans changer le code.
- Les identifiants d'invité servent de `PlayerId` comme ceux des comptes : le moteur ne fait pas la différence.
