# 0009 — E-mails par Resend, inactifs sans domaine ; invités par Better Auth

- **Statut** : accepté
- **Date** : 2026-10-22

## Contexte
L'ADR 0003 laisse le fournisseur d'e-mails à choisir en M2 (D-18). Le coût visé est nul. Le 2026-10-22, l'envoi d'e-mails par Cloudflare (Email Sending) exige la formule Workers payante, et les offres gratuites de Resend (100 e-mails par jour, 3 000 par mois) ou de Brevo exigent un **domaine vérifié**. Or le domaine est reporté à M8 (D-17) : l'app vit sur `*.workers.dev`, qu'on ne peut pas vérifier. Par ailleurs, D-04 demande des comptes invités (pseudo seul) convertibles en compte.

## Décision
On retient **Resend**, appelé derrière une interface `EmailSender`. Tant qu'aucun domaine n'est vérifié, la vérification d'e-mail et la réinitialisation par e-mail sont **désactivées par configuration** : sans clé Resend, `EmailSender` n'est pas branché. Les invités passent par le plugin **`anonymous`** de Better Auth. À la conversion, le plugin crée un **nouvel** utilisateur et supprime l'invité : notre point d'accroche `onLinkAccount` transfère d'abord ses lignes D1 (profil, parties jouées ou menées) vers le nouveau compte.

## Alternatives considérées
- **Cloudflare Email Sending** : pas de dépendance ni de clé, mais il faut la formule payante.
- **Acheter un domaine dès M2** : la vérification d'e-mail fonctionnerait tout de suite, mais D-17 la reporte, et les invités suffisent aux parties entre amis.
- **Brevo** : formule gratuite plus large (300 par jour), mais même exigence de domaine, et une API moins simple depuis un Worker.
- **Invités maison** (identifiant en cookie) : une seconde forme de session à sécuriser, alors que Better Auth la fournit.

## Conséquences
- Sans domaine, un compte n'a pas d'e-mail vérifié, et un mot de passe oublié ne se réinitialise pas en libre-service. C'est accepté jusqu'à M8.
- M2 livre l'interface `EmailSender` et son client Resend, mais pas les gabarits : sans domaine, ils ne seraient ni utilisés ni testables de bout en bout. Activer les e-mails demandera de vérifier le domaine, de définir `RESEND_API_KEY` et `EMAIL_FROM` par `wrangler secret put`, puis d'écrire les gabarits (textes i18n côté serveur).
- Les identifiants d'invité servent de `PlayerId` comme ceux des comptes : le moteur ne fait pas la différence. Comme la conversion change l'identifiant, elle se fait en fin de partie (D-04), une fois le Durable Object figé.
- **Coût CPU** : le scrypt natif de Better Auth coûte environ 100 ms de CPU par hachage, alors que la formule gratuite accorde 10 ms par requête. Décision du 2026-10-22 : on garde ce réglage sûr et on vérifie l'inscription sur la preview. En cas d'erreur 1102, on passe à Workers Paid, sans changer de code.
