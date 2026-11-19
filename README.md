# Suivi sport & paris

Application web de suivi quotidien des matchs (8 sports × 5 matchs par jour) et des paris (5 par jour, simples ou combinés), avec des bilans par mois et par sport et des graphiques.
Elle remplace le classeur `suivi_sport_annuel.xlsx` et en reproduit les formules à l'identique.

- **Next.js 15** (App Router) + **TypeScript**, interface **MUI (Material UI) 9**, graphiques **MUI X Charts**
- Page d'accueil : **tableau de bord** (indicateurs clés, bénéfice cumulé, jauges de réussite, bénéfice et matchs par mois, réussite par sport, derniers jours saisis)
- Données stockées dans le **navigateur** (localStorage), avec export et import JSON
- Aucune variable d'environnement, aucune base de données : `npm install && npm run build` fonctionne tel quel
- Mobile d'abord, thème clair/sombre, interface entièrement en français

---

## 1. Lancer l'application sur son ordinateur

Prérequis : [Node.js](https://nodejs.org) **18.18 ou plus récent** (la version LTS est recommandée).

```bash
npm install      # installe les dépendances (une seule fois)
npm run dev      # lance l'application en mode développement
```

Ouvrez ensuite **http://localhost:3000**.

Autres commandes :

| Commande | Rôle |
|---|---|
| `npm test` | lance les tests des calculs (Vitest) |
| `npm run lint` | vérifie le code |
| `npm run build` | construit la version de production |
| `npm start` | démarre la version de production (après `build`) |
| `npm run import-excel -- fichier.xlsx` | convertit le classeur Excel en JSON (voir §4) |

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

> 💡 Sur un téléphone, ouvrez l'adresse puis choisissez « Ajouter à l'écran d'accueil » pour l'utiliser comme une application.

---

## 3. Où sont mes données ? (important)

Les données sont enregistrées **dans le navigateur de l'appareil** (localStorage), automatiquement à chaque modification.

- Elles ne sont **pas** synchronisées entre le téléphone et l'ordinateur.
- Elles sont perdues si vous videz les données du site dans le navigateur.

👉 Pensez à faire régulièrement **Réglages → Exporter en JSON**. Pour restaurer les données, ou les transférer sur un autre appareil, utilisez **Réglages → Importer un JSON**.

---

## 4. Importer les données du fichier Excel

Si des données sont déjà saisies dans `suivi_sport_annuel.xlsx` :

```bash
npm run import-excel -- "C:\chemin\vers\suivi_sport_annuel.xlsx" mes-donnees.json
```

Le script lit la date de début (`Bilan!B3`), les matchs (`Suivi!D:AQ`), les paris (`Paris!C:V`), le type du jour et la mise du combiné (`Paris!W:X`). Il produit `mes-donnees.json`, à importer ensuite dans **Réglages → Importer un JSON**.

---

## 5. Règles de calcul (identiques au classeur Excel)

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

Cas particulier hérité d'Excel : une cellule vide vaut 0 dans un calcul. Un pari simple **gagné sans cote** rapporte donc −mise. L'application affiche alors un avertissement « Cote manquante ».

Différence volontaire avec Excel : changer la date de début **ne décale pas** les saisies, qui restent attachées à leur date. Dans Excel, elles étaient attachées à la ligne.

---

## 6. Structure du projet

```
src/
├─ app/                   pages (App Router)
│  ├─ page.tsx            Tableau de bord (page d'accueil)
│  ├─ saisie/             Saisie du jour (?date=AAAA-MM-JJ)
│  ├─ historique/         Historique jour par jour, filtre par mois
│  ├─ bilan/              Synthèse, bilan par mois et par sport
│  ├─ sports/             Matrices sport × mois (gagnés, perdus, %) en onglets
│  └─ reglages/           Date de début, thème, export/import JSON, réinitialisation
├─ components/
│  ├─ Coque.tsx           mise en page : menu latéral (bureau), onglets en bas (mobile)
│  ├─ tableau-de-bord/    tableau de bord et graphiques MUI X Charts
│  ├─ saisie/ bilan/      composants des pages
│  └─ ui.tsx              briques communes (sections, montants, champ numérique…)
├─ theme/                 thème MUI clair/sombre (variables CSS), couleurs des graphiques
├─ hooks/useDonnees.tsx   état global + sauvegarde automatique
└─ lib/
   ├─ calculs.ts          toutes les formules (fonctions pures, testées)
   ├─ tableauDeBord.ts    indicateurs du tableau de bord (testés)
   ├─ dates.ts            dates ISO en UTC (période, mois, jours actifs)
   ├─ format.ts           formats français (1 234,50 €, Mer 18 nov. 2026, 66,7 %)
   ├─ storage.ts          couche d'accès aux données (localStorage, import/export)
   ├─ types.ts            modèle de données
   └─ __tests__/          tests Vitest
scripts/import-excel.mjs  conversion Excel → JSON
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
