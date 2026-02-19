# Configuration Strapi pour les pages Teams personnalisables

## Vue d'ensemble

Ce document décrit les champs nécessaires dans le schema Strapi de la collection **Teams** pour supporter les fonctionnalités de personnalisation des pages teams.

## Champs existants (à conserver)

- `nom` (String) - Nom de la team
- `slug` (String, unique) - Identifiant URL de la team
- `description` (Text) - Description courte de la team
- `isPublic` (Boolean) - Visibilité publique de la team
- `logo` (Media, Single) - Logo de la team
- `discord` (String) - Lien Discord
- `website` (String) - Site web de la team
- `owner` (Relation: User) - Propriétaire de la team
- `membres` (Relation: Users, Many) - Membres de la team
- `oeuvres` (Relation: Oeuvres, Many) - Œuvres de la team

## Nouveaux champs à ajouter

### 1. Personnalisation du thème

#### `themeCouleurPrimaire` (String)
- **Type**: String (Text)
- **Description**: Couleur primaire du thème en format hexadécimal
- **Format**: `#RRGGBB` (ex: `#6366f1`)
- **Valeur par défaut**: `#6366f1` (indigo)
- **Utilisation**: Utilisée pour les boutons principaux, liens importants, bordures actives

#### `themeCouleurSecondaire` (String)
- **Type**: String (Text)
- **Description**: Couleur secondaire du thème en format hexadécimal
- **Format**: `#RRGGBB` (ex: `#8b5cf6`)
- **Valeur par défaut**: `#8b5cf6` (violet)
- **Utilisation**: Utilisée pour les dégradés, éléments secondaires

#### `themeCouleurAccent` (String)
- **Type**: String (Text)
- **Description**: Couleur d'accent du thème en format hexadécimal
- **Format**: `#RRGGBB` (ex: `#ec4899`)
- **Valeur par défaut**: `#ec4899` (rose)
- **Utilisation**: Utilisée pour les badges, éléments spéciaux, highlights

#### `themePolice` (String, optionnel)
- **Type**: String (Text)
- **Description**: Nom d'une police personnalisée (Google Fonts ou système)
- **Format**: Nom de la police (ex: `"Montserrat"`, `"Inter"`)
- **Exemple**: `Poppins`, `Roboto`, `Open Sans`
- **Utilisation**: Police principale du contenu de la page team

---

### 2. Personnalisation de la bannière

#### `banniere` (Media, Single)
- **Type**: Media
- **Description**: Image de bannière/hero en haut de page
- **Formats recommandés**: JPG, PNG, WebP
- **Résolution recommandée**: 1920x600px minimum
- **Ratio recommandé**: 16:5 ou 21:9
- **Utilisation**: Affichée en hero avec gradient overlay

#### `bannierePosition` (Enumeration)
- **Type**: Enumeration (String)
- **Valeurs possibles**:
  - `top` - Affiche le haut de l'image
  - `center` - Affiche le centre de l'image (par défaut)
  - `bottom` - Affiche le bas de l'image
- **Valeur par défaut**: `center`
- **Utilisation**: Contrôle `object-position` CSS de l'image de bannière

---

### 3. Réseaux sociaux additionnels

#### `twitter` (String)
- **Type**: String (Text)
- **Description**: URL du profil Twitter/X
- **Format**: URL complète (ex: `https://twitter.com/username`)
- **Validation**: Doit commencer par `https://`

#### `youtube` (String)
- **Type**: String (Text)
- **Description**: URL de la chaîne YouTube
- **Format**: URL complète (ex: `https://youtube.com/@channel`)
- **Validation**: Doit commencer par `https://`

#### `instagram` (String)
- **Type**: String (Text)
- **Description**: URL du profil Instagram
- **Format**: URL complète (ex: `https://instagram.com/username`)
- **Validation**: Doit commencer par `https://`

#### `tiktok` (String)
- **Type**: String (Text)
- **Description**: URL du profil TikTok
- **Format**: URL complète (ex: `https://tiktok.com/@username`)
- **Validation**: Doit commencer par `https://`

---

### 4. Contenu personnalisé

#### `messageAccueil` (Rich Text)
- **Type**: Rich Text (ou Text long)
- **Description**: Message d'accueil HTML affiché dans l'onglet "À propos"
- **Format**: HTML simple (balises supportées: `<p>`, `<strong>`, `<em>`, `<ul>`, `<ol>`, `<li>`, `<a>`, `<br>`)
- **Exemple**:
```html
<p>Bienvenue sur la page de notre team ! Nous sommes une équipe passionnée de traduction.</p>
<p>Rejoignez-nous sur <a href="https://discord.gg/xxx">Discord</a> pour échanger avec nous !</p>
```

---

### 5. Sections personnalisées

#### `sectionsCustom` (JSON)
- **Type**: JSON
- **Description**: Tableau de sections personnalisées affichées dans l'onglet "À propos"
- **Format**: Tableau d'objets JSON
- **Structure de base**:

```json
[
  {
    "id": "unique-id-123",
    "type": "text|gallery|cta|stats|timeline|recruitment",
    "title": "Titre de la section",
    "content": { /* Contenu spécifique au type */ }
  }
]
```

#### Types de sections supportés

##### **Type: `text`** - Section de texte enrichi
```json
{
  "id": "text-1",
  "type": "text",
  "title": "Notre histoire",
  "content": {
    "text": "<p>Nous avons été fondés en 2020...</p>"
  }
}
```

##### **Type: `gallery`** - Galerie d'images
```json
{
  "id": "gallery-1",
  "type": "gallery",
  "title": "Nos réalisations",
  "content": {
    "images": [
      {
        "url": "https://example.com/image1.jpg",
        "alt": "Description image 1"
      },
      {
        "url": "https://example.com/image2.jpg",
        "alt": "Description image 2"
      }
    ]
  }
}
```

##### **Type: `cta`** - Appel à l'action (Call-to-Action)
```json
{
  "id": "cta-1",
  "type": "cta",
  "title": "Rejoignez-nous !",
  "content": {
    "text": "Envie de participer à nos projets ?",
    "buttonText": "Postuler maintenant",
    "buttonLink": "https://discord.gg/xxx",
    "buttonStyle": "primary"
  }
}
```

##### **Type: `stats`** - Statistiques
```json
{
  "id": "stats-1",
  "type": "stats",
  "title": "Nos chiffres",
  "content": {
    "stats": [
      {
        "label": "Chapitres traduits",
        "value": "1200+"
      },
      {
        "label": "Années d'expérience",
        "value": "4"
      },
      {
        "label": "Membres actifs",
        "value": "12"
      }
    ]
  }
}
```

##### **Type: `timeline`** - Chronologie/Timeline
```json
{
  "id": "timeline-1",
  "type": "timeline",
  "title": "Notre parcours",
  "content": {
    "events": [
      {
        "date": "2020",
        "title": "Création de la team",
        "description": "Début de l'aventure avec 3 membres fondateurs"
      },
      {
        "date": "2022",
        "title": "100 chapitres traduits",
        "description": "Première grosse étape franchie"
      },
      {
        "date": "2024",
        "title": "Aujourd'hui",
        "description": "Une équipe de 15 membres et 10 projets actifs"
      }
    ]
  }
}
```

##### **Type: `recruitment`** - Recrutement
```json
{
  "id": "recruitment-1",
  "type": "recruitment",
  "title": "On recrute !",
  "content": {
    "positions": [
      {
        "role": "Traducteur",
        "description": "Nous recherchons des traducteurs anglais → français",
        "requirements": ["Niveau B2 minimum en anglais", "Disponibilité régulière"]
      },
      {
        "role": "Correcteur",
        "description": "Aide-nous à améliorer la qualité de nos traductions",
        "requirements": ["Excellente maîtrise du français", "Sens du détail"]
      }
    ],
    "contactInfo": "Contactez-nous sur Discord pour postuler"
  }
}
```

---

## Configuration dans Strapi Admin

### Étapes d'ajout des champs

1. **Accédez à Content-Type Builder**
   - Menu de gauche → Content-Type Builder
   - Sélectionnez la collection `Team`

2. **Ajoutez les champs un par un**
   - Cliquez sur "Add another field"
   - Sélectionnez le type approprié
   - Configurez le nom et les options

3. **Pour les champs de type JSON**
   - Type: JSON
   - Name: `sectionsCustom`
   - Advanced settings → Default value: `[]`

4. **Pour les champs Enumeration**
   - Type: Enumeration
   - Name: `bannierePosition`
   - Values: `top`, `center`, `bottom`
   - Default value: `center`

5. **Pour les champs Rich Text**
   - Type: Rich Text
   - Name: `messageAccueil`
   - Output: Markdown ou HTML selon préférence

6. **Sauvegardez et redémarrez Strapi**
   - Cliquez sur "Save"
   - Strapi redémarrera automatiquement

---

## Permissions API

Assurez-vous que les permissions suivantes sont configurées pour les rôles Public et Authenticated :

### Rôle: Public
- **Teams**:
  - `find` (GET /teams) ✅
  - `findOne` (GET /teams/:id) ✅
  - Accès en lecture aux champs :
    - Tous les champs de base
    - Tous les champs de personnalisation
    - Relations: `logo`, `banniere`, `owner`, `membres`, `oeuvres`

### Rôle: Authenticated
- **Teams**:
  - `find` ✅
  - `findOne` ✅
  - `update` ✅ (uniquement si `owner.id === user.id`)
  - `create` ✅

---

## Populate requis dans les requêtes API

Pour obtenir toutes les données de personnalisation, utilisez ces paramètres de populate :

```javascript
const teamResponse = await fetch(
  `/api/proxy/teams?` +
  `filters[slug][$eq]=${slug}&` +
  `populate=logo&` +
  `populate=banniere&` +
  `populate=owner&` +
  `populate=membres&` +
  `populate=oeuvres.couverture&` +
  `populate=oeuvres.genres`
);
```

---

## Valeurs par défaut recommandées

Lors de la création d'une nouvelle team, ces valeurs par défaut sont recommandées :

```json
{
  "themeCouleurPrimaire": "#6366f1",
  "themeCouleurSecondaire": "#8b5cf6",
  "themeCouleurAccent": "#ec4899",
  "themePolice": "",
  "bannierePosition": "center",
  "messageAccueil": "",
  "sectionsCustom": [],
  "twitter": "",
  "youtube": "",
  "instagram": "",
  "tiktok": ""
}
```

---

## Migration des données existantes

Si vous avez des teams existantes, exécutez un script de migration pour ajouter les valeurs par défaut :

```javascript
// Script exemple pour migration
const teams = await strapi.entityService.findMany('api::team.team', {
  filters: { themeCouleurPrimaire: null }
});

for (const team of teams) {
  await strapi.entityService.update('api::team.team', team.id, {
    data: {
      themeCouleurPrimaire: '#6366f1',
      themeCouleurSecondaire: '#8b5cf6',
      themeCouleurAccent: '#ec4899',
      bannierePosition: 'center',
      sectionsCustom: []
    }
  });
}
```

---

## Test et validation

### Checklist de validation

- [ ] Tous les champs sont créés dans Strapi
- [ ] Les permissions API sont configurées
- [ ] Les valeurs par défaut sont définies
- [ ] Le populate fonctionne correctement
- [ ] L'upload de bannière fonctionne
- [ ] Les couleurs s'affichent correctement
- [ ] Les sections custom se rendent sans erreur
- [ ] Les liens sociaux sont cliquables
- [ ] Le panneau de personnalisation sauvegarde les modifications

---

## Support et questions

Pour toute question sur l'implémentation :
1. Vérifiez que tous les champs sont bien créés dans Strapi
2. Vérifiez les permissions API (Public + Authenticated)
3. Vérifiez les logs Strapi pour les erreurs de validation
4. Testez les requêtes API directement avec Postman/Thunder Client

---

**Dernière mise à jour**: 2024
**Version**: 1.0
