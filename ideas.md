# Interpréteur GWBASIC - Brainstorming Design

## Trois approches stylistiques

### 1. **Rétro Terminal Authentique** 
Émulation fidèle du terminal DOS/GWBASIC original avec interface CRT, phosphore vert, et typographie monospace classique. Très nostalgique.
**Probabilité: 0.03**

### 2. **Cyberpunk Futuriste**
Écran de hacker moderne avec néons violets/cyans, grille holographique, et effets de scan. Très tendance gaming.
**Probabilité: 0.05**

### 3. **Minimalisme Éducatif Moderne**
Interface épurée avec deux panneaux (éditeur + sortie), typographie claire, thème clair/sombre, focus sur la lisibilité et l'apprentissage.
**Probabilité: 0.02**

---

## Approche Sélectionnée: **Rétro Terminal Authentique**

Cette approche capture l'essence historique de GWBASIC tout en restant accessible et fonctionnelle pour les utilisateurs modernes.

### Design Movement
**Retro-Computing Aesthetic** - Inspiré des interfaces des années 1980-1990, avec une touche de nostalgie numérique. Référence: interfaces DOS, écrans CRT, et la culture du computing rétro.

### Core Principles
1. **Authenticité Visuelle** - Reproduire l'apparence d'un écran CRT avec phosphore vert/ambre, scanlines, et typographie monospace
2. **Fonctionnalité Historique** - Respecter les conventions d'interface de GWBASIC (prompt `>`, structure de commandes)
3. **Accessibilité Moderne** - Ajouter des affordances contemporaines (boutons clairs, feedback visuel) sans perdre l'authenticité
4. **Contraste et Lisibilité** - Assurer une excellente lisibilité tout en maintenant l'esthétique rétro

### Color Philosophy
- **Couleur Primaire: Vert Phosphore** (`#00FF00` ou `#00DD00`) - Évoque les anciens moniteurs CRT
- **Couleur Secondaire: Ambre** (`#FFAA00`) - Alternative classique des terminaux DOS
- **Fond: Noir Profond** (`#000000` ou `#0A0A0A`) - Écran éteint/terminal classique
- **Accents: Blanc Pur** (`#FFFFFF`) - Pour les éléments critiques
- **Texte Inactif: Vert Foncé** (`#006600`) - Contraste réduit pour les éléments secondaires

**Intention Émotionnelle**: Nostalgie, authenticité, sentiment de "vraie programmation", immersion dans l'ère du computing classique.

### Layout Paradigm
- **Structure Asymétrique**: Éditeur sur la gauche (70%), terminal de sortie sur la droite (30%)
- **Disposition Verticale**: Barre de titre rétro en haut avec nom du programme
- **Grille Monospace**: Tous les textes alignés sur une grille de caractères (80 colonnes classique)
- **Zones Délimitées**: Cadres de style "box-drawing" pour délimiter les sections (╔═╗║╚╝)

### Signature Elements
1. **Scanlines Animées** - Lignes horizontales subtiles qui balaient l'écran pour simuler un CRT
2. **Curseur Clignotant** - Curseur monospace classique qui clignote dans le terminal
3. **Effet de Phosphore** - Légère lueur autour du texte vert pour simuler la phosphorescence
4. **Bruit de Grain** - Texture subtile pour évoquer l'âge du matériel

### Interaction Philosophy
- **Clavier-Centric** - Priorité aux raccourcis clavier (F1 aide, F2 édition, etc.)
- **Feedback Immédiat** - Sons subtils (bip) pour les actions (optionnel)
- **Transitions Discrètes** - Pas d'animations fluides modernes, mais des changements nets et rapides
- **Respect des Conventions DOS** - Commandes et structures familières aux utilisateurs rétro

### Animation
- **Scanlines**: Animation continue, très subtile, 30-60fps, opacité 5-10%
- **Curseur**: Clignotement à ~1Hz (500ms on/off)
- **Texte Entrant**: Apparition instantanée ou très rapide (pas de fade-in)
- **Transitions**: Changements instantanés ou très rapides (<100ms)
- **Pas d'Animation**: Éviter les transitions fluides modernes, les bounces, ou les effets "web 2.0"

### Typography System
- **Police Principale: IBM Plex Mono** - Monospace authentique, lisible, avec caractères distinctifs
- **Hiérarchie**:
  - **Titre**: IBM Plex Mono Bold, 18-20px, vert phosphore
  - **Texte Normal**: IBM Plex Mono Regular, 14px, vert phosphore
  - **Texte Secondaire**: IBM Plex Mono Regular, 14px, vert foncé
  - **Erreurs**: IBM Plex Mono Bold, 14px, rouge ou ambre
- **Espacement**: Monospace strict (chaque caractère = 1 unité), pas de kerning moderne

### Brand Essence
**Positioning**: Un interpréteur GWBASIC fonctionnel qui capture l'essence de la programmation rétro, pour les nostalgiques et les étudiants en histoire de l'informatique.

**Personality Adjectives**: 
1. Authentique
2. Nostalgique
3. Fonctionnel

### Brand Voice
- **Ton**: Direct, technique, sans fioritures, comme un manuel d'époque
- **Headlines**: "GWBASIC Interpreter - Ready", "Program Loaded", "Syntax Error"
- **CTAs**: "RUN", "LOAD", "SAVE", "CLEAR" (commandes DOS classiques)
- **Microcopy**: "Type HELP for commands", "Press F1 for help"
- **Exemples**:
  - ❌ "Welcome to our GWBASIC experience" 
  - ✅ "GWBASIC Interpreter v1.0"
  - ❌ "Get started today"
  - ✅ "Type your program or RUN to execute"

### Wordmark & Logo
- **Logo**: Icône stylisée d'un écran CRT avec les lettres "GB" en vert phosphore, cadre noir
- **Typographie**: Pas de texte dans le logo, juste le symbole CRT
- **Utilisation**: Petit (favicon 32x32), moyen (en-tête 64x64), grand (hero 256x256)

### Signature Brand Color
**Vert Phosphore: `#00FF00`** - Unmistakably GWBASIC, instantly recognizable as retro computing.

---

## Directives d'Implémentation

1. **CSS Variables**: Définir toutes les couleurs en variables CSS pour faciliter les variations
2. **Typographie**: Importer IBM Plex Mono depuis Google Fonts
3. **Texture**: Ajouter un SVG de scanlines en background-image
4. **Responsive**: Adapter le layout sur mobile (éditeur en haut, terminal en bas)
5. **Accessibilité**: Maintenir un contraste suffisant même avec le style rétro
