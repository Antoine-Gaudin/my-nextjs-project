# AUDIT COMPLET — Système Teams (Pages, Annonces, Abonnements)

> **Date** : Audit post-implémentation  
> **Périmètre** : `/teams`, `/team/[slug]`, tous les composants associés, schéma Strapi  
> **Objectif** : Propositions d'améliorations UI, UX, ergonomie, fonctionnalités, sécurité, performance  

---

## TABLE DES MATIÈRES

1. [Problèmes critiques à corriger](#1--problèmes-critiques-à-corriger)
2. [Sécurité](#2--sécurité)
3. [Performance](#3--performance)
4. [UI / Design](#4--ui--design)
5. [UX / Ergonomie](#5--ux--ergonomie)
6. [Fonctionnalités manquantes](#6--fonctionnalités-manquantes)
7. [Architecture & Code Quality](#7--architecture--code-quality)
8. [SEO & Accessibilité](#8--seo--accessibilité)
9. [Mobile](#9--mobile)
10. [Feuille de route proposée](#10--feuille-de-route-proposée)

---

## 1 — PROBLÈMES CRITIQUES À CORRIGER

### 1.1 Faille XSS via `dangerouslySetInnerHTML`
**Fichiers** : `page.js:253`, `TeamCustomSections.js:48`  
**Gravité** : 🔴 Critique  

Le `messageAccueil` et les sections custom de type `text` injectent du HTML brut sans aucune sanitization :
```
dangerouslySetInnerHTML={{ __html: team.messageAccueil }}
dangerouslySetInnerHTML={{ __html: textHtml }}
```
Un owner de team malveillant pourrait injecter du JavaScript dans le HTML (balises `<script>`, `onerror`, `onload`, etc.) qui s'exécuterait pour **tous les visiteurs** de la page team.

**Proposition** : Utiliser une librairie comme `DOMPurify` ou `sanitize-html` pour nettoyer le HTML avant injection. Filtrer les attributs d'événements (`on*`), les balises `<script>`, `<iframe>`, etc.

---

### 1.2 Race condition sur le bouton d'abonnement
**Fichier** : `TeamSubscribeButton.js:50-85`  
**Gravité** : 🟠 Élevée  

Le toggle d'abonnement fait **2 appels API séquentiels** :
1. `GET /teams/${id}?populate=abonnes` → récupère la liste complète
2. `PUT /teams/${id}` → envoie la nouvelle liste

Si deux utilisateurs s'abonnent en même temps, ou si l'utilisateur double-clique, on peut perdre des abonnés (le second PUT écrase le premier).

**Proposition** : 
- Côté frontend : Désactiver le bouton pendant le traitement (le `loading` state existe mais n'empêche pas le double-clic sur le bouton)
- Côté Strapi : Créer un endpoint custom `/api/teams/:id/subscribe` et `/api/teams/:id/unsubscribe` qui gère la logique atomiquement côté serveur, au lieu de manipuler la relation manyToMany côté client

---

### 1.3 TeamTheme : le CSS global déborde sur tout le site
**Fichier** : `TeamTheme.js:55-70`  
**Gravité** : 🟠 Élevée  

```css
a:hover { color: rgb(var(--team-primary-rgb)); }
```
Cette règle CSS globale affecte **tous les liens de la page**, y compris la navbar, le footer, et les liens des onglets. Un thème rouge sur une team ferait que survoler un lien dans la navbar le rendrait rouge au lieu de la couleur attendue.

**Proposition** : Scoper toutes les utility classes sous `.team-themed` uniquement :
```css
.team-themed a:hover { ... }
```
Et vérifier que les classes `.team-btn-primary`, `.team-gradient` etc. ne s'appliquent pas en dehors du conteneur thémé.

---

## 2 — SÉCURITÉ

### 2.1 Permissions Strapi non verrouillées
Les routes team-annonces et la relation `abonnes` utilisent les core factories par défaut. Si les permissions `Public` sont activées pour `update` sur `team`, **n'importe qui** pourrait modifier les annonces ou les abonnés sans être owner.

**Proposition** : 
- Créer des **policies Strapi** qui vérifient que seul le owner peut créer/supprimer des annonces pour SA team
- Restreindre le PUT sur team pour que seul le owner puisse modifier `abonnes`, `sectionsCustom`, etc.
- Implémenter un middleware de vérification d'ownership

### 2.2 Pas de validation côté Strapi pour les annonces
Le `team-annonce` n'a aucun lifecycle hook qui vérifie que l'auteur est bien un membre ou le owner de la team. Un utilisateur authentifié pourrait créer une annonce sur n'importe quelle team.

**Proposition** : Ajouter un `beforeCreate` lifecycle hook sur `team-annonce` vérifiant l'ownership/membership.

### 2.3 Données sensibles exposées via `populate=abonnes`
La requête `?populate=abonnes` renvoie potentiellement les emails des utilisateurs abonnés à tous les visiteurs.

**Proposition** : Utiliser les champs sélectifs dans Strapi (`fields[abonnes]=id,username` uniquement), ou créer un endpoint custom qui ne renvoie que le count au lieu de la liste complète.

---

## 3 — PERFORMANCE

### 3.1 Chargement excessif de données
**Fichier** : `page.js:33-34`

La requête initiale de page charge TOUT en une seule fois :
```
populate=logo&populate=banniere&populate=owner&populate=membres&populate=oeuvres.couverture&populate=oeuvres.genres
```
Si une team a 200 oeuvres, on charge 200 couvertures + genres au premier rendu, même si l'utilisateur est sur l'onglet "À propos".

**Proposition** :
- **Lazy-load par onglet** : Charger les oeuvres uniquement quand l'onglet "Œuvres" est activé
- Charger les données de base (team + banner + owner) au premier rendu
- Charger les members/oeuvres/annonces à la demande

### 3.2 Pas de pagination sur les annonces
**Fichier** : `TeamPageAnnonces.js:131`

Les annonces sont limitées à `pageSize=50` sans possibilité d'en charger plus. Si une team très active dépasse 50 annonces, les anciennes sont simplement invisibles.

**Proposition** : 
- Implémenter un "infinite scroll" ou un bouton "Charger plus" 
- Afficher les 10-15 plus récentes puis charger à la demande

### 3.3 Pas de pagination sur la page de listing `/teams`
**Fichier** : `teams/page.js`

`pagination[pageSize]=100` — au-delà de 100 teams, aucune n'est visible. Et charger 100 teams avec populate en une seule requête est lourd.

**Proposition** : 
- Pagination classique ou infinite scroll
- Charger par lots de 20-30 teams

### 3.4 Images non optimisées dans l'onglet Œuvres
**Fichier** : `page.js:316`

Les couvertures d'oeuvres utilisent `<img>` natif au lieu de `<Image>` de Next.js :
```html
<img src={oeuvre.couverture[0].url} ... />
```
Pas de lazy-loading, pas d'optimisation de format, pas de responsive sizing.

**Proposition** : Remplacer par `next/Image` avec des `sizes` responsive et le lazy-loading natif (déjà utilisé dans TeamBanner, donc la base est là).

### 3.5 Double appel API pour l'abonnement
**Fichier** : `TeamSubscribeButton.js`

Chaque toggle fait un GET puis un PUT. Le GET récupère la **liste complète des abonnés** juste pour ajouter/retirer un ID.

**Proposition** : Endpoint Strapi custom `/subscribe` et `/unsubscribe` en POST — un seul appel, pas de données superflues.

---

## 4 — UI / DESIGN

### 4.1 Positionnement du bouton d'abonnement
**Fichier** : `page.js:177-179`

Le bouton d'abonnement est en position `absolute` au-dessus de la bannière, ce qui :
- Peut chevaucher le bouton "Personnaliser" du owner sur certaines tailles d'écran
- Est difficile à repérer sur une bannière chargée visuellement
- N'est pas là où l'utilisateur s'attend à le trouver (généralement sous le nom de la team)

**Proposition** : Déplacer le bouton sous le banner, à côté du nom de la team, dans une barre d'actions dédiée :
```
[Logo/Avatar]  [Nom de la team]  [S'abonner ★ 42]  [Partager]
```
Ce pattern est utilisé par YouTube, Twitch, GitHub — l'utilisateur sait instinctivement où chercher.

### 4.2 Onglets peu lisibles sur mobile
**Fichier** : `page.js:189-230`

4 onglets en ligne (`À propos | Annonces | Œuvres (X) | Membres (X)`) — sur mobile, ça déborde ou s'empile mal. Pas de scroll horizontal indiqué.

**Proposition** : 
- Ajouter un `overflow-x-auto` avec `scrollbar-hide` pour un scroll horizontal fluide
- Ou utiliser des icônes + texte condensé sur mobile (📝 À propos | 📢 Annonces | 📚 Œuvres | 👥 Membres)

### 4.3 Statistiques sous-exploitées
**Fichier** : `page.js:261-279`

Les stats (Œuvres, Membres, Chapitres, Créée en) sont affichées en texte brut. Le compteur de chapitres est calculé côté client avec `oeuvres.reduce()` — il sera toujours à 0 car les chapitres ne sont pas populés dans la requête.

**Proposition** :
- **Corriger le bug** : La stat "Chapitres" affiche toujours 0 car `oeuvres.chapitres` n'est pas dans le `populate`
- Ajouter le nombre d'abonnés dans les stats
- Enrichir avec : dernière activité, dernière publication, nombre d'annonces
- Animer les chiffres avec un compteur progressif à l'apparition (effet "count up")

### 4.4 La page listing `/teams` manque de personnalité
**Fichier** : `teams/page.js`

Les TeamCard sont fonctionnelles mais basiques (fond gris, peu de relief). Elles ne se distinguent pas visuellement les unes des autres.

**Propositions** :
- Afficher la **couleur thème** de chaque team comme accent sur sa card (bordure ou dégradé subtil)
- Montrer un **badge d'activité** ("Active", "Nouvelle", "Populaire")
- Afficher le **nombre d'abonnés** à côté du nombre de membres
- Ajouter un **aperçu de la dernière annonce** ou de la dernière oeuvre publiée
- Variante "featured" pour les teams les plus actives en haut de page

### 4.5 Page 404 team monotone
La page d'erreur quand une team n'est pas trouvée est basique (emoji triste + lien retour). 

**Proposition** : Suggérer des teams populaires ou similaires au lieu d'un simple retour accueil.

### 4.6 Formulaire de création d'annonce minimaliste
**Fichier** : `TeamPageAnnonces.js:158-226`

Le formulaire est inline, directement dans le flux des annonces. Pas de séparation visuelle claire, pas de preview, le textarea est petit.

**Proposition** :
- Séparer visuellement le formulaire du feed (card distincte avec bordure accent)
- Ajouter un mode **preview** avant publication
- Permettre le **formatage basique** (gras, italique, liens) avec un éditeur simplifié type markdown-light
- Feedback de succès animé après publication au lieu d'un simple ajout dans la liste

---

## 5 — UX / ERGONOMIE

### 5.1 Le panneau de personnalisation demande du JSON brut
**Fichier** : `TeamCustomizationPanel.js:590-620`  
**Gravité** : 🔴 Bloquant pour l'adoption

L'onglet "Sections" demande au propriétaire de saisir du JSON dans un `<textarea>` pour configurer les sections custom :
```json
{"html":"<p>Mon texte</p>"}
```

Aucun utilisateur non-technique ne peut utiliser cette fonctionnalité. C'est la **fonctionnalité phare** du système de personnalisation — elle est inutilisable en l'état.

**Proposition** : Remplacer par un **éditeur visuel par type de section** :
- **Texte** : Intégrer TinyMCE (déjà dans `/public/tinymce/`) ou un éditeur Markdown
- **Galerie** : Interface d'upload drag-and-drop avec aperçu des images
- **CTA** : Champs formulaire : texte du bouton, URL, couleur
- **Stats** : Interface avec lignes éditables (label + valeur)
- **Timeline** : Glisser-déposer des événements avec date + description
- **Recrutement** : Formulaire avec postes (rôle, description, statut ouvert/fermé)

Chaque type génère automatiquement le JSON en arrière-plan — l'utilisateur ne voit jamais le JSON.

### 5.2 `alert()` et `confirm()` natifs du navigateur
**Fichiers** : `TeamCustomizationPanel.js` (alert), `TeamPageAnnonces.js` (confirm)

Les dialogues natifs du navigateur sont :
- Visuellement cassants (popup système hors du design)
- Non personnalisables
- Bloquants pour le thread principal
- Perçus comme des erreurs par les utilisateurs

**Proposition** : Utiliser le composant `ConfirmDialog.js` qui **existe déjà** dans le projet (`src/app/components/ConfirmDialog.js`) ! Et ajouter un système de **toast notifications** (type `react-hot-toast` ou custom) pour les confirmations de succès.

### 5.3 Pas de modification d'annonce
**Fichier** : `TeamPageAnnonces.js`

On peut créer et supprimer une annonce, mais pas la modifier. Si un owner fait une typo ou veut mettre à jour une annonce, il doit supprimer et recréer.

**Proposition** : Ajouter un bouton d'édition qui ré-ouvre le formulaire pré-rempli avec les données de l'annonce sélectionnée.

### 5.4 Pas de confirmation visuelle après sauvegarde
**Fichier** : `TeamCustomizationPanel.js`

Après avoir sauvegardé la personnalisation, le panneau se ferme silencieusement. L'utilisateur ne sait pas si ça a fonctionné ou non (sauf si rien n'a changé visuellement).

**Proposition** : Toast de succès animé + brève animation de "flash" sur les éléments modifiés de la page.

### 5.5 Upload de bannière non implémenté
**Fichier** : `TeamCustomizationPanel.js`

Un avertissement `⚠️ L'upload de bannière nécessite une intégration` est affiché. C'est un placeholder qui ne devrait pas être visible en production.

**Proposition** : Implémenter l'upload via l'API media de Strapi (`/api/upload`) ou au minimum masquer la section avec un message "Bientôt disponible" plus propre.

### 5.6 Navigation entre teams inexistante
Depuis une page team, le seul retour est "Retour aux teams". Pas de navigation vers la team suivante/précédente, pas de suggestions de teams similaires.

**Propositions** :
- Section "Teams similaires" en bas de page
- Breadcrumb : `Accueil > Teams > [Nom de la team]`
- Liens vers les teams des membres (si un membre appartient à d'autres teams)

### 5.7 Pas de feedback d'abonnement pour l'utilisateur
Quand un utilisateur s'abonne, il n'y a aucun moyen de retrouver ses abonnements. Nulle part dans son profil.

**Proposition** : Ajouter un onglet "Mes abonnements" dans la page `/profil`, listant toutes les teams suivies avec notification des nouvelles annonces.

---

## 6 — FONCTIONNALITÉS MANQUANTES

### 6.1 Système de notifications pour les abonnés
**Priorité** : 🟢 Haute — c'est le ROI principal de l'abonnement

S'abonner ne sert à rien actuellement. L'utilisateur ne reçoit aucune notification quand une team publie une annonce, un nouveau chapitre, ou une nouvelle oeuvre.

**Proposition** :
- **Notifications in-app** : Icône cloche dans la navbar avec badge de compteur, dropdown avec les dernières annonces des teams suivies
- **Email digest** (optionnel) : Résumé hebdomadaire des activités des teams suivies
- **Marquage lu/non-lu** sur les annonces

### 6.2 Page "Mes abonnements" / Feed personnalisé
Un flux agrégé de toutes les annonces de toutes les teams suivies, trié par date, accessible depuis le profil ou la navbar.

### 6.3 Recherche dans les annonces
**Fichier** : `TeamPageAnnonces.js`

Pas de recherche, pas de filtre par type. Si une team a 30 annonces, il faut scroller pour trouver celle qui nous intéresse.

**Proposition** : 
- Filtres par type (info / update / event / release) sous forme de chips cliquables
- Barre de recherche pour chercher dans le titre et le contenu

### 6.4 Page d'administration des abonnés
Le propriétaire ne peut pas voir qui sont ses abonnés. Aucune analytics.

**Proposition** : Dans le panel de personnalisation ou dans un dashboard team dédié :
- Liste des abonnés (username, date d'abonnement)
- Graphique d'évolution du nombre d'abonnés
- Stats : nouveaux abonnés cette semaine, taux de rétention

### 6.5 Partage social de la page team
Pas de bouton de partage pour que les visiteurs partagent la page team sur les réseaux sociaux ou copient le lien.

**Proposition** : Bouton "Partager" avec options : copier le lien, partager sur Twitter/Discord/Facebook.

### 6.6 Commentaires sur les annonces
Les annonces sont un flux unidirectionnel (team → visiteurs). Pas d'interaction possible.

**Proposition** (optionnelle, à évaluer) : 
- Réactions rapides type emoji (👍❤️🎉) sans nécessiter un système de commentaires complet
- Éventuellement commentaires simples avec modération owner

### 6.7 Historique d'activité de la team
Pas de timeline montrant : "La team a publié le chapitre X de Y", "Nouveau membre rejoint", "Nouvelle oeuvre ajoutée".

**Proposition** : Flux d'activité automatique (type GitHub activity feed) généré à partir des événements Strapi.

### 6.8 Mode brouillon pour les annonces
Pas de moyen de préparer une annonce en avance et de la publier plus tard.

**Proposition** : Ajouter un champ `isPublished` (ou utiliser le draftAndPublish de Strapi — actuellement désactivé) pour permettre la rédaction de brouillons.

### 6.9 Export / Import de configuration team
Un owner qui veut refaire sa page doit tout reconfigurer manuellement.

**Proposition** : Permettre l'export de la configuration (thème, sections, etc.) en JSON et l'import pour duplication ou backup.

---

## 7 — ARCHITECTURE & CODE QUALITY

### 7.1 Duplication de logique de fetch user
Les appels `Cookies.get("jwt")` + `fetch("/api/proxy/users/me")` sont répétés dans :
- `page.js` (team detail)
- `TeamSubscribeButton.js`
- `TeamPageAnnonces.js`
- Et d'autres composants du projet

**Proposition** : Créer un hook `useCurrentUser()` qui centralise la logique, avec cache React Context ou SWR/React Query.

### 7.2 Pas de gestion d'erreur user-facing
Plusieurs composants ont des `catch` qui font juste `console.error()`. L'utilisateur ne voit rien quand une requête échoue.

**Proposition** : Système de toast d'erreur centralisé. Chaque erreur API affiche un message compréhensible.

### 7.3 Les composants sont tous "use client"
La page team et TOUS ses composants sont client-only. Cela signifie :
- Pas de rendu serveur initial → écran blanc pendant le chargement
- Le layout.js fait un fetch serveur puis le page.js refait le même fetch côté client → **double requête**

**Proposition** : 
- Migrer le fetch principal dans un Server Component
- Passer les données en props aux composants interactifs (toujours client)
- Garder le layout.js pour le SEO et ajouter le fetch initial

### 7.4 Le panneau de personnalisation est un monolithe de 700 lignes
**Fichier** : `TeamCustomizationPanel.js`

700 lignes dans un seul composant avec 5 onglets, gestion d'état complexe, logique de prévisualisation, etc.

**Proposition** : Découper en sous-composants :
- `CustomizationThemeTab.js`
- `CustomizationBannerTab.js`
- `CustomizationSocialTab.js`
- `CustomizationContentTab.js`
- `CustomizationSectionsTab.js`

Chacun gère son propre état local. Le composant parent orchestre et fait le save.

### 7.5 Pas de tests pour les composants team
Aucun fichier de test dans `__tests__/` pour les composants team.

**Proposition** : Au minimum, tester :
- Le rendu conditionnel owner vs visiteur
- La logique d'abonnement (toggle, compteur)
- Le CRUD d'annonces
- Le parsing JSON des sections custom

---

## 8 — SEO & ACCESSIBILITÉ

### 8.1 La page team est invisible pour les crawlers
**Fichier** : `page.js` — `"use client"` en ligne 1

Le contenu de la page team est chargé entièrement côté client. Les crawlers (Google, etc.) voient un div vide. Le layout.js a bien les metadata et le JSON-LD, mais le contenu principal (description, oeuvres, membres) n'est pas dans le HTML initial.

**Proposition** : Server-side rendering du contenu principal, comme mentionné en 7.3.

### 8.2 Aucun attribut `aria-*` ou rôles ARIA
- Les onglets n'ont pas `role="tab"`, `role="tabpanel"`, `aria-selected`
- Les boutons d'action n'ont pas d'`aria-label` descriptif  
- Les SVG icônes n'ont pas de `aria-hidden="true"`
- Le formulaire d'annonce n'a pas de `<label>` associés aux inputs

**Proposition** : Audit d'accessibilité WCAG 2.1 minimal avec corrections.

### 8.3 Navigation clavier impossible
Les onglets ne gèrent pas les touches fléchées (standard ARIA pour les tabs). Le panneau de personnalisation ne peut pas être fermé avec Escape.

### 8.4 Contraste potentiellement insuffisant
Les textes `text-gray-400` sur fond `bg-gray-800/30` sont limites en ratio de contraste (WCAG AA exige 4.5:1 pour le texte normal).

---

## 9 — MOBILE

### 9.1 Les boutons absolute se chevauchent
**Fichier** : `page.js:150-179`

Sur mobile, le bouton "Retour aux teams" (haut gauche), "Personnaliser" (haut droite), et "S'abonner" (centre ou haut droite selon breakpoint) sont tous en position absolute. Sur un petit écran, ils peuvent se chevaucher ou masquer la bannière.

**Proposition** : Regrouper dans une barre d'action sticky sous la bannière.

### 9.2 Le panneau de personnalisation n'est pas responsive-friendly
**Fichier** : `TeamCustomizationPanel.js`

Le modal fait `max-w-2xl` mais les 5 onglets horizontaux et les color pickers ne sont pas pensés pour un écran de 375px.

**Proposition** :
- Onglets en accordéon ou en dropdown sur mobile
- Color pickers plus grands (zones de tap minimum 44x44px)
- Boutons de sauvegarde sticky en bas

### 9.3 Les cards de team dans la listing
Les cards fonctionnent bien en grille mais les liens sociaux sont petits et difficiles à taper sur mobile.

---

## 10 — FEUILLE DE ROUTE PROPOSÉE

### Phase 1 — Corrections critiques (priorité immédiate)
| # | Tâche | Impact |
|---|-------|--------|
| 1 | Sanitizer le HTML (`messageAccueil` + sections) avec DOMPurify | Sécurité |
| 2 | Fixer le CSS global de TeamTheme (scoper sous `.team-themed`) | Bug visuel |
| 3 | Corriger la stat "Chapitres" toujours à 0 (populate manquant) | Bug fonctionnel |
| 4 | Remplacer `alert()` et `confirm()` par ConfirmDialog + toasts | UX de base |
| 5 | Bloquer le double-clic sur S'abonner (disable pendant le loading) | Race condition |

### Phase 2 — UX essentielle (1-2 semaines)
| # | Tâche | Impact |
|---|-------|--------|
| 6 | Éditeur visuel pour les sections custom (remplacer JSON textarea) | Adoption critique |
| 7 | Implémenter l'upload de bannière | Complétion feature |
| 8 | Ajouter la modification d'annonces | Ergonomie owner |
| 9 | Lazy-load des onglets (oeuvres, annonces, membres) | Performance |
| 10 | Remplacer `<img>` par `next/Image` dans l'onglet Œuvres | Performance |

### Phase 3 — Fonctionnalités à valeur ajoutée (2-4 semaines)
| # | Tâche | Impact |
|---|-------|--------|
| 11 | Notifications in-app pour les abonnés | Engagement |
| 12 | Page "Mes abonnements" dans le profil | Retention |
| 13 | Filtres par type sur les annonces | Ergonomie |
| 14 | Endpoint Strapi custom pour subscribe/unsubscribe | Fiabilité |
| 15 | Policies Strapi d'ownership sur team-annonce | Sécurité |
| 16 | Pagination listing teams + annonces | Scalabilité |
| 17 | Dashboard abonnés pour le owner | Analytics |

### Phase 4 — Polish & Scale (4-6 semaines)
| # | Tâche | Impact |
|---|-------|--------|
| 18 | SSR partiel pour SEO du contenu team | SEO |
| 19 | Accessibilité ARIA sur onglets et formulaires | Inclusivité |
| 20 | Réactions emoji sur les annonces | Engagement |
| 21 | Flux d'activité automatique | Dynamisme |
| 22 | Bouton de partage social | Viralité |
| 23 | Hook `useCurrentUser()` centralisé | Maintenabilité |
| 24 | Découpage TeamCustomizationPanel en sous-composants | Code quality |
| 25 | Tests unitaires composants team | Fiabilité |

---

## RÉSUMÉ

**Bugs** : 3 critiques (XSS, CSS global, stat chapitres)  
**Sécurité** : 3 améliorations (sanitization, permissions Strapi, exposition données)  
**Performance** : 5 optimisations (lazy-load, pagination, images, double fetch, SSR)  
**UX** : 7 améliorations majeures (éditeur visuel, toasts, modification, upload, navigation, feedback, abonnements profil)  
**Fonctionnalités** : 9 nouvelles fonctionnalités proposées  
**Architecture** : 5 refactors recommandés  
**Accessibilité** : 4 points à traiter  
**Mobile** : 3 corrections  

**Total : 39 points d'amélioration identifiés, organisés en 4 phases de développement.**

Le chantier le plus impactant à court terme : corriger la faille XSS + remplacer le JSON textarea par un éditeur visuel — c'est la différence entre une feature utilisable et une feature technique réservée aux développeurs.
