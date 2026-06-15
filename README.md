# GWBASIC Interpreter

Un interpréteur complet du langage GWBASIC implémenté en JavaScript avec une interface web rétro-authentique émulant les terminaux CRT des années 1980.

## Caractéristiques

### Architecture
- **Lexer complet** : Tokenisation de tous les éléments du langage GWBASIC
- **Parser récursif** : Construction d'un AST (Abstract Syntax Tree) valide
- **Moteur d'exécution** : Interprétation directe du programme avec gestion d'état complète
- **Interface rétro** : Terminal vert phosphore sur fond noir avec scanlines animées

### Fonctions supportées (90+)

#### Fonctions mathématiques
- `ABS`, `SIN`, `COS`, `TAN`, `ATN`, `EXP`, `LOG`, `SQR`
- `INT`, `FIX`, `SGN`, `RND`, `CINT`, `CDBL`, `CSNG`
- `CEIL`, `FLOOR`

#### Fonctions statistiques
- `MIN`, `MAX` — valeurs extrêmes (variadiques)
- `MOYAR` — moyenne arithmétique (variadique)
- `MOYPO` — moyenne pondérée (variadique, paires valeur/poids)
- `SUM` — somme des valeurs (variadique)
- `PROD` — produit des valeurs (variadique)
- `MEDIAN` — médiane (variadique)
- `STD` — écart-type échantillon (variadique, 2+ valeurs)

#### Fonctions d'arrondi
- `ARRPROCH(value, multiple [, roundUp])` — arrondi au multiple le plus proche
  - `roundUp` omis ou non-zéro : arrondi supérieur (ceil)
  - `roundUp = 0` : arrondi inférieur (floor)

#### Fonctions de chaînes
- `LEN`, `ASC`, `CHR$`, `STR$`, `VAL`
- `LEFT$`, `RIGHT$`, `MID$`, `INSTR`
- `UPPER$`, `LOWER$`, `TRIM$`, `LTRIM$`, `RTRIM$`
- `SPACE$`, `STRING$`, `HEX$`, `OCT$`
- `REPEAT$`, `REVERSE$`

#### Fonctions de conversion
- `MKD$`, `MKI$`, `MKS$` (conversion en chaînes binaires)
- `CVD`, `CVI`, `CVS` (conversion depuis chaînes binaires)

#### Fonctions système
- `TIMER`, `DATE$`, `TIME$`
- `RANDOMIZE`, `RND`
- `ENVIRON$`, `ENVIRON`

#### Fonctions I/O
- `EOF`, `LOC`, `LPOS`, `CSRLIN`, `POS`
- `POINT`, `SCREEN`, `INKEY$`, `INPUT$`

### Instructions supportées

#### Contrôle de flux
- `IF...THEN...ELSE`
- `FOR...TO...STEP...NEXT`
- `WHILE...WEND`
- `DO...LOOP WHILE/UNTIL`
- `GOSUB...RETURN`
- `GOTO`
- `ON...GOTO`, `ON...GOSUB`
- `SELECT CASE...CASE...END SELECT`
- `EXIT FOR`, `EXIT DO`, `EXIT WHILE`

#### Entrée/Sortie
- `PRINT` (avec `;` et `,` pour formatage)
- `INPUT` (avec `;` pour pas de "?" et `,` pour ajouter "?")
- `LINE INPUT` (lecture complète sans parsing des virgules)
- `WRITE` (avec formatage GWBASIC)
- `LOCATE` (positionnement du curseur row, col)
- `COLOR` (changement de couleur, 16 couleurs CGA)
- `CLS` (effacement de l'écran)

#### Gestion des données
- `DIM` (déclaration de tableaux)
- `ERASE` (effacement de tableaux)
- `DATA` (données statiques)
- `READ` (lecture de données)
- `RESTORE` (réinitialisation du pointeur de données)

#### Autres instructions
- `LET` (assignation)
- `REM` ou `'` (commentaires)
- `END` (fin du programme)
- `SWAP` (échange de variables)
- `DEF FN` (fonctions utilisateur)
- `RANDOMIZE` (initialisation du générateur aléatoire)

### Opérateurs
- **Arithmétiques** : `+`, `-`, `*`, `/`, `^`, `MOD`
- **Comparaison** : `=`, `<>`, `<`, `>`, `<=`, `>=`
- **Logiques** : `AND`, `OR`, `NOT`, `XOR`

### Types de données
- **Nombres** : Nombres à virgule flottante (64-bit)
- **Chaînes** : Chaînes de caractères (suffixe `$`)
- **Tableaux** : Tableaux multi-dimensionnels (déclarés avec `DIM`)

## Interface utilisateur

### Disposition
- **Éditeur** (gauche) : Zone de saisie du code avec numérotation des lignes
- **Terminal** (droite) : Affichage de la sortie avec vert phosphore authentique
- **Barre d'outils** : Boutons RUN, CLEAR, HELP

### Fonctionnalités
- **Coloration syntaxique** : Mise en évidence des mots-clés et des fonctions
- **Exemples intégrés** : Programmes d'exemple pour débuter
- **Aide interactive** : Référence complète du langage (200+ lignes de documentation)
- **Gestion des entrées** : Support complet de `INPUT`, `LINE INPUT`, `LOCATE`, `COLOR`

## Exemples de programmes

### Boucle FOR
```basic
10 FOR I = 1 TO 10
20 PRINT I
30 NEXT I
```

### Opérations mathématiques
```basic
10 X = 15
20 Y = 4
30 PRINT "X + Y = "; X + Y
40 PRINT "X * Y = "; X * Y
50 PRINT "X ^ Y = "; X ^ Y
```

### Conditions IF/ELSE
```basic
10 FOR I = 1 TO 5
20 IF I MOD 2 = 0 THEN PRINT I; " is even"
30 IF I MOD 2 = 1 THEN PRINT I; " is odd"
40 NEXT I
```

### Boucle WHILE
```basic
10 I = 1
20 WHILE I <= 5
30 PRINT "I = "; I
40 I = I + 1
50 WEND
```

### Fonctions de chaînes
```basic
10 S = "HELLO WORLD"
20 PRINT "Length: "; LEN(S)
30 PRINT "Left 5: "; LEFT$(S, 5)
40 PRINT "Right 5: "; RIGHT$(S, 5)
50 PRINT "Position of WORLD: "; INSTR(S, "WORLD")
```

### Fonctions statistiques
```basic
10 PRINT "Sum: "; SUM(1, 2, 3, 4, 5)
20 PRINT "Average: "; MOYAR(10, 20, 30)
30 PRINT "Min: "; MIN(5, 3, 8, 1)
40 PRINT "Max: "; MAX(5, 3, 8, 1)
50 PRINT "Median: "; MEDIAN(3, 7, 5)
60 PRINT "Std Dev: "; STD(2, 4, 4, 4, 5, 5, 7, 9)
```

### Arrondi personnalisé
```basic
10 PRINT "CEIL(1.2) = "; CEIL(1.2)
20 PRINT "FLOOR(1.8) = "; FLOOR(1.8)
30 PRINT "ARRPROCH(17, 5) = "; ARRPROCH(17, 5)
40 PRINT "ARRPROCH(17, 5, 0) = "; ARRPROCH(17, 5, 0)
```

### Tableaux
```basic
10 DIM A(5)
20 FOR I = 1 TO 5
30 A(I) = I * 10
40 NEXT I
50 FOR I = 1 TO 5
60 PRINT "A("; I; ") = "; A(I)
70 NEXT I
```

### Données et lecture
```basic
10 READ A, B, C
20 PRINT "Sum: "; A + B + C
30 DATA 10, 20, 30
```

## Limitations et notes

### Limitations intentionnelles
- **Pas de graphiques** : Les instructions `CIRCLE`, `LINE`, `PSET`, etc. ne sont pas implémentées (contexte web)
- **Pas de son** : Les instructions `SOUND` et `PLAY` ne sont pas implémentées
- **Pas d'I/O fichier** : Les opérations de fichier (`OPEN`, `CLOSE`, `WRITE#`, etc.) ne sont pas implémentées
- **Pas de fenêtres graphiques** : Les instructions `SCREEN`, `WINDOW`, `VIEW` ne sont pas implémentées

### Limitations techniques
- **Pas de vrai seeding RND** : JavaScript ne permet pas de vraiment seeder `Math.random()`
- **Pas de vraie sérialisation binaire** : Les fonctions `MKD$`, `CVD`, etc. utilisent des approximations

### Différences avec GWBASIC original
- Les erreurs sont affichées au lieu de générer des codes d'erreur numérotés
- Pas de mode interactif (uniquement mode programme)
- Pas de débogage pas à pas
- Pas de sauvegarde/chargement de programmes (utiliser copier-coller)
- Fonctions personnalisées supplémentaires (MIN, MAX, MOYAR, MOYPO, SUM, PROD, MEDIAN, STD, ARRPROCH, CEIL, FLOOR)

## Architecture technique

### Structure du code
```
client/src/
├── lib/
│   ├── lexer.ts                 # Tokeniseur
│   ├── parser.ts                # Analyseur syntaxique → AST
│   ├── interpreter.ts           # Moteur d'exécution
│   ├── types.ts                 # Types TypeScript
│   ├── help.ts                  # Documentation interactive
│   ├── examples.ts              # Programmes d'exemple
│   └── __tests__/               # Tests unitaires (200+ tests)
│       ├── interpreter.test.ts
│       ├── lexer.test.ts
│       └── parser.test.ts
├── components/
│   ├── Editor.tsx               # Éditeur de code
│   ├── Terminal.tsx             # Terminal rétro
│   └── HelpPanel.tsx            # Panneau d'aide
└── pages/
    └── Home.tsx                 # Page principale
shared/
├── gwbasic-constants.ts         # Mots-clés et fonctions
└── const.ts                     # Constantes partagées
```

### Flux d'exécution
1. **Lexical Analysis** : Le code source est tokenisé par le `Lexer`
2. **Parsing** : Les tokens sont analysés par le `Parser` pour créer un AST
3. **Execution** : L'AST est exécuté par l'`Interpreter`
4. **Output** : Les résultats sont affichés dans le terminal

## Installation

### Prérequis
- [Node.js](https://nodejs.org/) (v18 ou supérieur)

### Installation des dépendances
```bash
npm install
```

### Mode développement
```bash
npm run dev
```
L'application sera accessible sur `http://localhost:5173` (ou l'adresse affichée dans le terminal).

### Build de production
```bash
npm run build
```

### Lancer en production
```bash
npm start
```

### Tests
```bash
npm test
```

### Vérification TypeScript
```bash
npm run check
```

### Formatage du code
```bash
npm run format
```

## Utilisation

### Démarrage
1. Ouvrir l'application dans un navigateur web
2. Taper un programme BASIC dans l'éditeur
3. Cliquer sur "▶ RUN" pour exécuter
4. Interagir avec le programme via le terminal (lors de `INPUT`)
5. Voir les résultats dans le terminal

### Conseils
- Utiliser les numéros de ligne 10, 20, 30... pour faciliter les modifications
- Consulter l'aide (bouton "?") pour la référence des fonctions
- Charger les exemples pour apprendre la syntaxe
- Utiliser `REM` ou `'` pour commenter le code

## Spécifications de design

### Esthétique rétro
- **Couleur primaire** : Vert phosphore (#00FF00)
- **Couleur secondaire** : Ambre (#FFAA00)
- **Fond** : Noir pur (#000000)
- **Police** : IBM Plex Mono (monospace authentique)
- **Effets** : Scanlines animées, curseur clignotant

### Principes de conception
- Authenticité visuelle des années 1980
- Fonctionnalité moderne avec affordances claires
- Accessibilité maintenue malgré l'esthétique rétro
- Performance optimale pour l'exécution de programmes

## Compatibilité

### Navigateurs supportés
- Chrome/Chromium (dernière version)
- Firefox (dernière version)
- Safari (dernière version)
- Edge (dernière version)

### Résolution minimale
- 1024x768 pixels recommandé
- Responsive sur mobile (layout adaptatif)

## Crédits

Interpréteur GWBASIC créé en 2026 comme projet éducatif et nostalgique.

Inspiré par :
- L'interpréteur GWBASIC original (1983)
- Les conventions de programmation BASIC classique
- L'esthétique des terminaux CRT vintage

## Licence

Ce projet est sous licence [MIT](https://opensource.org/licenses/MIT).

---

**Bon codage en BASIC !** 🖥️✨