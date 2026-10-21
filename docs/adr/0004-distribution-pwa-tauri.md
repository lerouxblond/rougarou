# 0004 — Distribution : PWA d'abord, Tauri 2 pour les binaires

- **Statut** : accepté
- **Date** : 2026-10-21

## Contexte
On veut une app téléchargeable sur mobile et desktop via les Releases GitHub, et aussi accessible depuis un simple lien.

## Décision
Un seul build React. Il est servi comme **PWA** par le Worker, et **embarqué dans Tauri 2** pour Windows, macOS, Linux, Android et iOS. Les binaires sont produits par GitHub Actions sur un tag. Sur iOS, la voie principale reste la PWA. Le build natif iOS passe par TestFlight, et seulement si un compte Apple Developer existe.

## Alternatives considérées
- **Capacitor (mobile) + Electron (desktop)** : deux outils, et des binaires desktop lourds (plus de 100 Mo contre environ 10 Mo).
- **React Native / Expo** : il faudrait un second code d'UI pour le web, ou react-native-web, avec des compromis.
- **PWA seule** : ne répond pas à l'exigence de binaires téléchargeables.

## Conséquences
- Il faut gérer la signature pour chaque plateforme (voir `docs/08`).
- Le code web doit rester compatible avec les WebViews (WKWebView, Android WebView, WebView2) : on teste sur WebKit en e2e.
