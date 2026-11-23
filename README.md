# Suivi sport & paris

Application web de suivi quotidien des matchs (8 sports × 5 matchs par jour) et des paris (5 par jour, simples ou combinés), avec des bilans par mois et par sport et des graphiques.
Elle remplace le classeur `suivi_sport_annuel.xlsx` et en reproduit les formules à l'identique.

- **Next.js 15** (App Router) + **TypeScript**, interface **MUI (Material UI) 9**, graphiques **MUI X Charts**
- Page d'accueil : **tableau de bord** (indicateurs clés, bénéfice cumulé, jauges de réussite, bénéfice et matchs par mois, réussite par sport, derniers jours saisis)
- Module **Rentabilité** : ROI global, ROI des simples et des combinés, ROI par sport, bénéfices et pertes, cote moyenne, taux de réussite, mois par mois, avec points forts et points faibles
- Module **Capital** : taux de capitalisation, avec ce qui a été gagné, réinvesti, sécurisé et retiré, le capital actif et l'évolution du patrimoine
- Données stockées dans le **navigateur** (localStorage), avec export et import JSON
- **Synchronisation entre appareils** (optionnelle) avec un compte **Supabase** : voir §4
- Sans variable d'environnement, l'application reste 100 % locale : `npm install && npm run build` fonctionne tel quel
- Mobile d'abord, thème sombre par défaut (clair disponible), interface entièrement en français
- Identité visuelle : charte graphique BetTracker v1.0 (couleurs et jetons dans `src/theme/constantes.ts`, thème MUI dans `src/theme/theme.ts`, polices Exo 2 et Inter)
- **Application installable (PWA)**, utilisable **hors connexion** (voir §3)

---

## 1. Lancer l'application sur son ordinateur

Prérequis : [Node.js](https://nodejs.org) **18.18 ou plus récent** (la version LTS est recommandée).

```bash
npm install      # installe les dépendances (une seule fois)
npm run dev      # lance l'application en mode développement
```

Ouvrez ensuite **http://localhost:3000**.

> ⏱️ En mode développement, chaque page est compilée à sa **première** visite (environ 1 s) et React y tourne plus lentement. Pour un usage quotidien, lancez la version de production, où un changement de page prend moins de 100 ms : `npm run build` puis `npm start`.

Autres commandes :

| Commande | Rôle |
|---|---|
| `npm test` | lance les tests des calculs et de la synchronisation (Vitest) |
| `npm run lint` | vérifie le code |
| `npm run build` | construit la version de production |
| `npm start` | démarre la version de production (après `build`) |
| `npm run import-excel -- fichier.xlsx` | convertit le classeur Excel en JSON (voir §5) |
| `npm run icones` | régénère les icônes PNG de l'application installable |

---

## 2. Déployer sur Vercel (gratuit), pas à pas

1. **Créer un dépôt GitHub.** Sur [github.com/new](https://github.com/new), choisissez un nom (par ex. `suivi-sport`) puis cliquez sur *Create repository*, sans cocher README ni .gitignore.
2. **Envoyer le code**, depuis le dossier du projet :
   ```bash
   git init
   git add .
   git commit -m "Première version"
   git branch -M main
   git remote add origin https://github.com/VOTRE-COMPTE/suivi-sport.git
   git push -u origin main
   ```
3. **Importer sur Vercel.** Allez sur [vercel.com/new](https://vercel.com/new) et connectez-vous avec GitHub. Dans *Import Git Repository*, cliquez sur **Import** en face du dépôt.
4. **Déployer.** Vercel détecte Next.js tout seul, il n'y a **aucun réglage à changer**. Cliquez sur **Deploy**.
5. Au bout d'une minute environ, l'application est en ligne à une adresse du type `https://suivi-sport.vercel.app`.

Ensuite, chaque `git push` sur `main` redéploie l'application automatiquement.

---

## 3. Installer l'application (PWA) et l'utiliser hors connexion

L'application peut s'installer comme une application classique : icône sur l'écran d'accueil ou dans le menu Démarrer, ouverture en plein écran, sans barre d'adresse.

- **Android, ordinateur (Chrome, Edge)** : bouton **Réglages → Application → Installer l'application**, ou icône d'installation dans la barre d'adresse.
- **iPhone, iPad (Safari)** : bouton **Partager**, puis **Sur l'écran d'accueil**.

Après la première visite, **toutes les pages fonctionnent sans connexion**, et les saisies restent enregistrées sur l'appareil. Après un nouveau déploiement, un message « Nouvelle version disponible » propose de recharger.

> ℹ️ Le service worker, qui permet le mode hors connexion, n'est actif qu'en production (`npm run build` puis `npm start`, ou sur Vercel). En mode développement (`npm run dev`), il est volontairement désactivé et désinstallé.

Fichiers concernés :
- `src/app/manifest.ts` : nom, couleurs et icônes ;
- `src/app/sw.ts` : service worker, compilé par [Serwist](https://serwist.pages.dev) vers `public/sw.js` ;
- `src/components/Pwa.tsx` : enregistrement et message de mise à jour.

Les icônes de `public/icons/`, `src/app/apple-icon.png` et le logo de l'interface (`public/logo/`) se régénèrent avec `npm run icones` à partir de `assets/logo-bettracker.png`.

---

## 4. Où sont mes données ? (important)

Les données sont toujours enregistrées **dans le navigateur de l'appareil** (localStorage), automatiquement à chaque modification. L'application fonctionne donc aussi hors connexion.

**Sans compte** (ou sans Supabase configuré) :
- les données ne sont **pas** synchronisées entre le téléphone et l'ordinateur ;
- elles sont perdues si vous videz les données du site dans le navigateur.

**Avec un compte** (**Réglages → Compte et synchronisation → Se connecter**), les données sont aussi enregistrées en ligne et synchronisées sur tous les appareils connectés au même compte :
- à l'ouverture de l'application, au retour sur l'onglet, au retour du réseau et après chaque saisie ;
- hors ligne, les saisies attendent sur l'appareil (indicateur « Hors ligne ») et partent dès que la connexion revient ;
- si un même jour a été modifié sur deux appareils, la modification la plus récente est gardée ;
- à la première connexion, les jours déjà saisis sur l'appareil sont ajoutés au compte (en cas de conflit, la version en ligne est gardée, et une copie de l'ancien contenu reste dans le navigateur sous la clé `suivi-sport:v1:avant-sync`) ;
- la déconnexion efface les données de l'appareil ; elles restent sur le compte.

👉 Dans tous les cas, **Réglages → Exporter en JSON** reste une bonne copie de sécurité. Pour restaurer les données, utilisez **Réglages → Importer un JSON**.

### Activer la synchronisation (Supabase, gratuit)

1. **Créer la base.** Sur Vercel, ouvrez le projet → **Storage** (ou *Marketplace*) → **Supabase** → *Create*. L'intégration ajoute les variables `NEXT_PUBLIC_SUPABASE_URL` et `NEXT_PUBLIC_SUPABASE_ANON_KEY` (ou `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`) au projet Vercel.
   *Sans Vercel :* créez un projet sur [supabase.com](https://supabase.com) et recopiez ces deux valeurs (*Project Settings → API*) dans les variables d'environnement.
2. **Créer les tables.** Dans Supabase → **SQL Editor**, collez et exécutez le contenu de `supabase/migrations/0001_init.sql`.
3. **Comptes.** Dans Supabase → **Authentication → Sign In / Providers → Email** : laissez *Email* activé. Si vous êtes seul à utiliser l'application, vous pouvez désactiver *Confirm email* pour vous connecter dès la création du compte. Sinon, renseignez l'adresse de l'application dans **Authentication → URL Configuration → Site URL**, pour que le lien de confirmation y mène.
4. **Redéployer** sur Vercel pour que les variables soient prises en compte, puis créez votre compte depuis **Réglages → Se connecter**, sur chaque appareil.

En local, copiez les deux variables dans un fichier `.env.local` à la racine du projet (il n'est pas envoyé sur GitHub) :

```bash
NEXT_PUBLIC_SUPABASE_URL=https://xxxxxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
```

Fichiers concernés : `src/lib/sync.ts` (synchronisation), `src/lib/supabase.ts` (accès à Supabase), `src/hooks/useSession.tsx` (compte), `src/app/connexion/page.tsx`.

---

## 5. Importer les données du fichier Excel

Si des données sont déjà saisies dans `suivi_sport_annuel.xlsx` :

```bash
npm run import-excel -- "C:\chemin\vers\suivi_sport_annuel.xlsx" mes-donnees.json
```

Le script lit la date de début (`Bilan!B3`), les matchs (`Suivi!D:AQ`), les paris (`Paris!C:V`), le type du jour et la mise du combiné (`Paris!W:X`). Il produit `mes-donnees.json`, à importer ensuite dans **Réglages → Importer un JSON**.

---

## 6. Règles de calcul (identiques au classeur Excel)

| Élément | Règle |
|---|---|
| Période | début → **fin = début + 1 an − 1 jour** (`DATE(année+1; mois; jour) − 1`), soit 365 ou 366 jours ; le bilan couvre 13 mois à partir du mois de début |
| Gagnés / perdus du jour | nombre de **G** / **P** parmi les 40 cases sport |
| % réussite | gagnés ÷ (gagnés + perdus) ; « – » s'il n'y a aucun match |
| Pari simple | gagné : mise × (cote − 1) · perdu : − mise · sans résultat : 0 |
| Simple : total misé / bénéfice | somme des mises / somme des bénéfices |
| Cote combinée | produit des cotes renseignées |
| Combiné | au moins une sélection **P** : − mise combiné · toutes les sélections cotées **G** : mise combiné × (cote combinée − 1) · sinon 0 |
| Combiné : total misé, paris G/P | total misé = mise combiné ; le combiné compte pour **un seul** pari (1 ou 0) |
| Type du jour vide | traité comme « Simple » (comme dans Excel) |

### Rentabilité (ROI)

| Élément | Règle |
|---|---|
| Pari pris en compte | uniquement les paris **tranchés** (G ou P) ; la mise d'un pari sans résultat est affichée à part (« en cours ») |
| Total des mises | somme des mises des paris tranchés (un combiné : sa mise) |
| Gains encaissés | mise + bénéfice de chaque pari tranché (0 pour un pari perdu) |
| Bénéfice net | gains encaissés − total des mises |
| ROI | bénéfice net ÷ total des mises × 100 |
| Cote moyenne | moyenne des cotes renseignées (cote combinée pour un combiné) |
| Taux de réussite | paris gagnés ÷ paris tranchés (un combiné compte pour un pari) |
| Sport d'un pari | choisi dans la saisie (sports suivis + Rugby + Autre) ; un combiné prend le sport commun à ses sélections, sinon « Multi-sports » |
| Points forts / faibles | segments sport × type (simple / combiné) d'au moins 3 paris : meilleur ROI bénéficiaire, et plus forte perte avec le ROI global qu'on aurait sans eux |

### Capital

Les mouvements (dépôt, retrait, mise en sécurité, réinjection) sont saisis dans **Capital** et enregistrés avec le jour concerné (ils sont donc synchronisés comme les autres saisies).

| Élément | Règle |
|---|---|
| Gagné | bénéfice net des paris (comme dans le bilan) |
| Sécurisé | mises en sécurité − réinjections |
| Retiré | somme des retraits |
| Capital actif | dépôts + gagné − retiré − sécurisé |
| Patrimoine | capital actif + sécurisé |
| Capitalisé | min(gagné ; sécurisé + retiré) : part des gains mise à l'abri |
| Réinvesti | gagné − capitalisé : part des gains laissée en jeu |
| Taux de capitalisation | capitalisé ÷ gagné (« – » sans gain) |
| Progression | (patrimoine + retiré − dépôts) ÷ dépôts |

Cas particulier hérité d'Excel : une cellule vide vaut 0 dans un calcul. Un pari simple **gagné sans cote** rapporte donc −mise. L'application affiche alors un avertissement « Cote manquante ».

Différence volontaire avec Excel : changer la date de début **ne décale pas** les saisies, qui restent attachées à leur date. Dans Excel, elles étaient attachées à la ligne.

---

## 7. Structure du projet

```
src/
├─ app/                   pages (App Router)
│  ├─ page.tsx            Tableau de bord (page d'accueil)
│  ├─ manifest.ts         manifeste de l'application installable (PWA)
│  ├─ sw.ts               service worker (hors connexion), compilé vers public/sw.js
│  ├─ saisie/             Saisie du jour (?date=AAAA-MM-JJ)
│  ├─ historique/         Historique jour par jour, filtre par mois
│  ├─ bilan/              Synthèse, bilan par mois et par sport
│  ├─ rentabilite/        ROI global, simples / combinés, par sport, par mois
│  ├─ capital/            Taux de capitalisation, mouvements de capital, patrimoine
│  ├─ sports/             Matrices sport × mois (gagnés, perdus, %) en onglets
│  └─ reglages/           Date de début, thème, export/import JSON, réinitialisation
├─ components/
│  ├─ Coque.tsx           mise en page : menu latéral (bureau), onglets en bas (mobile)
│  ├─ Pwa.tsx             enregistrement du service worker, message « Nouvelle version »
│  ├─ tableau-de-bord/    tableau de bord et graphiques MUI X Charts
│  ├─ saisie/ bilan/      composants des pages
│  ├─ rentabilite/ capital/  pages et graphiques des modules Rentabilité et Capital
│  ├─ Indicateurs.tsx     tuile d'indicateur, barre de progression, lien de section
│  └─ ui.tsx              briques communes (sections, montants, champ numérique…)
├─ theme/                 thème MUI clair/sombre (variables CSS), couleurs des graphiques
├─ hooks/
│  ├─ useDonnees.tsx      état global + sauvegarde automatique
│  └─ useInstallation.ts  état d'installation de la PWA (bouton « Installer »)
└─ lib/
   ├─ calculs.ts          toutes les formules (fonctions pures, testées)
   ├─ tableauDeBord.ts    indicateurs du tableau de bord (testés)
   ├─ rentabilite.ts      ROI par type, par sport et par mois (testés)
   ├─ capital.ts          taux de capitalisation et patrimoine (testés)
   ├─ dates.ts            dates ISO en UTC (période, mois, jours actifs)
   ├─ format.ts           formats français (1 234,50 €, Mer 18 nov. 2026, 66,7 %)
   ├─ storage.ts          couche d'accès aux données (localStorage, import/export)
   ├─ types.ts            modèle de données
   └─ __tests__/          tests Vitest
public/icons/             icônes de l'application installable
scripts/import-excel.mjs  conversion Excel → JSON
scripts/generer-icones.mjs  génération des icônes PNG
```

### Passer à un stockage en ligne (Vercel KV, Supabase…)

Tout l'accès aux données passe par `src/lib/storage.ts` :

```ts
export interface StorageAdapter {
  charger(): Promise<AppData>;
  sauvegarder(data: AppData): Promise<void>;
  effacer(): Promise<void>;
}
```

Écrivez un nouvel adaptateur, par exemple un `supabaseAdapter` qui appelle une route API `/api/donnees`, puis renvoyez-le depuis `creerStockage()`. Le reste de l'application n'a pas à changer. Utilisez `normaliserDonnees()` pour valider ce qui revient du serveur.
