# Uniion — réutiliser le style

Le brandkit est accessible à `/brandkit/`. Il utilise les mêmes feuilles CSS et les mêmes assets que la landing, sans framework ni compilation.

## Commencer une page

1. Copier `brandkit/page-template.html` à la racine de `site/` sous le nom souhaité.
2. Remplacer `href="uniion-ui.css"` par `href="brandkit/uniion-ui.css"`, `src="../uniion-logo.png"` par `src="uniion-logo.png"`, et le lien d’accueil `../` par `./`.
3. Adapter les titres, contenus et métadonnées. Supprimer `noindex` seulement lorsque la page est prête à être référencée.
4. Garder le dossier `assets/` et `brandkit/uniion-ui.css` : la feuille partagée importe les styles réels du site.
5. Tester clavier, téléphone (320 et 375 px), tablette et ordinateur. Respecter `prefers-reduced-motion`.

## Identité

- Orange : `#ff541b`, éclairage CTA : `#ff7749`, survol CTA : `#f24b14`.
- Texte : `#2c2c34`, texte secondaire : `#686871`, bordure : `#e9e9ed`, fond : blanc.
- Modules flottants du hero (Ordre du jour et Signature) : noir doux `#242328`, texte/encre `#f5f4f7`, détails `#b7b4bf`. Tokens `--hero-detail-surface`, `--hero-detail-ink`, `--hero-detail-muted`. La pill Signé conserve le fond sombre, avec une coche vert clair ; Effacer reste un texte sans conteneur ni effet au survol.
- Bleus des cartes : `#28365f`, `#354b7c`, `#202b55`. Fin du dégradé bleu : `#415a91`.
- Titres éditoriaux : Lora, graisse 400, interligne proche de 1.1–1.2. Mots accentués en italique orange avec parcimonie.
- Texte et interface : DM Sans. Polices locales et licences dans `assets/fonts/`.
- Logo fourni dans `uniion-logo.png`. Les symboles et icônes dérivés sont dans `assets/brand/`.
- Mot-logo seul : `assets/brand/uniion-wordmark-original.svg`, sans les cercles, avec les « ii » orange du logo original (version utilisée dans le hero). Variante monochrome : `assets/brand/uniion-wordmark-ink.svg`, couleur `#2c2c34`. Utiliser `.inline-wordmark` dans une phrase (hauteur `0.82em`, alignement `-0.075em`) avec `alt="Uniion"`. Ces SVG conservent les pixels de la source ; génération : `python scripts/generate-wordmark.py`.
- Les SVG de marque contiennent l’image matricielle d’origine ; ils ne sont pas des tracés vectoriels natifs. Ne pas remplacer les cercles par deux cercles géométriques simples.

## Composants partagés

- `.button.button-orange` : demande de démo, texte blanc, flèche seule, aucun mouvement au survol.
- `.button.button-pearl` : action secondaire sur fond clair.
- `.service-grid` et `.service-card` : trois cartes compactes, titres alignés en haut, icône décorative absolue.
- `.briefing-card` : fenêtre de contenu ; pour une app, conserver la hiérarchie panneau dans panneau.
- Icônes éditoriales orange dans `assets/brand/features/` : Communication, Projet, Défense et bouclier Sécurité. Trois formes Phosphor avec aplats et dégradés, 52 px desktop / 44 px mobile ; bouclier dédié 88 px / 54 px. Les petits contrôles de l’app gardent leurs icônes sobres. Les SVG sont autonomes ; pour plusieurs copies inline, donner des IDs uniques aux dégradés. Génération : `python scripts/build-feature-icons.py`.
- Réassurance sécurité : `.security-point` place une icône Lucide dans `.security-point-symbol`, à gauche des textes. Le symbole suit la hauteur du bloc (80 px maximum) ; une fenêtre de 58 px en montre la majeure partie, avec un fondu limité aux derniers 40 % et une opacité globale de 0,78. Les descriptions sont courtes, sur deux lignes sans texte tronqué. Une colonne sur téléphone, deux sur les écrans plus larges.
- `.uniion-title`, `.uniion-copy`, `.uniion-section`, `.uniion-panel` : structure légère des nouvelles pages.

## Mouvement et contenu

Pas d’effets d’apparition systématiques sur les titres ou les sections. La séquence du hero, le raccord vers l’app, les post-it et les détails de la FAQ sont des interactions spécifiques, pas des scripts à charger sur toutes les pages. Charger uniquement les scripts nécessaires au composant réellement présent.

Les dossiers, photos et signatures de l’aperçu sont démonstratifs. Ne pas transformer les logos de l’écosystème en témoignages clients, ni les badges d’hébergement en certification de la société. Les demandes de démo utilisent le formulaire Typeform existant.

## Défilement fluide (optionnel)

La landing utilise Lenis 1.3.27, fourni localement avec sa licence MIT. La rubrique « Défilement » du brandkit permet de tester les réglages et de copier le code d’installation. Les réglages de cette démonstration ne modifient pas ceux de la landing.

- Charger `assets/smooth-scroll.css`, puis les scripts différés `assets/vendor/lenis-1.3.27.min.js`, `assets/scroll-config.js` et `assets/smooth-scroll.js`, dans cet ordre.
- Les valeurs partagées sont dans `assets/scroll-config.js` : `lerp: 0.12` (réactivité), `anchorDuration: 1.15` et `topDuration: 1.8` (secondes).
- Placer `id="top"` sur le body et `href="#top"` sur le logo. Les autres ancres conservent leur URL et leur `scroll-margin-top` CSS.
- Les déplacements vers une ancre utilisent easeInOutCubic ; la molette utilise l’interpolation Lenis. Ne pas doubler l’effet avec un autre moteur ou une règle CSS smooth sur `html.lenis`.
- Le tactile reste natif (`syncTouch: false`). Le clavier et le mouvement réduit naviguent immédiatement. Les zones défilantes imbriquées restent natives.
- Le contrôleur expose `window.uniionScroll.configure({ ... })` pour les démonstrations. Pour une page publiée, régler le fichier de configuration plutôt que conserver un panneau de réglages.
- Les anciennes pages ne chargent pas Lenis automatiquement. L’intégration est volontaire et autonome, sans dépendance au hero ou à la top bar.

## Fichiers utiles

### Cercles du footer · ASCII Wake

`assets/footer-ascii.js` adapte le composant AsciiWake de Bencho fourni par l’utilisateur. Le masque est calculé depuis `assets/images/uniion-footer-mark.svg` : la forme des cercles existants reste la source, pas un dessin de cercles génériques.

- Conteneur : `.footer-art[data-ascii-wake]`, avec son image SVG de repli. Styles dans `assets/home-chrome.css`.
- Réglages via attributs : `data-ascii-size="10"`, `data-ascii-reach="60"`, `data-ascii-trail="1.2"`, `data-ascii-pull="40"`. Rampe Classic : ` .:-=+*#%@`.
- Au repos : points. Au survol : sillage de caractères, légère attraction vers la souris ; au clic : onde de 2,2 s. Refroidissement exponentiel, durée de sillage 1,2 s.
- Aucun calcul continu au repos, hors écran ou dans un onglet masqué. Résolution plafonnée à 2×. Les cellules hors du logo ne sont pas animées.
- Sur téléphone : le défilement vertical et le pincement restent natifs ; seul un tap déclenche une onde. Pas de capture du doigt ni de `preventDefault`.
- Mouvement réduit ou JavaScript absent : SVG statique original. L’ornement reste décoratif (`aria-hidden`), sans nouvel arrêt clavier.

- France dans la réassurance hébergement : `assets/brand/features/france.svg`, adapté de [Mapsicon par djaiss](https://github.com/djaiss/mapsicon). Original et notice conservés dans `assets/vendor/mapsicon/`. Usage autorisé avec mention de l’auteur, revente des icônes interdite selon sa notice.

- `assets/home.css` : polices, tokens, boutons.
- `assets/home-tour.css` : présentation produit et cartes de services.
- `assets/hero-screen.css` : aperçu produit, logos et post-it.
- `assets/security.css`, `assets/sunset.css`, `assets/home-chrome.css` : fonds, sécurité et navigation/footer.
- `assets/brand/uniion-icons.zip` : pack de logos et icônes.
- `brand-icons.html` : galerie complète des variantes.

Le ZIP de démarrage contient le site statique, ce guide, le modèle et les ressources locales. Il ne contient ni dépôt Git, ni archives de travail, ni configuration locale.
